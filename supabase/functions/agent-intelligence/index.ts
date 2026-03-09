import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MemoryEntry {
  id: string
  action_type: string
  outcome: string
  success_score: number
  reasoning_chain: unknown[]
  lessons_learned: string[]
  duration_ms: number
  created_at: string
}

// ─── Action: Store Execution Memory ─────────────────────────────────────────
async function storeExecutionMemory(
  adminClient: ReturnType<typeof createClient>,
  params: {
    organizationId: string
    agentId: string
    actionPipelineId: string
    actionType: string
    actionCategory: string
    outcome: 'success' | 'failure' | 'partial'
    evidence: Record<string, unknown>
    reasoningChain: unknown[]
    contextSnapshot: Record<string, unknown>
    durationMs: number
    errorDetails?: string
  }
) {
  // Count similar past executions for this agent+action_type
  const { count } = await adminClient
    .from('agent_execution_memory')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', params.agentId)
    .eq('action_type', params.actionType)

  // Calculate success score based on outcome
  const successScore = params.outcome === 'success' ? 1.0 :
    params.outcome === 'partial' ? 0.5 : 0.0

  // Use AI to extract lessons learned
  const lessons = await extractLessons(params)

  const { data, error } = await adminClient
    .from('agent_execution_memory')
    .insert({
      organization_id: params.organizationId,
      agent_id: params.agentId,
      action_pipeline_id: params.actionPipelineId,
      action_type: params.actionType,
      action_category: params.actionCategory,
      outcome: params.outcome,
      success_score: successScore,
      reasoning_chain: params.reasoningChain,
      context_snapshot: params.contextSnapshot,
      execution_evidence: params.evidence,
      lessons_learned: lessons,
      duration_ms: params.durationMs,
      error_details: params.errorDetails || null,
      similar_past_count: (count || 0),
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to store execution memory:', error)
    return null
  }

  return data
}

// ─── Action: Retrieve Relevant Memories ─────────────────────────────────────
async function retrieveRelevantMemories(
  adminClient: ReturnType<typeof createClient>,
  agentId: string,
  actionType: string,
  limit = 10
): Promise<MemoryEntry[]> {
  // Get memories for this agent with this action type, prioritizing recent successes
  const { data: memories } = await adminClient
    .from('agent_execution_memory')
    .select('id, action_type, outcome, success_score, reasoning_chain, lessons_learned, duration_ms, created_at')
    .eq('agent_id', agentId)
    .eq('action_type', actionType)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (memories || []) as MemoryEntry[]
}

// ─── Action: Get Agent Performance Stats ────────────────────────────────────
async function getAgentPerformanceStats(
  adminClient: ReturnType<typeof createClient>,
  agentId: string,
  orgId: string
) {
  const [allMemory, successMemory, failMemory, followUps, delegationsFrom, delegationsTo] = await Promise.all([
    adminClient.from('agent_execution_memory').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
    adminClient.from('agent_execution_memory').select('id', { count: 'exact', head: true }).eq('agent_id', agentId).eq('outcome', 'success'),
    adminClient.from('agent_execution_memory').select('id', { count: 'exact', head: true }).eq('agent_id', agentId).eq('outcome', 'failure'),
    adminClient.from('agent_follow_ups').select('id, status', { count: 'exact' }).eq('agent_id', agentId),
    adminClient.from('agent_delegations').select('id, status', { count: 'exact' }).eq('from_agent_id', agentId),
    adminClient.from('agent_delegations').select('id, status', { count: 'exact' }).eq('to_agent_id', agentId),
  ])

  const total = allMemory.count || 0
  const successes = successMemory.count || 0
  const failures = failMemory.count || 0

  // Get avg duration for successful executions
  const { data: avgData } = await adminClient
    .from('agent_execution_memory')
    .select('duration_ms')
    .eq('agent_id', agentId)
    .eq('outcome', 'success')
    .order('created_at', { ascending: false })
    .limit(20)

  const avgDuration = avgData && avgData.length > 0
    ? Math.round(avgData.reduce((s, m) => s + (m.duration_ms || 0), 0) / avgData.length)
    : 0

  // Get recent lessons
  const { data: recentLessons } = await adminClient
    .from('agent_execution_memory')
    .select('lessons_learned, action_type, outcome, created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(5)

  const pendingFollowUps = followUps.data?.filter(f => f.status === 'pending').length || 0
  const completedFollowUps = followUps.data?.filter(f => f.status === 'completed').length || 0

  return {
    totalExecutions: total,
    successRate: total > 0 ? Math.round((successes / total) * 100) : 0,
    failureRate: total > 0 ? Math.round((failures / total) * 100) : 0,
    avgDurationMs: avgDuration,
    pendingFollowUps,
    completedFollowUps,
    totalDelegationsInitiated: delegationsFrom.count || 0,
    totalDelegationsReceived: delegationsTo.count || 0,
    recentLessons: (recentLessons || []).flatMap(m => (m.lessons_learned || []).map(l => ({
      lesson: l,
      action_type: m.action_type,
      outcome: m.outcome,
      at: m.created_at,
    }))).slice(0, 10),
  }
}

// ─── Action: Create Evidence Record ─────────────────────────────────────────
async function createEvidenceRecord(
  adminClient: ReturnType<typeof createClient>,
  params: {
    organizationId: string
    actionPipelineId: string
    agentId: string | null
    evidenceType: string
    evidenceData: Record<string, unknown>
    verificationMethod: string
  }
) {
  // Auto-verify based on evidence type
  const autoVerified = verifyEvidence(params.evidenceType, params.evidenceData)

  const { data, error } = await adminClient
    .from('execution_evidence')
    .insert({
      organization_id: params.organizationId,
      action_pipeline_id: params.actionPipelineId,
      agent_id: params.agentId,
      evidence_type: params.evidenceType,
      evidence_data: params.evidenceData,
      verification_status: autoVerified.status,
      verified_at: autoVerified.verified ? new Date().toISOString() : null,
      verification_method: params.verificationMethod,
      confidence_score: autoVerified.confidence,
      discrepancies: autoVerified.discrepancies,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create evidence record:', error)
    return null
  }
  return data
}

// ─── Action: Create Follow-ups ──────────────────────────────────────────────
async function createAutoFollowUps(
  adminClient: ReturnType<typeof createClient>,
  params: {
    organizationId: string
    agentId: string
    actionPipelineId: string
    actionType: string
    actionCategory: string
    outcome: 'success' | 'failure' | 'partial'
    actionDescription: string
  }
) {
  const followUps: Array<{
    follow_up_type: string
    description: string
    due_at: string
    priority: string
  }> = []

  const now = Date.now()

  // Always create a verification follow-up for successful actions
  if (params.outcome === 'success') {
    followUps.push({
      follow_up_type: 'verification',
      description: `Verify outcome: ${params.actionDescription}`,
      due_at: new Date(now + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      priority: 'medium',
    })
  }

  // For communication actions, check for response
  if (params.actionCategory === 'communication' && params.outcome === 'success') {
    followUps.push({
      follow_up_type: 'check_in',
      description: `Check response to: ${params.actionDescription}`,
      due_at: new Date(now + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      priority: 'medium',
    })
  }

  // For failures, create escalation follow-up
  if (params.outcome === 'failure') {
    followUps.push({
      follow_up_type: 'escalation',
      description: `Review failed action: ${params.actionDescription}`,
      due_at: new Date(now + 30 * 60 * 1000).toISOString(), // 30 minutes
      priority: 'high',
    })
  }

  // For data mutations, create a review follow-up
  if (params.actionCategory === 'data_mutation' && params.outcome === 'success') {
    followUps.push({
      follow_up_type: 'review',
      description: `Review data change: ${params.actionDescription}`,
      due_at: new Date(now + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
      priority: 'low',
    })
  }

  // For financial actions, create high-priority verification
  if (params.actionCategory === 'financial') {
    followUps.push({
      follow_up_type: 'verification',
      description: `Verify financial action: ${params.actionDescription}`,
      due_at: new Date(now + 60 * 60 * 1000).toISOString(), // 1 hour
      priority: 'critical',
    })
  }

  if (followUps.length === 0) return []

  const { data, error } = await adminClient
    .from('agent_follow_ups')
    .insert(followUps.map(f => ({
      organization_id: params.organizationId,
      agent_id: params.agentId,
      action_pipeline_id: params.actionPipelineId,
      ...f,
      auto_created: true,
    })))
    .select()

  if (error) {
    console.error('Failed to create follow-ups:', error)
    return []
  }

  return data || []
}

// ─── Action: Cross-Agent Delegation ─────────────────────────────────────────
async function createDelegation(
  adminClient: ReturnType<typeof createClient>,
  params: {
    organizationId: string
    fromAgentId: string
    toAgentId: string
    actionPipelineId?: string
    commandId?: string
    delegationType: 'sub_task' | 'handoff' | 'collaboration' | 'escalation'
    taskDescription: string
    context: Record<string, unknown>
    priority: 'low' | 'medium' | 'high' | 'critical'
  }
) {
  const { data, error } = await adminClient
    .from('agent_delegations')
    .insert({
      organization_id: params.organizationId,
      from_agent_id: params.fromAgentId,
      to_agent_id: params.toAgentId,
      action_pipeline_id: params.actionPipelineId || null,
      command_id: params.commandId || null,
      delegation_type: params.delegationType,
      task_description: params.taskDescription,
      context: params.context,
      priority: params.priority,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create delegation:', error)
    return null
  }

  // Update receiving agent status
  await adminClient
    .from('agents')
    .update({ status: 'busy', active_tasks: 1 })
    .eq('id', params.toAgentId)

  return data
}

// ─── Action: Analyze for Delegation Opportunities ───────────────────────────
async function analyzeForDelegation(
  adminClient: ReturnType<typeof createClient>,
  params: {
    organizationId: string
    agentId: string
    actionType: string
    actionDescription: string
  }
): Promise<Array<{ toAgentId: string; toAgentName: string; delegationType: string; reason: string }>> {
  // Get all available agents except current
  const { data: agents } = await adminClient
    .from('agents')
    .select('id, name, role, status')
    .eq('organization_id', params.organizationId)
    .neq('id', params.agentId)

  if (!agents || agents.length === 0) return []

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!lovableApiKey) return []

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: `You are an AI coordination engine. Given a completed action and available agents, determine if any follow-up sub-tasks should be delegated to other specialized agents. Only suggest delegations that would genuinely add value.`
        },
        {
          role: 'user',
          content: `Completed action: "${params.actionDescription}" (type: ${params.actionType}).

Available agents:
${agents.map(a => `- ${a.name} (${a.role}) [${a.status}]`).join('\n')}

Should any follow-up sub-tasks be delegated to other agents? If yes, suggest at most 2 delegations.`
        }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'suggest_delegations',
          description: 'Suggest cross-agent delegations for follow-up work.',
          parameters: {
            type: 'object',
            properties: {
              delegations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    to_agent_name: { type: 'string' },
                    delegation_type: { type: 'string', enum: ['sub_task', 'handoff', 'collaboration', 'escalation'] },
                    task_description: { type: 'string' },
                    reason: { type: 'string' },
                    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  },
                  required: ['to_agent_name', 'delegation_type', 'task_description', 'reason', 'priority'],
                  additionalProperties: false,
                },
              },
            },
            required: ['delegations'],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'suggest_delegations' } },
    }),
  })

  if (!response.ok) {
    console.error('AI delegation analysis failed:', response.status)
    return []
  }

  const data = await response.json()
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
  if (!toolCall) return []

  try {
    const result = JSON.parse(toolCall.function.arguments)
    const suggestions = result.delegations || []

    return suggestions.map((s: { to_agent_name: string; delegation_type: string; task_description: string; reason: string; priority: string }) => {
      const matchedAgent = agents.find(a =>
        a.name.toLowerCase().includes(s.to_agent_name.toLowerCase()) ||
        s.to_agent_name.toLowerCase().includes(a.name.toLowerCase())
      )
      return matchedAgent ? {
        toAgentId: matchedAgent.id,
        toAgentName: matchedAgent.name,
        delegationType: s.delegation_type,
        taskDescription: s.task_description,
        reason: s.reason,
        priority: s.priority,
      } : null
    }).filter(Boolean)
  } catch {
    return []
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function verifyEvidence(
  evidenceType: string,
  evidenceData: Record<string, unknown>
): { status: 'verified' | 'pending' | 'failed' | 'inconclusive'; verified: boolean; confidence: number; discrepancies: unknown[] } {
  const discrepancies: unknown[] = []

  // Email evidence: check for resendId
  if (evidenceType === 'email_sent') {
    if (evidenceData.resendId) {
      return { status: 'verified', verified: true, confidence: 0.95, discrepancies: [] }
    }
    return { status: 'inconclusive', verified: false, confidence: 0.3, discrepancies: [{ issue: 'No delivery confirmation ID' }] }
  }

  // Data mutation: check for resource IDs
  if (evidenceType === 'data_created' || evidenceType === 'data_updated') {
    const hasResourceId = evidenceData.client_id || evidenceData.task_id || evidenceData.resource_id
    if (hasResourceId && evidenceData.executed_at) {
      return { status: 'verified', verified: true, confidence: 0.9, discrepancies: [] }
    }
    return { status: 'inconclusive', verified: false, confidence: 0.4, discrepancies: [{ issue: 'Missing resource ID or timestamp' }] }
  }

  // Report: check for content
  if (evidenceType === 'report_generated') {
    if (evidenceData.report_length && (evidenceData.report_length as number) > 50) {
      return { status: 'verified', verified: true, confidence: 0.85, discrepancies: [] }
    }
    return { status: 'failed', verified: false, confidence: 0.1, discrepancies: [{ issue: 'Report content too short or empty' }] }
  }

  // Call evidence
  if (evidenceType === 'call_completed') {
    if (evidenceData.call_id) {
      return { status: 'verified', verified: true, confidence: 0.9, discrepancies: [] }
    }
  }

  // Default: pending human verification
  return { status: 'pending', verified: false, confidence: 0.5, discrepancies: [] }
}

async function extractLessons(params: {
  actionType: string
  actionCategory: string
  outcome: string
  evidence: Record<string, unknown>
  errorDetails?: string
}): Promise<string[]> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!lovableApiKey) {
    // Fallback: basic lessons from outcome
    if (params.outcome === 'failure') {
      return [`Failed ${params.actionType}: ${params.errorDetails || 'Unknown error'}`]
    }
    return [`Successfully completed ${params.actionType}`]
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'Extract 1-3 concise operational lessons from this execution outcome. Each lesson should be actionable and specific. Return ONLY a JSON array of strings.',
          },
          {
            role: 'user',
            content: `Action: ${params.actionType} (${params.actionCategory})\nOutcome: ${params.outcome}\nEvidence keys: ${Object.keys(params.evidence).join(', ')}\nError: ${params.errorDetails || 'none'}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      const match = content.match(/\[[\s\S]*\]/)
      if (match) return JSON.parse(match[0])
    }
  } catch (e) {
    console.error('Lesson extraction failed:', e)
  }

  return params.outcome === 'failure'
    ? [`Action ${params.actionType} failed: ${params.errorDetails || 'Unknown'}`]
    : [`Completed ${params.actionType} successfully`]
}

// ─── Main Handler ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { action: requestAction } = body

    switch (requestAction) {
      // Called after dispatch-action completes execution
      case 'post_execution': {
        const {
          organizationId, agentId, actionPipelineId, actionType, actionCategory,
          outcome, evidence, reasoningChain, contextSnapshot, durationMs, errorDetails,
          actionDescription,
        } = body

        if (!organizationId || !agentId || !actionPipelineId) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // 1. Store execution memory
        const memory = await storeExecutionMemory(adminClient, {
          organizationId, agentId, actionPipelineId, actionType, actionCategory,
          outcome, evidence: evidence || {}, reasoningChain: reasoningChain || [],
          contextSnapshot: contextSnapshot || {}, durationMs: durationMs || 0,
          errorDetails,
        })

        // 2. Create evidence record
        const evidenceType = actionCategory === 'communication' ? 'email_sent' :
          actionCategory === 'data_mutation' ? (outcome === 'success' ? 'data_created' : 'data_updated') :
          actionCategory === 'reporting' ? 'report_generated' :
          'action_completed'

        const evidenceRecord = await createEvidenceRecord(adminClient, {
          organizationId, actionPipelineId, agentId,
          evidenceType, evidenceData: evidence || {},
          verificationMethod: 'auto_verification',
        })

        // 3. Create auto follow-ups
        const followUps = await createAutoFollowUps(adminClient, {
          organizationId, agentId, actionPipelineId, actionType, actionCategory,
          outcome, actionDescription: actionDescription || '',
        })

        // 4. Analyze for cross-agent delegation opportunities
        let delegations: unknown[] = []
        if (outcome === 'success' && agentId) {
          const suggestions = await analyzeForDelegation(adminClient, {
            organizationId, agentId, actionType,
            actionDescription: actionDescription || '',
          })

          // Auto-create delegations from AI suggestions
          for (const suggestion of suggestions) {
            const delegation = await createDelegation(adminClient, {
              organizationId,
              fromAgentId: agentId,
              toAgentId: (suggestion as { toAgentId: string }).toAgentId,
              actionPipelineId,
              delegationType: (suggestion as { delegationType: string }).delegationType as 'sub_task' | 'handoff' | 'collaboration' | 'escalation',
              taskDescription: (suggestion as { taskDescription: string }).taskDescription,
              context: { source_action: actionPipelineId, reason: (suggestion as { reason: string }).reason },
              priority: ((suggestion as { priority?: string }).priority || 'medium') as 'low' | 'medium' | 'high' | 'critical',
            })
            if (delegation) delegations.push(delegation)
          }
        }

        return new Response(JSON.stringify({
          success: true,
          memory: memory?.id,
          evidence: evidenceRecord?.id,
          followUps: followUps.length,
          delegations: delegations.length,
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Retrieve memories for context before execution
      case 'retrieve_context': {
        const { agentId, actionType } = body
        if (!agentId) {
          return new Response(JSON.stringify({ error: 'agentId required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const memories = await retrieveRelevantMemories(adminClient, agentId, actionType || '')

        // Extract key insights for the AI
        const successCount = memories.filter(m => m.outcome === 'success').length
        const failCount = memories.filter(m => m.outcome === 'failure').length
        const allLessons = memories.flatMap(m => m.lessons_learned || [])

        return new Response(JSON.stringify({
          memories,
          insights: {
            totalExperience: memories.length,
            successRate: memories.length > 0 ? Math.round((successCount / memories.length) * 100) : 0,
            failureRate: memories.length > 0 ? Math.round((failCount / memories.length) * 100) : 0,
            keyLessons: [...new Set(allLessons)].slice(0, 5),
            avgDuration: memories.length > 0
              ? Math.round(memories.reduce((s, m) => s + m.duration_ms, 0) / memories.length)
              : 0,
          },
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Get performance stats for an agent
      case 'agent_stats': {
        const { agentId, organizationId } = body
        if (!agentId || !organizationId) {
          return new Response(JSON.stringify({ error: 'agentId and organizationId required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const stats = await getAgentPerformanceStats(adminClient, agentId, organizationId)

        return new Response(JSON.stringify(stats), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Complete a follow-up
      case 'complete_follow_up': {
        const { followUpId, notes } = body
        const { error } = await adminClient
          .from('agent_follow_ups')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            completion_notes: notes || null,
          })
          .eq('id', followUpId)

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Complete a delegation
      case 'complete_delegation': {
        const { delegationId, result } = body
        const { error } = await adminClient
          .from('agent_delegations')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result: result || {},
          })
          .eq('id', delegationId)

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${requestAction}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('Agent intelligence error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
