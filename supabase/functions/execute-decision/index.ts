import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { decisionId, action, notes } = await req.json()
    
    if (!decisionId || !action) {
      return new Response(
        JSON.stringify({ error: 'Decision ID and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['approved', 'rejected'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Action must be approved or rejected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch decision with related command
    const { data: decision } = await adminClient
      .from('decisions')
      .select('*, commands(*)')
      .eq('id', decisionId)
      .single()

    if (!decision) {
      return new Response(
        JSON.stringify({ error: 'Decision not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user belongs to this organization
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id !== decision.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const now = new Date().toISOString()

    // Update decision
    await adminClient
      .from('decisions')
      .update({
        status: action,
        decided_by: user.id,
        decided_at: now,
        decision_notes: notes || null
      })
      .eq('id', decisionId)

    // ── CRITICAL: Find and update the action_pipeline entry ──────────────
    let dispatchResult = null
    let pipelineActionId: string | null = null

    if (decision.command_id) {
      // Find the action_pipeline entry linked to this command
      const { data: pipelineAction } = await adminClient
        .from('action_pipeline')
        .select('id, status')
        .eq('command_id', decision.command_id)
        .in('status', ['created', 'pending_approval', 'policy_evaluating'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (pipelineAction) {
        pipelineActionId = pipelineAction.id

        if (action === 'approved') {
          // Update pipeline to approved
          await adminClient
            .from('action_pipeline')
            .update({
              status: 'approved',
              approved_by: user.id,
              approved_at: now,
              approval_notes: notes || null,
            })
            .eq('id', pipelineAction.id)

          // ── DISPATCH: Actually execute the action ──────────────────────
          console.log(`Dispatching approved action: ${pipelineAction.id}`)
          try {
            const dispatchResponse = await fetch(`${supabaseUrl}/functions/v1/dispatch-action`, {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ actionId: pipelineAction.id }),
            })

            dispatchResult = await dispatchResponse.json()
            console.log(`Dispatch result:`, JSON.stringify(dispatchResult))

            if (dispatchResult.success) {
              // Command status will be updated by dispatch-action
              console.log(`Action ${pipelineAction.id} executed successfully`)
            } else {
              console.error(`Dispatch failed:`, dispatchResult.error)
              // Update command with dispatch error
              await adminClient
                .from('commands')
                .update({
                  status: 'failed',
                  completed_at: now,
                  error_message: `Dispatch failed: ${dispatchResult.error || 'Unknown error'}`,
                })
                .eq('id', decision.command_id)
            }
          } catch (dispatchError) {
            console.error('Error calling dispatch-action:', dispatchError)
            // Mark command as failed
            await adminClient
              .from('commands')
              .update({
                status: 'failed',
                completed_at: now,
                error_message: `Dispatch error: ${(dispatchError as Error).message}`,
              })
              .eq('id', decision.command_id)
          }
        } else {
          // Rejected — cancel the pipeline action
          await adminClient
            .from('action_pipeline')
            .update({
              status: 'rejected',
              approval_notes: notes || `Rejected by executive`,
            })
            .eq('id', pipelineAction.id)

          // Mark command as failed
          await adminClient
            .from('commands')
            .update({
              status: 'failed',
              completed_at: now,
              error_message: `Rejected by executive${notes ? `: ${notes}` : ''}`
            })
            .eq('id', decision.command_id)
        }
      } else {
        // No pipeline action found — update command directly (legacy path)
        if (action === 'approved') {
          await adminClient
            .from('commands')
            .update({
              status: 'completed',
              completed_at: now,
              result: { status: 'approved_no_pipeline', approvedBy: user.id, notes }
            })
            .eq('id', decision.command_id)
        } else {
          await adminClient
            .from('commands')
            .update({
              status: 'failed',
              completed_at: now,
              error_message: `Rejected by executive${notes ? `: ${notes}` : ''}`
            })
            .eq('id', decision.command_id)
        }
      }

      // Reset agent status
      if (decision.agent_id) {
        await adminClient
          .from('agents')
          .update({ status: 'available', active_tasks: 0 })
          .eq('id', decision.agent_id)
      }
    }

    // Create timeline event
    await adminClient
      .from('timeline_events')
      .insert({
        organization_id: decision.organization_id,
        event_type: 'human_decision',
        title: `Decision ${action}: ${decision.title}`,
        description: dispatchResult?.success
          ? `Executive ${action}. Action dispatched and executed in ${dispatchResult.duration_ms}ms. Evidence collected.`
          : notes || `Executive ${action} the proposed action.`,
        decision_id: decisionId,
        command_id: decision.command_id,
        agent_id: decision.agent_id,
        user_id: user.id,
        icon: action === 'approved' ? '✅' : '❌',
        color: action === 'approved' ? 'green' : 'red',
        confidence_score: decision.confidence_score
      })

    // If approved and involves a client, add to client memory
    if (action === 'approved' && decision.commands?.parsed_intent) {
      const parsedIntent = decision.commands.parsed_intent as { entities?: Array<{ type: string; value: string }> }
      const clientEntity = parsedIntent.entities?.find((e: { type: string }) => e.type === 'client_name')
      
      if (clientEntity) {
        const { data: client } = await adminClient
          .from('clients')
          .select('id')
          .eq('organization_id', decision.organization_id)
          .ilike('name', `%${clientEntity.value}%`)
          .single()

        if (client) {
          await adminClient
            .from('client_memory_log')
            .insert({
              organization_id: decision.organization_id,
              client_id: client.id,
              agent_id: decision.agent_id,
              content: `Executive decision: ${decision.title}. Outcome: ${action}. ${dispatchResult?.success ? `Executed with evidence: ${JSON.stringify(dispatchResult.evidence || {})}` : ''}${notes || ''}`,
              memory_type: 'decision',
              importance_score: action === 'approved' ? 8 : 6
            })
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        action,
        decisionId,
        pipelineActionId,
        dispatched: !!dispatchResult,
        executionResult: dispatchResult || null,
        commandStatus: action === 'approved' 
          ? (dispatchResult?.success ? 'executed' : 'dispatch_failed') 
          : 'rejected'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error executing decision:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to execute decision', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})