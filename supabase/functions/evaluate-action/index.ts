import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PolicyRule {
  id: string
  name: string
  category: string
  condition: Record<string, unknown>
  action: string
  risk_level: string
  priority: number
}

interface EvaluationResult {
  requires_approval: boolean
  risk_level: string
  matched_policies: Array<{ id: string; name: string; action: string }>
  blocked: boolean
  block_reason?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Validate JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
        JSON.stringify({ error: 'Action ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch the action
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

    // 2. Check kill switch
    const { data: org } = await adminClient
      .from('organizations')
      .select('kill_switch_active, max_actions_per_hour, actions_this_hour, hour_reset_at, autonomy_level')
      .eq('id', action.organization_id)
      .single()

    if (org?.kill_switch_active) {
      await adminClient
        .from('action_pipeline')
        .update({ status: 'cancelled', error_message: 'Kill switch is active. All actions halted.' })
        .eq('id', actionId)

      return new Response(
        JSON.stringify({ error: 'Kill switch active', blocked: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Check rate limit
    const now = new Date()
    const hourResetAt = new Date(org?.hour_reset_at || now)
    if (now.getTime() - hourResetAt.getTime() > 3600000) {
      // Reset hourly counter
      await adminClient
        .from('organizations')
        .update({ actions_this_hour: 1, hour_reset_at: now.toISOString() })
        .eq('id', action.organization_id)
    } else if ((org?.actions_this_hour || 0) >= (org?.max_actions_per_hour || 100)) {
      await adminClient
        .from('action_pipeline')
        .update({ status: 'cancelled', error_message: 'Rate limit exceeded. Max actions per hour reached.' })
        .eq('id', actionId)

      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', blocked: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      await adminClient
        .from('organizations')
        .update({ actions_this_hour: (org?.actions_this_hour || 0) + 1 })
        .eq('id', action.organization_id)
    }

    // 4. Update status to policy_evaluating
    await adminClient
      .from('action_pipeline')
      .update({ status: 'policy_evaluating' })
      .eq('id', actionId)

    // 5. Fetch applicable policy rules
    const { data: rules } = await adminClient
      .from('policy_rules')
      .select('*')
      .eq('organization_id', action.organization_id)
      .eq('is_active', true)
      .order('priority', { ascending: false })

    // 6. Evaluate policies
    const evaluation = evaluatePolicies(action, rules || [], org?.autonomy_level || 'draft_actions')

    // 7. Update action with policy result
    const newStatus = evaluation.blocked
      ? 'rejected'
      : evaluation.requires_approval
        ? 'pending_approval'
        : 'approved'

    await adminClient
      .from('action_pipeline')
      .update({
        status: newStatus,
        policy_result: evaluation as unknown as Record<string, unknown>,
        policy_evaluated_at: new Date().toISOString(),
        requires_approval: evaluation.requires_approval,
        risk_level: evaluation.risk_level,
        error_message: evaluation.blocked ? evaluation.block_reason : null,
      })
      .eq('id', actionId)

    // 8. Write audit log entry
    const prevHash = await getLatestHash(adminClient, action.organization_id)
    const seqNum = await getNextSequence(adminClient, action.organization_id)
    const eventHash = generateHash(
      action.organization_id, 'policy_evaluation', 'evaluate',
      evaluation, prevHash, new Date()
    )

    await adminClient
      .from('audit_log')
      .insert({
        organization_id: action.organization_id,
        sequence_number: seqNum,
        event_type: 'policy_evaluation',
        actor_id: user.id,
        actor_type: 'system',
        resource_type: 'action_pipeline',
        resource_id: actionId,
        action: 'evaluate',
        details: {
          action_type: action.action_type,
          category: action.category,
          result: newStatus,
          matched_policies: evaluation.matched_policies.length,
          risk_level: evaluation.risk_level,
        },
        previous_hash: prevHash,
        event_hash: eventHash,
      })

    // 9. Create timeline event
    await adminClient
      .from('timeline_events')
      .insert({
        organization_id: action.organization_id,
        event_type: evaluation.requires_approval ? 'escalation' : 'ai_action',
        title: `Action ${newStatus}: ${action.action_description.substring(0, 50)}`,
        description: evaluation.blocked
          ? `Blocked: ${evaluation.block_reason}`
          : evaluation.requires_approval
            ? `Requires CEO approval. ${evaluation.matched_policies.length} policy rules matched.`
            : `Auto-approved. ${evaluation.matched_policies.length} policy rules evaluated.`,
        command_id: action.command_id,
        agent_id: action.agent_id,
        user_id: user.id,
        icon: evaluation.blocked ? '🚫' : evaluation.requires_approval ? '⚖️' : '✅',
        color: evaluation.blocked ? 'red' : evaluation.requires_approval ? 'orange' : 'green',
      })

    return new Response(
      JSON.stringify({
        success: true,
        actionId,
        status: newStatus,
        evaluation,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error evaluating action:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to evaluate action', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function evaluatePolicies(
  action: Record<string, unknown>,
  rules: PolicyRule[],
  autonomyLevel: string
): EvaluationResult {
  const matchedPolicies: Array<{ id: string; name: string; action: string }> = []
  let requiresApproval = false
  let blocked = false
  let blockReason: string | undefined
  let highestRisk = 'low'

  const riskOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 }

  for (const rule of rules) {
    if (matchesCondition(action, rule)) {
      matchedPolicies.push({ id: rule.id, name: rule.name, action: rule.action })

      if (riskOrder[rule.risk_level] > riskOrder[highestRisk]) {
        highestRisk = rule.risk_level
      }

      switch (rule.action) {
        case 'block':
          blocked = true
          blockReason = `Blocked by policy: ${rule.name}`
          break
        case 'require_approval':
          requiresApproval = true
          break
        case 'escalate':
          requiresApproval = true
          break
        // 'allow' does nothing extra
      }
    }
  }

  // Autonomy level override
  if (autonomyLevel === 'observe_only' || autonomyLevel === 'recommend') {
    requiresApproval = true
  } else if (autonomyLevel === 'draft_actions' || autonomyLevel === 'execute_with_approval') {
    // Financial and high-risk always require approval
    if (action.category === 'financial' || highestRisk === 'high' || highestRisk === 'critical') {
      requiresApproval = true
    }
  }
  // execute_autonomous: only blocked or explicitly required policies force approval

  return {
    requires_approval: requiresApproval,
    risk_level: highestRisk,
    matched_policies: matchedPolicies,
    blocked,
    block_reason: blockReason,
  }
}

function matchesCondition(action: Record<string, unknown>, rule: PolicyRule): boolean {
  const condition = rule.condition
  if (!condition || typeof condition !== 'object') return false

  // Match by category
  if (condition.category && action.category !== condition.category) return false

  // Match by action_type pattern
  if (condition.action_type) {
    const pattern = String(condition.action_type).toLowerCase()
    const actionType = String(action.action_type || '').toLowerCase()
    if (!actionType.includes(pattern)) return false
  }

  // Match by risk_level minimum
  if (condition.min_risk_level) {
    const riskOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 }
    const actionRisk = riskOrder[String(action.risk_level)] || 0
    const minRisk = riskOrder[String(condition.min_risk_level)] || 0
    if (actionRisk < minRisk) return false
  }

  return true
}

async function getLatestHash(client: ReturnType<typeof createClient>, orgId: string): Promise<string> {
  const { data } = await client
    .from('audit_log')
    .select('event_hash')
    .eq('organization_id', orgId)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .single()

  return data?.event_hash || 'GENESIS'
}

async function getNextSequence(client: ReturnType<typeof createClient>, orgId: string): Promise<number> {
  const { data } = await client
    .from('audit_log')
    .select('sequence_number')
    .eq('organization_id', orgId)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .single()

  return (data?.sequence_number || 0) + 1
}

function generateHash(
  orgId: string,
  eventType: string,
  action: string,
  details: unknown,
  previousHash: string,
  timestamp: Date
): string {
  // Simple hash for edge function context (DB function provides stronger hashing)
  const input = `${orgId}|${eventType}|${action}|${JSON.stringify(details)}|${previousHash}|${timestamp.toISOString()}`
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}
