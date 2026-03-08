import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Action Executor Registry ───────────────────────────────────────────────
// Each executor returns { success, evidence, error? }
// Evidence is stored for audit trail and compliance

interface ExecutionContext {
  action: ActionRecord
  adminClient: ReturnType<typeof createClient>
  supabaseUrl: string
  authHeader: string
}

interface ExecutionResult {
  success: boolean
  evidence: Record<string, unknown>
  error?: string
  outputData?: Record<string, unknown>
}

interface ActionRecord {
  id: string
  organization_id: string
  command_id: string | null
  agent_id: string | null
  created_by: string
  category: string
  action_type: string
  action_description: string
  action_params: Record<string, unknown>
  status: string
  risk_level: string
  retry_count: number
  max_retries: number
  idempotency_key: string | null
}

// ─── Executor: Send Email ───────────────────────────────────────────────────
async function executeSendEmail(ctx: ExecutionContext): Promise<ExecutionResult> {
  const params = ctx.action.action_params
  const entities = (params.entities || []) as Array<{ type: string; value: string }>
  const emailEntity = entities.find(e => e.type === 'email')
  const to = (params.to as string) || emailEntity?.value
  const subject = (params.subject as string) || `Re: ${ctx.action.action_description}`
  const body = params.body as string | undefined
  const emailId = params.email_id as string | undefined

  // Case 1: Pre-composed email — just dispatch via send-email function
  if (emailId) {
    const response = await fetch(`${ctx.supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': ctx.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emailId }),
    })

    const data = await response.json()
    if (!response.ok) {
      return {
        success: false,
        evidence: { emailId, response_status: response.status, error: data },
        error: data?.error || `Send-email returned ${response.status}`,
      }
    }

    return {
      success: true,
      evidence: { emailId, resendId: data.resendId, sent_at: new Date().toISOString() },
      outputData: data,
    }
  }

  // Case 2: AI-generated email from action params
  if (to) {
    // Create email record first
    const { data: profile } = await ctx.adminClient
      .from('profiles')
      .select('organization_id, email, full_name')
      .eq('id', ctx.action.created_by)
      .single()

    const fromAddress = profile?.email || 'ai@chief-of-staff.app'

    // Use AI to draft if no body provided
    let emailBody = body
    if (!emailBody) {
      const aiResponse = await fetch(`${ctx.supabaseUrl}/functions/v1/ai-email`, {
        method: 'POST',
        headers: {
          'Authorization': ctx.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'draft',
          to,
          subject,
          context: ctx.action.action_description,
        }),
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        emailBody = aiData.draft
      } else {
        return {
          success: false,
          evidence: { to, subject, ai_status: aiResponse.status },
          error: 'Failed to generate email draft via AI',
        }
      }
    }

    // Insert email record
    const newEmailId = crypto.randomUUID()
    const { error: insertError } = await ctx.adminClient
      .from('emails')
      .insert({
        id: newEmailId,
        thread_id: newEmailId,
        organization_id: ctx.action.organization_id,
        from_address: fromAddress,
        to_addresses: [to],
        subject,
        body_text: emailBody,
        body_html: `<div style="font-family: sans-serif; line-height: 1.6;">${emailBody?.replace(/\n/g, '<br>') || ''}</div>`,
        status: 'draft',
        agent_id: ctx.action.agent_id,
        command_id: ctx.action.command_id,
      })

    if (insertError) {
      return {
        success: false,
        evidence: { to, subject, insert_error: insertError.message },
        error: `Failed to create email record: ${insertError.message}`,
      }
    }

    // Send via Resend
    const sendResponse = await fetch(`${ctx.supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': ctx.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emailId: newEmailId }),
    })

    const sendData = await sendResponse.json()
    if (!sendResponse.ok) {
      return {
        success: false,
        evidence: { emailId: newEmailId, to, subject, send_error: sendData },
        error: sendData?.error || 'Email send failed',
      }
    }

    return {
      success: true,
      evidence: {
        emailId: newEmailId,
        to,
        subject,
        resendId: sendData.resendId,
        sent_at: new Date().toISOString(),
        body_length: emailBody?.length || 0,
      },
      outputData: { emailId: newEmailId, resendId: sendData.resendId },
    }
  }

  return {
    success: false,
    evidence: { params },
    error: 'No email target specified in action params',
  }
}

