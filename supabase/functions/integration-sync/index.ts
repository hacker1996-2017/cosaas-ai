import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { integrationId, organizationId, action } = await req.json()

    if (!integrationId || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'integrationId and organizationId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify org kill switch
    const { data: org } = await adminClient
      .from('organizations')
      .select('kill_switch_active, name')
      .eq('id', organizationId)
      .single()

    if (org?.kill_switch_active) {
      return new Response(
        JSON.stringify({ error: 'Kill switch active — all integrations paused' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch integration
    const { data: integration, error: fetchErr } = await adminClient
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('organization_id', organizationId)
      .single()

    if (fetchErr || !integration) {
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Health check / test mode
    if (action === 'test') {
      const healthy = await testIntegrationHealth(integration)

      await adminClient
        .from('integrations')
        .update({
          status: healthy ? 'connected' : 'error',
          error_message: healthy ? null : 'Health check failed',
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', integrationId)

      // Audit log
      await logAudit(adminClient, organizationId, 'integration_health_check', {
        integration_id: integrationId,
        service_name: integration.service_name,
        healthy,
      })

      return new Response(
        JSON.stringify({ healthy, service: integration.service_name }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sync mode
    const syncStart = Date.now()

    await adminClient
      .from('integrations')
      .update({ status: 'syncing' as any })
      .eq('id', integrationId)

    try {
      const result = await performSync(integration)
      const durationMs = Date.now() - syncStart

      await adminClient
        .from('integrations')
        .update({
          status: 'connected',
          last_sync_at: new Date().toISOString(),
          error_message: null,
          sync_errors: 0,
        })
        .eq('id', integrationId)

      // Timeline event
      await adminClient
        .from('timeline_events')
        .insert({
          organization_id: organizationId,
          event_type: 'integration',
          title: `${integration.service_name} synced`,
          description: `${integration.service_type} sync completed in ${durationMs}ms. ${result.recordsProcessed || 0} records processed.`,
          icon: '🔄',
          color: 'green',
        })

      // Audit
      await logAudit(adminClient, organizationId, 'integration_sync', {
        integration_id: integrationId,
        service_name: integration.service_name,
        duration_ms: durationMs,
        records_processed: result.recordsProcessed || 0,
        status: 'success',
      })

      return new Response(
        JSON.stringify({
          success: true,
          service: integration.service_name,
          durationMs,
          recordsProcessed: result.recordsProcessed || 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (syncErr) {
      const errorMessage = (syncErr as Error).message

      // Increment sync errors
      await adminClient
        .from('integrations')
        .update({
          status: 'error',
          error_message: errorMessage,
          sync_errors: (integration.sync_errors || 0) + 1,
        })
        .eq('id', integrationId)

      // If critical error count threshold, create notification
      if ((integration.sync_errors || 0) + 1 >= 3) {
        // Fetch org members for notification
        const { data: members } = await adminClient
          .from('profiles')
          .select('id')
          .eq('organization_id', organizationId)
          .limit(5)

        if (members) {
          const notifications = members.map(m => ({
            organization_id: organizationId,
            user_id: m.id,
            title: `Integration Error: ${integration.service_name}`,
            body: `${integration.service_name} has failed ${(integration.sync_errors || 0) + 1} times. Last error: ${errorMessage}`,
            category: 'agent_alert' as const,
            priority: 'high' as const,
            source_type: 'integration',
            source_id: integrationId,
            icon: '🔴',
          }))

          await adminClient.from('notifications').insert(notifications)
        }
      }

      // Timeline
      await adminClient
        .from('timeline_events')
        .insert({
          organization_id: organizationId,
          event_type: 'integration',
          title: `${integration.service_name} sync failed`,
          description: errorMessage,
          icon: '❌',
          color: 'red',
        })

      await logAudit(adminClient, organizationId, 'integration_sync_failed', {
        integration_id: integrationId,
        service_name: integration.service_name,
        error: errorMessage,
      })

      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Integration sync error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Simulate health check based on service type
async function testIntegrationHealth(integration: any): Promise<boolean> {
  // In production, this would make actual API calls to verify credentials
  const serviceChecks: Record<string, () => Promise<boolean>> = {
    crm: async () => {
      // e.g. HubSpot API ping
      return true
    },
    email: async () => {
      // e.g. verify SMTP/API connectivity
      return true
    },
    payment: async () => {
      // e.g. Stripe API health
      return true
    },
    communication: async () => {
      // e.g. Twilio/Slack API ping
      return true
    },
    accounting: async () => {
      return true
    },
    webhook: async () => {
      if (integration.webhook_url) {
        try {
          const res = await fetch(integration.webhook_url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
          })
          return res.ok
        } catch {
          return false
        }
      }
      return true
    },
  }

  const checker = serviceChecks[integration.service_type] || (async () => true)
  return await checker()
}

// Simulate sync operation
async function performSync(integration: any): Promise<{ recordsProcessed: number }> {
  // In production, this would:
  // 1. Pull data from external API using stored credentials
  // 2. Transform & upsert into local tables
  // 3. Push outbound changes
  // 4. Return record counts
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))

  return {
    recordsProcessed: Math.floor(Math.random() * 50) + 5,
  }
}

async function logAudit(client: any, orgId: string, action: string, details: Record<string, unknown>) {
  try {
    const { data: seqData } = await client.rpc('next_audit_sequence', { p_org_id: orgId })
    const { data: prevHash } = await client.rpc('latest_audit_hash', { p_org_id: orgId })
    const timestamp = new Date().toISOString()
    const { data: hash } = await client.rpc('generate_audit_hash', {
      p_org_id: orgId,
      p_event_type: 'integration',
      p_action: action,
      p_details: details,
      p_previous_hash: prevHash || 'GENESIS',
      p_timestamp: timestamp,
    })

    await client.from('audit_log').insert({
      organization_id: orgId,
      event_type: 'integration',
      action,
      details,
      actor_type: 'system',
      resource_type: 'integration',
      resource_id: details.integration_id || null,
      sequence_number: seqData || 1,
      event_hash: hash || 'unknown',
      previous_hash: prevHash || 'GENESIS',
    })
  } catch (err) {
    console.error('Audit log error:', err)
  }
}
