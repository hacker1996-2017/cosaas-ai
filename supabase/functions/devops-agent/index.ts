import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface DevOpsCommand {
  action: 'health_check' | 'triage_error' | 'analyze_logs' | 'suggest_fix' | 'execute_fix' | 'db_health' | 'system_overview'
  context?: Record<string, unknown>
  errorMessage?: string
  functionName?: string
  autoExecute?: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await userClient.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get user's org
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: 'No organization found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const orgId = profile.organization_id
    const command: DevOpsCommand = await req.json()

    // Check kill switch
    const { data: org } = await adminClient
      .from('organizations')
      .select('kill_switch_active')
      .eq('id', orgId)
      .single()

    if (org?.kill_switch_active) {
      return new Response(JSON.stringify({ error: 'Kill switch is active. All agent operations halted.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let result: Record<string, unknown> = {}

    switch (command.action) {
      case 'system_overview':
      case 'health_check': {
        // Gather system-wide health metrics
        const [agents, commands, decisions, pipeline, emails, errors] = await Promise.all([
          adminClient.from('agents').select('id, name, status, active_tasks, quota_used, quota_max').eq('organization_id', orgId),
          adminClient.from('commands').select('id, status, created_at, error_message').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(20),
          adminClient.from('decisions').select('id, status, created_at').eq('organization_id', orgId).eq('status', 'pending'),
          adminClient.from('action_pipeline').select('id, status, error_message, action_type').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(20),
          adminClient.from('emails').select('id, status, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(10),
          adminClient.from('commands').select('id, command_text, error_message, status').eq('organization_id', orgId).eq('status', 'failed').order('created_at', { ascending: false }).limit(10),
        ])

        const agentData = agents.data || []
        const commandData = commands.data || []
        const failedCommands = errors.data || []
        const pipelineData = pipeline.data || []

        const agentHealth = {
          total: agentData.length,
          online: agentData.filter(a => a.status === 'available').length,
          busy: agentData.filter(a => a.status === 'busy').length,
          error: agentData.filter(a => a.status === 'error').length,
          overQuota: agentData.filter(a => (a.quota_used || 0) > (a.quota_max || 1500) * 0.9).length,
        }

        const commandHealth = {
          total: commandData.length,
          completed: commandData.filter(c => c.status === 'completed').length,
          failed: commandData.filter(c => c.status === 'failed').length,
          queued: commandData.filter(c => c.status === 'queued').length,
          processing: commandData.filter(c => c.status === 'processing').length,
        }

        const pipelineHealth = {
          total: pipelineData.length,
          failed: pipelineData.filter(p => p.status === 'failed').length,
          executing: pipelineData.filter(p => p.status === 'executing').length,
          pendingApproval: pipelineData.filter(p => p.status === 'pending_approval').length,
        }

        const overallScore = calculateHealthScore(agentHealth, commandHealth, pipelineHealth)

        // Use AI to generate insights
        let aiInsights = null
        if (lovableApiKey) {
          const systemData = JSON.stringify({
            agentHealth, commandHealth, pipelineHealth,
            pendingDecisions: (decisions.data || []).length,
            recentFailedCommands: failedCommands.map(c => ({ text: c.command_text, error: c.error_message })),
            recentPipelineErrors: pipelineData.filter(p => p.error_message).map(p => ({ type: p.action_type, error: p.error_message })),
          })

          try {
            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-3-flash-preview',
                messages: [
                  {
                    role: 'system',
                    content: `You are a senior DevOps engineer analyzing a multi-agent AI orchestration platform. Provide actionable, concise insights about system health. Focus on:
1. Critical issues requiring immediate attention
2. Performance bottlenecks
3. Error patterns and root causes
4. Recommendations for optimization
Keep responses structured with bullet points. Be specific and technical. Maximum 300 words.`
                  },
                  { role: 'user', content: `Analyze this system health data and provide insights:\n${systemData}` }
                ],
              }),
            })

            if (aiResponse.ok) {
              const aiData = await aiResponse.json()
              aiInsights = aiData.choices?.[0]?.message?.content || null
            }
          } catch (e) {
            console.error('AI insights error:', e)
          }
        }

        result = {
          type: 'health_report',
          timestamp: new Date().toISOString(),
          overallScore,
          status: overallScore >= 90 ? 'healthy' : overallScore >= 70 ? 'degraded' : 'critical',
          agents: agentHealth,
          commands: commandHealth,
          pipeline: pipelineHealth,
          pendingDecisions: (decisions.data || []).length,
          recentErrors: failedCommands.map(c => ({ id: c.id, text: c.command_text, error: c.error_message })),
          aiInsights,
        }

        // Log to timeline
        await adminClient.from('timeline_events').insert({
          organization_id: orgId,
          event_type: 'system_event',
          title: `DevOps Health Check: ${result.status}`,
          description: `System score: ${overallScore}/100. ${agentHealth.error} agents in error state. ${commandHealth.failed} failed commands.`,
          icon: overallScore >= 90 ? '🟢' : overallScore >= 70 ? '🟡' : '🔴',
          color: overallScore >= 90 ? 'green' : overallScore >= 70 ? 'yellow' : 'red',
          user_id: user.id,
        })

        break
      }

      case 'triage_error': {
        if (!command.errorMessage) {
          return new Response(JSON.stringify({ error: 'errorMessage is required for triage' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        if (!lovableApiKey) {
          return new Response(JSON.stringify({ error: 'AI capabilities not configured' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Gather context around the error
        const [recentCommands, recentPipeline, agentStatuses] = await Promise.all([
          adminClient.from('commands').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5),
          adminClient.from('action_pipeline').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5),
          adminClient.from('agents').select('id, name, status, active_tasks').eq('organization_id', orgId),
        ])

        const contextData = JSON.stringify({
          error: command.errorMessage,
          functionName: command.functionName,
          additionalContext: command.context,
          recentCommands: (recentCommands.data || []).map(c => ({
            text: c.command_text, status: c.status, error: c.error_message, created: c.created_at,
          })),
          recentPipeline: (recentPipeline.data || []).map(p => ({
            type: p.action_type, status: p.status, error: p.error_message,
          })),
          agents: (agentStatuses.data || []).map(a => ({
            name: a.name, status: a.status, tasks: a.active_tasks,
          })),
        })

        const triageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              {
                role: 'system',
                content: `You are a senior DevOps engineer performing error triage on a multi-agent AI platform. Your job is to:
1. Identify the root cause of the error
2. Assess severity (critical / high / medium / low)
3. Determine affected components (agents, commands, pipeline, emails, etc.)
4. Provide specific, actionable fix steps
5. Suggest preventive measures

Respond in this exact JSON structure:
{
  "severity": "critical|high|medium|low",
  "rootCause": "concise description",
  "affectedComponents": ["component1", "component2"],
  "fixSteps": ["step 1", "step 2"],
  "preventiveMeasures": ["measure 1"],
  "canAutoFix": true/false,
  "autoFixAction": "description of auto-fix if applicable",
  "riskOfAutoFix": "low|medium|high"
}`
              },
              { role: 'user', content: `Triage this error with context:\n${contextData}` }
            ],
          }),
        })

        if (!triageResponse.ok) {
          const errText = await triageResponse.text()
          console.error('AI triage error:', triageResponse.status, errText)
          return new Response(JSON.stringify({ error: 'AI triage failed' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const triageData = await triageResponse.json()
        const triageContent = triageData.choices?.[0]?.message?.content || ''

        let triage: Record<string, unknown>
        try {
          // Try to parse as JSON, strip markdown fences if present
          const cleaned = triageContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          triage = JSON.parse(cleaned)
        } catch {
          triage = { rawAnalysis: triageContent, severity: 'medium', canAutoFix: false }
        }

        // If auto-fixable and low risk, create action pipeline entry
        if (triage.canAutoFix && triage.riskOfAutoFix === 'low' && command.autoExecute !== false) {
          await adminClient.from('action_pipeline').insert({
            organization_id: orgId,
            action_type: 'devops_auto_fix',
            action_description: `Auto-fix: ${triage.autoFixAction || triage.rootCause}`,
            created_by: user.id,
            category: 'system',
            risk_level: 'low',
            requires_approval: false,
            status: 'created',
            action_params: { triage, originalError: command.errorMessage },
          })
        } else if (triage.canAutoFix) {
          // Route to Decision Center for approval
          await adminClient.from('decisions').insert({
            organization_id: orgId,
            title: `DevOps Fix: ${(triage.rootCause as string || command.errorMessage).slice(0, 100)}`,
            description: `AI has identified an auto-fixable issue.\n\nRoot cause: ${triage.rootCause}\n\nProposed fix: ${triage.autoFixAction}`,
            reasoning: JSON.stringify(triage.fixSteps),
            risk_level: triage.riskOfAutoFix === 'high' ? 'critical' : triage.riskOfAutoFix === 'medium' ? 'high' : 'medium',
            impact_if_approved: 'Error will be resolved and system stability improved',
            impact_if_rejected: 'Error will persist and may cascade to other components',
            confidence_score: 0.85,
          })
        }

        // Log to timeline
        await adminClient.from('timeline_events').insert({
          organization_id: orgId,
          event_type: 'system_event',
          title: `Error Triaged: ${(triage.severity as string || 'unknown').toUpperCase()}`,
          description: `Root cause: ${triage.rootCause || command.errorMessage}. ${triage.canAutoFix ? 'Auto-fix available.' : 'Manual intervention required.'}`,
          icon: triage.severity === 'critical' ? '🚨' : triage.severity === 'high' ? '⚠️' : '🔍',
          color: triage.severity === 'critical' ? 'red' : triage.severity === 'high' ? 'orange' : 'blue',
          user_id: user.id,
        })

        result = { type: 'triage_report', triage, originalError: command.errorMessage }
        break
      }

      case 'analyze_logs': {
        if (!lovableApiKey) {
          return new Response(JSON.stringify({ error: 'AI capabilities not configured' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Gather recent activity logs
        const [recentCommands, recentPipeline, recentTimeline, recentEmails] = await Promise.all([
          adminClient.from('commands').select('command_text, status, error_message, created_at, completed_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(25),
          adminClient.from('action_pipeline').select('action_type, action_description, status, error_message, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(25),
          adminClient.from('timeline_events').select('event_type, title, description, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(25),
          adminClient.from('emails').select('subject, status, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(10),
        ])

        const logsData = JSON.stringify({
          commands: recentCommands.data,
          pipeline: recentPipeline.data,
          timeline: recentTimeline.data,
          emails: recentEmails.data,
        })

        const logAnalysis = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              {
                role: 'system',
                content: `You are a DevOps engineer analyzing system activity logs. Identify:
1. Error patterns and frequency
2. Performance trends (slow operations, bottlenecks)
3. Anomalies in agent behavior
4. Workflow completion rates
5. Actionable recommendations

Be concise, structured, and specific. Use bullet points. Maximum 400 words.`
              },
              { role: 'user', content: `Analyze these recent system logs:\n${logsData}` }
            ],
          }),
        })

        if (!logAnalysis.ok) {
          return new Response(JSON.stringify({ error: 'Log analysis failed' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const analysisData = await logAnalysis.json()
        result = {
          type: 'log_analysis',
          analysis: analysisData.choices?.[0]?.message?.content || 'No analysis available',
          dataPoints: {
            commandsAnalyzed: (recentCommands.data || []).length,
            pipelineActionsAnalyzed: (recentPipeline.data || []).length,
            timelineEventsAnalyzed: (recentTimeline.data || []).length,
          },
        }
        break
      }

      case 'db_health': {
        // Check table sizes and recent activity
        const [clients, agents, commands, pipeline, emails] = await Promise.all([
          adminClient.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
          adminClient.from('agents').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
          adminClient.from('commands').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
          adminClient.from('action_pipeline').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
          adminClient.from('emails').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        ])

        result = {
          type: 'db_health',
          tables: {
            clients: { count: clients.count || 0 },
            agents: { count: agents.count || 0 },
            commands: { count: commands.count || 0 },
            action_pipeline: { count: pipeline.count || 0 },
            emails: { count: emails.count || 0 },
          },
          status: 'healthy',
        }
        break
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${command.action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('DevOps agent error:', error)
    return new Response(JSON.stringify({ error: 'DevOps agent error', details: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function calculateHealthScore(
  agents: { total: number; error: number; overQuota: number },
  commands: { failed: number; total: number },
  pipeline: { failed: number; total: number }
): number {
  let score = 100

  // Agent penalties
  if (agents.total > 0) {
    score -= (agents.error / agents.total) * 30
    score -= (agents.overQuota / agents.total) * 10
  }

  // Command failure rate
  if (commands.total > 0) {
    score -= (commands.failed / commands.total) * 30
  }

  // Pipeline failure rate
  if (pipeline.total > 0) {
    score -= (pipeline.failed / pipeline.total) * 20
  }

  return Math.max(0, Math.round(score))
}