// ─── Executor: Data Mutation (Client/CRM updates) ──────────────────────────
async function executeDataMutation(ctx: ExecutionContext): Promise<ExecutionResult> {
  const params = ctx.action.action_params
  const entities = (params.entities || []) as Array<{ type: string; value: string }>
  const actionType = ctx.action.action_type
  const command = params.original_command as string || ctx.action.action_description

  // Client creation
  if (actionType === 'client_management' && command.toLowerCase().includes('add') || command.toLowerCase().includes('create client')) {
    const clientName = entities.find(e => e.type === 'client_name')?.value
    const email = entities.find(e => e.type === 'email')?.value

    if (!clientName) {
      return { success: false, evidence: { entities }, error: 'No client name found in entities' }
    }

    const { data: client, error } = await ctx.adminClient
      .from('clients')
      .insert({
        organization_id: ctx.action.organization_id,
        name: clientName,
        email: email || null,
        status: 'prospect',
      })
      .select()
      .single()

    if (error) {
      return { success: false, evidence: { clientName, error: error.message }, error: error.message }
    }

    return {
      success: true,
      evidence: { client_id: client.id, client_name: clientName, email, created_at: new Date().toISOString() },
      outputData: { clientId: client.id },
    }
  }

  // Client status update
  if (actionType === 'client_management') {
    const clientName = entities.find(e => e.type === 'client_name')?.value
    if (clientName) {
      const { data: client } = await ctx.adminClient
        .from('clients')
        .select('id, name, status')
        .eq('organization_id', ctx.action.organization_id)
        .ilike('name', `%${clientName}%`)
        .maybeSingle()

      if (client) {
        // Determine what to update from the command
        const updates: Record<string, unknown> = {}
        const lowerCmd = command.toLowerCase()

        if (lowerCmd.includes('active') || lowerCmd.includes('activate')) updates.status = 'active'
        else if (lowerCmd.includes('pause')) updates.status = 'paused'
        else if (lowerCmd.includes('onboard')) updates.status = 'onboarding'
        else if (lowerCmd.includes('follow up') || lowerCmd.includes('follow-up')) {
          updates.next_follow_up = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }

        if (Object.keys(updates).length > 0) {
          const { error } = await ctx.adminClient
            .from('clients')
            .update(updates)
            .eq('id', client.id)

          if (error) {
            return { success: false, evidence: { client_id: client.id, updates, error: error.message }, error: error.message }
          }

          // Write client memory
          await ctx.adminClient
            .from('client_memory_log')
            .insert({
              organization_id: ctx.action.organization_id,
              client_id: client.id,
              agent_id: ctx.action.agent_id,
              content: `Action executed: ${ctx.action.action_description}. Updates: ${JSON.stringify(updates)}`,
              memory_type: 'action',
              importance_score: 7,
            })

          return {
            success: true,
            evidence: { client_id: client.id, client_name: client.name, previous_status: client.status, updates, executed_at: new Date().toISOString() },
            outputData: { clientId: client.id, updates },
          }
        }
      }
    }
  }

  // Task creation
  if (actionType === 'scheduling' || command.toLowerCase().includes('task') || command.toLowerCase().includes('todo')) {
    const clientName = entities.find(e => e.type === 'client_name')?.value
    let clientId: string | null = null

    if (clientName) {
      const { data: client } = await ctx.adminClient
        .from('clients')
        .select('id')
        .eq('organization_id', ctx.action.organization_id)
        .ilike('name', `%${clientName}%`)
        .maybeSingle()
      clientId = client?.id || null
    }

    if (clientId) {
      const { data: task, error } = await ctx.adminClient
        .from('client_tasks')
        .insert({
          organization_id: ctx.action.organization_id,
          client_id: clientId,
          title: ctx.action.action_description,
          status: 'todo',
          priority: ctx.action.risk_level === 'high' || ctx.action.risk_level === 'critical' ? 'high' : 'medium',
          created_by: ctx.action.created_by,
        })
        .select()
        .single()

      if (error) {
        return { success: false, evidence: { client_id: clientId, error: error.message }, error: error.message }
      }

      return {
        success: true,
        evidence: { task_id: task.id, client_id: clientId, title: ctx.action.action_description, created_at: new Date().toISOString() },
        outputData: { taskId: task.id },
      }
    }
  }

  // Generic: log the intent but mark as completed (human can follow up)
  return {
    success: true,
    evidence: {
      action_type: actionType,
      description: ctx.action.action_description,
      entities,
      note: 'Action logged for manual follow-up. No automated executor matched.',
      executed_at: new Date().toISOString(),
    },
    outputData: { manual_followup: true },
  }
}

// ─── Executor: Reporting/Analysis ───────────────────────────────────────────
async function executeReporting(ctx: ExecutionContext): Promise<ExecutionResult> {
  // Generate an AI summary of the requested data
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!lovableApiKey) {
    return { success: false, evidence: {}, error: 'AI gateway not configured' }
  }

  // Gather org stats
  const orgId = ctx.action.organization_id
  const [clientsRes, commandsRes, emailsRes, pipelineRes] = await Promise.all([
    ctx.adminClient.from('clients').select('id, name, status, mrr, risk_of_churn', { count: 'exact' }).eq('organization_id', orgId),
    ctx.adminClient.from('commands').select('id, status', { count: 'exact' }).eq('organization_id', orgId),
    ctx.adminClient.from('emails').select('id, status', { count: 'exact' }).eq('organization_id', orgId),
    ctx.adminClient.from('action_pipeline').select('id, status', { count: 'exact' }).eq('organization_id', orgId),
  ])

  const stats = {
    total_clients: clientsRes.count || 0,
    active_clients: clientsRes.data?.filter(c => c.status === 'active').length || 0,
    total_mrr: clientsRes.data?.reduce((sum, c) => sum + (c.mrr || 0), 0) || 0,
    high_churn_risk: clientsRes.data?.filter(c => c.risk_of_churn === 'high' || c.risk_of_churn === 'critical').length || 0,
    total_commands: commandsRes.count || 0,
    total_emails: emailsRes.count || 0,
    pipeline_actions: pipelineRes.count || 0,
  }

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: 'You are an executive analyst. Provide a concise executive summary report. Include insights, risks, and recommendations. Format with bullet points.' },
        { role: 'user', content: `Generate an executive report based on: ${JSON.stringify(stats)}. Context: "${ctx.action.action_description}"` },
      ],
    }),
  })

  if (!aiResponse.ok) {
    return { success: false, evidence: { stats }, error: `AI analysis failed: ${aiResponse.status}` }
  }

  const aiData = await aiResponse.json()
  const report = aiData.choices?.[0]?.message?.content || 'Report generation failed.'

  return {
    success: true,
    evidence: { stats, report_length: report.length, generated_at: new Date().toISOString() },
    outputData: { report, stats },
  }
}

// ─── Main Dispatcher ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate user
    const token = authHeader.replace('Bearer ', '')
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: userError } = await authClient.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { actionId } = await req.json()
    if (!actionId) {
      return new Response(
        JSON.stringify({ error: 'actionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // ── Step 1: Fetch & validate action ─────────────────────────────────────
    const { data: action, error: actionError } = await adminClient
      .from('action_pipeline')
      .select('*')
      .eq('id', actionId)
      .single()

    if (actionError || !action) {
      return new Response(
        JSON.stringify({ error: 'Action not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only dispatch approved actions
    if (action.status !== 'approved') {
      return new Response(
        JSON.stringify({ error: `Cannot dispatch action with status: ${action.status}`, currentStatus: action.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Step 2: Idempotency check ───────────────────────────────────────────
    if (action.dispatched_at && action.execution_result) {
      return new Response(
        JSON.stringify({ success: true, already_executed: true, result: action.execution_result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Step 3: Check kill switch ───────────────────────────────────────────
    const { data: org } = await adminClient
      .from('organizations')
      .select('kill_switch_active')
      .eq('id', action.organization_id)
      .single()

    if (org?.kill_switch_active) {
      await adminClient
        .from('action_pipeline')
        .update({ status: 'cancelled', error_message: 'Kill switch activated during dispatch' })
        .eq('id', actionId)

      return new Response(
        JSON.stringify({ error: 'Kill switch is active', blocked: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Step 4: Transition to dispatched → executing ────────────────────────
    const dispatchTime = new Date().toISOString()
    await adminClient
      .from('action_pipeline')
      .update({
        status: 'dispatched',
        dispatched_at: dispatchTime,
      })
      .eq('id', actionId)

    await adminClient
      .from('action_pipeline')
      .update({
        status: 'executing',
        execution_started_at: new Date().toISOString(),
      })
      .eq('id', actionId)

    // ── Step 5: Route to correct executor ───────────────────────────────────
    const ctx: ExecutionContext = {
      action: action as ActionRecord,
      adminClient,
      supabaseUrl,
      authHeader,
    }

    let result: ExecutionResult

    try {
      switch (action.category) {
        case 'communication':
          result = await executeSendEmail(ctx)
          break
        case 'data_mutation':
        case 'financial':
        case 'scheduling':
          result = await executeDataMutation(ctx)
          break
        case 'reporting':
          result = await executeReporting(ctx)
          break
        case 'integration':
          // Future: route to integration executors
          result = {
            success: true,
            evidence: { note: 'Integration action logged for manual processing', action_type: action.action_type },
            outputData: { manual_followup: true },
          }
          break
        default:
          result = await executeDataMutation(ctx) // Default to data mutation handler
          break
      }
    } catch (execError) {
      result = {
        success: false,
        evidence: { error: (execError as Error).message, stack: (execError as Error).stack?.substring(0, 500) },
        error: (execError as Error).message,
      }
    }

    // ── Step 6: Record execution result ─────────────────────────────────────
    const executionDuration = Date.now() - startTime
    const completedAt = new Date().toISOString()

    if (result.success) {
      await adminClient
        .from('action_pipeline')
        .update({
          status: 'completed',
          execution_completed_at: completedAt,
          execution_result: result.outputData || {},
          evidence: result.evidence,
        })
        .eq('id', actionId)

      // Update related command to completed
      if (action.command_id) {
        await adminClient
          .from('commands')
          .update({
            status: 'completed',
            completed_at: completedAt,
            actual_duration_ms: executionDuration,
            result: {
              action_pipeline_id: actionId,
              execution_result: result.outputData,
              evidence_collected: true,
            },
          })
          .eq('id', action.command_id)
      }

      // Release agent
      if (action.agent_id) {
        await adminClient
          .from('agents')
          .update({ status: 'available', active_tasks: 0 })
          .eq('id', action.agent_id)
      }
    } else {
      // Failed — check retry
      const newRetryCount = (action.retry_count || 0) + 1
      const canRetry = newRetryCount < (action.max_retries || 3)

      await adminClient
        .from('action_pipeline')
        .update({
          status: canRetry ? 'approved' : 'failed', // Re-queue for retry or fail permanently
          execution_completed_at: completedAt,
          error_message: result.error || 'Execution failed',
          evidence: result.evidence,
          retry_count: newRetryCount,
        })
        .eq('id', actionId)

      if (!canRetry && action.command_id) {
        await adminClient
          .from('commands')
          .update({
            status: 'failed',
            completed_at: completedAt,
            error_message: `Action failed after ${newRetryCount} attempts: ${result.error}`,
          })
          .eq('id', action.command_id)
      }

      if (!canRetry && action.agent_id) {
        await adminClient
          .from('agents')
          .update({ status: 'error', active_tasks: 0 })
          .eq('id', action.agent_id)
      }
    }

    // ── Step 7: Write audit log ─────────────────────────────────────────────
    const prevHash = await getLatestHash(adminClient, action.organization_id)
    const seqNum = await getNextSequence(adminClient, action.organization_id)
    const eventHash = generateHash(
      action.organization_id, 'action_execution',
      result.success ? 'execute_success' : 'execute_failure',
      { actionId, category: action.category, duration_ms: executionDuration },
      prevHash, new Date()
    )

    await adminClient
      .from('audit_log')
      .insert({
        organization_id: action.organization_id,
        sequence_number: seqNum,
        event_type: 'action_execution',
        actor_id: user.id,
        actor_type: 'system',
        resource_type: 'action_pipeline',
        resource_id: actionId,
        action: result.success ? 'execute_success' : 'execute_failure',
        details: {
          category: action.category,
          action_type: action.action_type,
          duration_ms: executionDuration,
          retry_count: action.retry_count || 0,
          success: result.success,
          evidence_keys: Object.keys(result.evidence),
          error: result.error || null,
        },
        previous_hash: prevHash,
        event_hash: eventHash,
      })

    // ── Step 8: Create timeline event ───────────────────────────────────────
    await adminClient
      .from('timeline_events')
      .insert({
        organization_id: action.organization_id,
        event_type: result.success ? 'ai_action' : 'escalation',
        title: result.success
          ? `✓ Executed: ${action.action_description.substring(0, 60)}`
          : `✗ Failed: ${action.action_description.substring(0, 60)}`,
        description: result.success
          ? `Action completed in ${executionDuration}ms. Category: ${action.category}. Evidence collected.`
          : `Execution failed: ${result.error}. Retry ${action.retry_count || 0}/${action.max_retries || 3}.`,
        command_id: action.command_id,
        agent_id: action.agent_id,
        user_id: user.id,
        icon: result.success ? '⚡' : '💥',
        color: result.success ? 'green' : 'red',
      })

    return new Response(
      JSON.stringify({
        success: result.success,
        actionId,
        status: result.success ? 'completed' : (action.retry_count || 0) + 1 < (action.max_retries || 3) ? 'retrying' : 'failed',
        duration_ms: executionDuration,
        evidence: result.evidence,
        error: result.error || null,
        outputData: result.outputData || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Dispatch error:', error)
    return new Response(
      JSON.stringify({ error: 'Dispatch failed', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─── Audit Helpers ──────────────────────────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function getLatestHash(client: any, orgId: string): Promise<string> {
  const { data } = await client
    .from('audit_log')
    .select('event_hash')
    .eq('organization_id', orgId)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .single()
  return (data?.event_hash as string) || 'GENESIS'
}

// deno-lint-ignore no-explicit-any
async function getNextSequence(client: any, orgId: string): Promise<number> {
  const { data } = await client
    .from('audit_log')
    .select('sequence_number')
    .eq('organization_id', orgId)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .single()
  return ((data?.sequence_number as number) || 0) + 1
}

function generateHash(
  orgId: string, eventType: string, action: string,
  details: unknown, previousHash: string, timestamp: Date
): string {
  const input = `${orgId}|${eventType}|${action}|${JSON.stringify(details)}|${previousHash}|${timestamp.toISOString()}`
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}
