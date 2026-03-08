import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WorkflowStep {
  id: string
  workflow_id: string
  name: string
  description: string | null
  action_type: string
  action_config: Record<string, unknown>
  step_number: number
  status: string
  agent_id: string | null
  ai_assist_available: boolean
  timeout_seconds: number
  retry_count: number
  max_retries: number
}

interface AIReasoning {
  interpretation: string
  approach: string
  enrichedParams: Record<string, unknown>
  riskAssessment: string
  confidence: number
}

// ─── AI Reasoning Layer ─────────────────────────────────────────────────────
// Before each step executes, AI reads the step definition, interprets context,
// reasons about approach, and enriches execution params.
async function aiReasonAboutStep(
  step: WorkflowStep,
  workflowName: string,
  workflowDescription: string | null,
  previousStepOutputs: Array<{ stepName: string; output: Record<string, unknown>; status: string }>,
  orgContext: Record<string, unknown>,
  agentInstructions: string | null,
  supabaseUrl: string,
): Promise<AIReasoning> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!lovableApiKey) {
    return {
      interpretation: `Execute step "${step.name}" as configured.`,
      approach: 'direct_execution',
      enrichedParams: step.action_config || {},
      riskAssessment: 'low — no AI reasoning available',
      confidence: 0.5,
    }
  }

  const contextChain = previousStepOutputs.map(p =>
    `Step "${p.stepName}" → ${p.status}: ${JSON.stringify(p.output).substring(0, 300)}`
  ).join('\n')

  const systemPrompt = `You are an AI workflow execution agent inside an enterprise OS.
Your job: analyze each workflow step BEFORE execution, reason about the best approach,
and enrich the execution parameters using context from previous steps.

RULES:
- Always output valid JSON
- If a previous step produced data (client_id, email_id, etc.), wire it into this step's params
- Assess risk honestly
- If agent instructions exist, follow them strictly
- Confidence: 0.0 = uncertain, 1.0 = certain this will succeed`

  const userPrompt = `## Workflow: "${workflowName}"
${workflowDescription ? `Description: ${workflowDescription}` : ''}

## Current Step (#${step.step_number}): "${step.name}"
- Action Type: ${step.action_type}
- Description: ${step.description || 'None'}
- Current Config: ${JSON.stringify(step.action_config)}

## Agent Instructions
${agentInstructions || 'No specific instructions.'}

## Previous Step Results (context chain)
${contextChain || 'This is the first step — no prior context.'}

## Organization Context
${JSON.stringify(orgContext).substring(0, 500)}

Respond with this exact JSON structure:
{
  "interpretation": "What this step means in plain language",
  "approach": "How you plan to execute this (e.g., 'send_email_with_draft', 'update_client_status', 'generate_ai_report')",
  "enrichedParams": { ...original config merged with context from previous steps... },
  "riskAssessment": "Your honest assessment of risk",
  "confidence": 0.85
}`

  try {
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    })

    if (!aiResponse.ok) {
      console.error('AI reasoning failed:', aiResponse.status)
      return {
        interpretation: `Execute "${step.name}" with configured params.`,
        approach: 'direct_execution',
        enrichedParams: step.action_config || {},
        riskAssessment: 'unknown — AI unavailable',
        confidence: 0.5,
      }
    }

    const aiData = await aiResponse.json()
    let content = aiData.choices?.[0]?.message?.content || ''

    // Parse JSON from response (handle markdown code blocks)
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(content) as AIReasoning

    return {
      interpretation: parsed.interpretation || `Execute step: ${step.name}`,
      approach: parsed.approach || 'direct_execution',
      enrichedParams: { ...(step.action_config || {}), ...(parsed.enrichedParams || {}) },
      riskAssessment: parsed.riskAssessment || 'not assessed',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
    }
  } catch (err) {
    console.error('AI reasoning parse error:', err)
    return {
      interpretation: `Execute "${step.name}" as configured.`,
      approach: 'direct_execution',
      enrichedParams: step.action_config || {},
      riskAssessment: 'fallback — AI response not parseable',
      confidence: 0.5,
    }
  }
}

// ─── AI Workflow Generation ─────────────────────────────────────────────────
async function generateWorkflowFromNL(
  prompt: string,
  agents: Array<{ id: string; name: string; role: string; emoji: string }>,
  supabaseUrl: string,
): Promise<{
  name: string
  description: string
  trigger_type: string
  steps: Array<{
    name: string
    description: string
    action_type: string
    action_config: Record<string, unknown>
    agent_id: string | null
  }>
} | null> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!lovableApiKey) return null

  const agentList = agents.map(a => `- ${a.emoji} ${a.name} (ID: ${a.id}, Role: ${a.role})`).join('\n')

  const systemPrompt = `You are a workflow architect for an AI-powered executive OS.
Given a natural language description, generate a structured workflow with concrete, executable steps.

Available action types:
- send_email: Send an email (params: to, subject, body, client_id)
- update_client: Update client record (params: client_id, updates: {status, mrr, tags, next_follow_up})
- create_task: Create a task (params: client_id, title, description, priority, due_date)
- generate_report: AI-generated analysis (params: report_type, scope, metrics)
- notification: Send internal notification (params: title, body, priority, user_id)
- ai_analysis: Run AI analysis (params: analysis_type, data_scope, question)
- api_call: External API call (params: url, method, headers, body)
- approval_gate: Pause for human approval (params: approval_message, risk_level)
- data_update: Generic data mutation (params: table, operation, data)

Available agents:
${agentList || 'No agents configured — use null for agent_id.'}

Trigger types: manual, on_client_created, on_email_received, on_schedule, on_event

RULES:
- Each step MUST have meaningful action_config params
- Assign the most relevant agent to each step
- Include approval_gate steps for high-risk operations
- Output ONLY valid JSON, no markdown`

  try {
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a workflow for: "${prompt}"\n\nRespond with JSON: { "name": "...", "description": "...", "trigger_type": "...", "steps": [{ "name": "...", "description": "...", "action_type": "...", "action_config": {...}, "agent_id": "..." or null }] }` },
        ],
        temperature: 0.4,
      }),
    })

    if (!aiResponse.ok) return null

    const aiData = await aiResponse.json()
    let content = aiData.choices?.[0]?.message?.content || ''
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    return JSON.parse(content)
  } catch (err) {
    console.error('Workflow generation failed:', err)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    const body = await req.json()
    const { action, workflowId, stepId, prompt } = body

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get user org
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'No organization found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orgId = profile.organization_id

    // ── ACTION: generate — AI creates a workflow from natural language ──────
    if (action === 'generate') {
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: 'prompt is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch available agents
      const { data: agents } = await adminClient
        .from('agents')
        .select('id, name, role, emoji')
        .eq('organization_id', orgId)

      const generated = await generateWorkflowFromNL(prompt, agents || [], supabaseUrl)

      if (!generated) {
        return new Response(
          JSON.stringify({ error: 'Failed to generate workflow from description' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create workflow
      const { data: workflow, error: wfError } = await adminClient
        .from('workflows')
        .insert({
          organization_id: orgId,
          created_by: user.id,
          name: generated.name,
          description: generated.description,
          trigger_type: generated.trigger_type || 'manual',
          is_active: true,
        })
        .select()
        .single()

      if (wfError || !workflow) {
        return new Response(
          JSON.stringify({ error: wfError?.message || 'Failed to create workflow' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create steps
      if (generated.steps?.length > 0) {
        const stepsToInsert = generated.steps.map((step, index) => ({
          workflow_id: workflow.id,
          name: step.name,
          description: step.description || null,
          action_type: step.action_type,
          action_config: step.action_config || {},
          step_number: index + 1,
          agent_id: step.agent_id || null,
          ai_assist_available: true,
        }))

        await adminClient.from('workflow_steps').insert(stepsToInsert)
      }

      // Audit
      const prevHash = await getLatestHash(adminClient, orgId)
      const seqNum = await getNextSequence(adminClient, orgId)
      const eventHash = generateHash(orgId, 'workflow_generation', 'ai_generate', { prompt, steps: generated.steps?.length }, prevHash, new Date())

      await adminClient.from('audit_log').insert({
        organization_id: orgId,
        sequence_number: seqNum,
        event_type: 'workflow_generation',
        actor_id: user.id,
        actor_type: 'user',
        resource_type: 'workflow',
        resource_id: workflow.id,
        action: 'ai_generate',
        details: { prompt, generated_name: generated.name, steps_count: generated.steps?.length || 0 },
        previous_hash: prevHash,
        event_hash: eventHash,
      })

      return new Response(
        JSON.stringify({
          success: true,
          workflow: { ...workflow, steps: generated.steps },
          generated,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── ACTION: execute — Run entire workflow with AI reasoning ─────────────
    if (action === 'execute') {
      if (!workflowId) {
        return new Response(
          JSON.stringify({ error: 'workflowId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch workflow
      const { data: workflow, error: wfError } = await adminClient
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('organization_id', orgId)
        .single()

      if (wfError || !workflow) {
        return new Response(
          JSON.stringify({ error: 'Workflow not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check kill switch
      const { data: org } = await adminClient
        .from('organizations')
        .select('kill_switch_active, autonomy_level, industry, market')
        .eq('id', orgId)
        .single()

      if (org?.kill_switch_active) {
        return new Response(
          JSON.stringify({ error: 'Kill switch is active. Cannot execute workflows.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch steps ordered
      const { data: steps, error: stepsError } = await adminClient
        .from('workflow_steps')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('step_number', { ascending: true })

      if (stepsError || !steps || steps.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No steps found for workflow' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Reset all steps
      await adminClient
        .from('workflow_steps')
        .update({ status: 'not_started', retry_count: 0 })
        .eq('workflow_id', workflowId)

      // Create parent command
      const { data: command } = await adminClient
        .from('commands')
        .insert({
          organization_id: orgId,
          user_id: user.id,
          command_text: `Execute workflow: ${workflow.name}`,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          parsed_intent: {
            primaryIntent: `Executing workflow "${workflow.name}" with ${steps.length} steps (AI-reasoned)`,
            category: 'workflow',
            entities: [],
            suggestedAgents: [],
            estimatedComplexity: steps.length > 5 ? 'high' : steps.length > 2 ? 'medium' : 'low',
            requiresDecision: false,
            clarificationNeeded: false,
          },
          risk_level: 'medium',
        })
        .select()
        .single()

      // Org context for AI reasoning
      const orgContext = {
        industry: org?.industry || 'general',
        market: org?.market || 'global',
        autonomy_level: org?.autonomy_level || 'draft_actions',
      }

      // Execute steps sequentially with AI reasoning + context chaining
      const stepResults: Array<{
        stepId: string
        stepName: string
        stepNumber: number
        status: string
        actionPipelineId?: string
        duration_ms: number
        error?: string
        aiReasoning?: AIReasoning
        output?: Record<string, unknown>
      }> = []

      const previousOutputs: Array<{ stepName: string; output: Record<string, unknown>; status: string }> = []

      let workflowFailed = false

      for (const step of steps as WorkflowStep[]) {
        if (workflowFailed) {
          await adminClient
            .from('workflow_steps')
            .update({ status: 'failed' })
            .eq('id', step.id)

          stepResults.push({
            stepId: step.id,
            stepName: step.name,
            stepNumber: step.step_number,
            status: 'cancelled',
            duration_ms: 0,
            error: 'Cancelled due to previous step failure',
          })
          continue
        }

        const stepStart = Date.now()

        // Mark as in_progress
        await adminClient
          .from('workflow_steps')
          .update({ status: 'in_progress' })
          .eq('id', step.id)

        // ── AI REASONING PHASE ──────────────────────────────────────────────
        // Fetch agent instructions if assigned
        let agentInstructions: string | null = null
        if (step.agent_id) {
          const { data: instructions } = await adminClient
            .from('agent_instructions')
            .select('instructions')
            .eq('agent_id', step.agent_id)
            .eq('is_active', true)
            .order('priority', { ascending: false })
            .limit(1)
            .single()

          agentInstructions = instructions?.instructions || null
        }

        const reasoning = await aiReasonAboutStep(
          step,
          workflow.name,
          workflow.description,
          previousOutputs,
          orgContext,
          agentInstructions,
          supabaseUrl,
        )

        console.log(`[Workflow ${workflow.name}] Step ${step.step_number} AI reasoning:`, JSON.stringify(reasoning))

        // ── EXECUTION PHASE ─────────────────────────────────────────────────
        const actionCategory = mapActionType(step.action_type)
        const { data: pipelineAction, error: pipelineError } = await adminClient
          .from('action_pipeline')
          .insert({
            organization_id: orgId,
            command_id: command?.id || null,
            agent_id: step.agent_id,
            created_by: user.id,
            category: actionCategory,
            action_type: step.action_type,
            action_description: `[${workflow.name}] Step ${step.step_number}: ${step.name} — ${reasoning.interpretation}`,
            action_params: {
              ...reasoning.enrichedParams,
              _ai_reasoning: {
                interpretation: reasoning.interpretation,
                approach: reasoning.approach,
                risk: reasoning.riskAssessment,
                confidence: reasoning.confidence,
              },
              _context_chain: previousOutputs.map(p => ({ step: p.stepName, status: p.status })),
            },
            risk_level: reasoning.confidence < 0.5 ? 'high' : reasoning.confidence < 0.7 ? 'medium' : 'low',
            status: 'created',
            requires_approval: step.action_type === 'approval_gate' || reasoning.confidence < 0.4,
            idempotency_key: `wf-${workflowId}-step-${step.id}-${Date.now()}`,
          })
          .select()
          .single()

        if (pipelineError || !pipelineAction) {
          workflowFailed = true
          await adminClient
            .from('workflow_steps')
            .update({ status: 'failed' })
            .eq('id', step.id)

          stepResults.push({
            stepId: step.id,
            stepName: step.name,
            stepNumber: step.step_number,
            status: 'failed',
            duration_ms: Date.now() - stepStart,
            error: pipelineError?.message || 'Failed to create pipeline action',
            aiReasoning: reasoning,
          })
          continue
        }

        // Policy evaluation
        try {
          const evalResponse = await fetch(`${supabaseUrl}/functions/v1/evaluate-action`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ actionId: pipelineAction.id }),
          })

          if (evalResponse.ok) {
            const evalResult = await evalResponse.json()

            if (evalResult.evaluation?.blocked) {
              workflowFailed = true
              await adminClient
                .from('workflow_steps')
                .update({ status: 'failed' })
                .eq('id', step.id)

              stepResults.push({
                stepId: step.id,
                stepName: step.name,
                stepNumber: step.step_number,
                status: 'blocked',
                actionPipelineId: pipelineAction.id,
                duration_ms: Date.now() - stepStart,
                error: evalResult.evaluation?.block_reason || 'Blocked by policy',
                aiReasoning: reasoning,
              })
              continue
            }

            if (evalResult.status === 'pending_approval' || step.action_type === 'approval_gate') {
              await adminClient
                .from('workflow_steps')
                .update({ status: 'in_progress' })
                .eq('id', step.id)

              stepResults.push({
                stepId: step.id,
                stepName: step.name,
                stepNumber: step.step_number,
                status: 'pending_approval',
                actionPipelineId: pipelineAction.id,
                duration_ms: Date.now() - stepStart,
                aiReasoning: reasoning,
              })

              workflowFailed = true
              continue
            }
          }
        } catch (evalError) {
          console.error('Policy evaluation error for step:', evalError)
        }

        // Dispatch
        try {
          await adminClient
            .from('action_pipeline')
            .update({
              status: 'approved',
              approved_by: user.id,
              approved_at: new Date().toISOString(),
              approval_notes: `Auto-approved. AI confidence: ${(reasoning.confidence * 100).toFixed(0)}%. Approach: ${reasoning.approach}`,
            })
            .eq('id', pipelineAction.id)

          const dispatchResponse = await fetch(`${supabaseUrl}/functions/v1/dispatch-action`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ actionId: pipelineAction.id }),
          })

          const dispatchResult = await dispatchResponse.json()

          if (dispatchResult.success) {
            await adminClient
              .from('workflow_steps')
              .update({ status: 'completed' })
              .eq('id', step.id)

            const output = dispatchResult.outputData || dispatchResult.evidence || {}
            previousOutputs.push({ stepName: step.name, output, status: 'completed' })

            stepResults.push({
              stepId: step.id,
              stepName: step.name,
              stepNumber: step.step_number,
              status: 'completed',
              actionPipelineId: pipelineAction.id,
              duration_ms: Date.now() - stepStart,
              aiReasoning: reasoning,
              output,
            })
          } else {
            const retryable = (step.retry_count || 0) < (step.max_retries || 3)
            await adminClient
              .from('workflow_steps')
              .update({ status: 'failed', retry_count: (step.retry_count || 0) + 1 })
              .eq('id', step.id)

            previousOutputs.push({ stepName: step.name, output: { error: dispatchResult.error }, status: 'failed' })

            stepResults.push({
              stepId: step.id,
              stepName: step.name,
              stepNumber: step.step_number,
              status: 'failed',
              actionPipelineId: pipelineAction.id,
              duration_ms: Date.now() - stepStart,
              error: dispatchResult.error || 'Dispatch failed',
              aiReasoning: reasoning,
            })

            if (!retryable) workflowFailed = true
          }
        } catch (dispatchError) {
          workflowFailed = true
          await adminClient
            .from('workflow_steps')
            .update({ status: 'failed' })
            .eq('id', step.id)

          previousOutputs.push({ stepName: step.name, output: { error: (dispatchError as Error).message }, status: 'failed' })

          stepResults.push({
            stepId: step.id,
            stepName: step.name,
            stepNumber: step.step_number,
            status: 'failed',
            duration_ms: Date.now() - stepStart,
            error: (dispatchError as Error).message,
            aiReasoning: reasoning,
          })
        }
      }

      // Update workflow execution metadata
      const allCompleted = stepResults.every(s => s.status === 'completed')
      const hasPending = stepResults.some(s => s.status === 'pending_approval')
      const totalDuration = Date.now() - startTime

      await adminClient
        .from('workflows')
        .update({
          execution_count: (workflow.execution_count || 0) + 1,
          last_executed_at: new Date().toISOString(),
        })
        .eq('id', workflowId)

      // Update parent command
      if (command) {
        await adminClient
          .from('commands')
          .update({
            status: allCompleted ? 'completed' : hasPending ? 'in_progress' : 'failed',
            completed_at: allCompleted ? new Date().toISOString() : null,
            actual_duration_ms: totalDuration,
            result: {
              workflow_id: workflowId,
              workflow_name: workflow.name,
              steps_total: steps.length,
              steps_completed: stepResults.filter(s => s.status === 'completed').length,
              steps_failed: stepResults.filter(s => s.status === 'failed').length,
              steps_pending: stepResults.filter(s => s.status === 'pending_approval').length,
              ai_reasoned: true,
              context_chain_depth: previousOutputs.length,
            },
          })
          .eq('id', command.id)
      }

      // Timeline event
      await adminClient
        .from('timeline_events')
        .insert({
          organization_id: orgId,
          event_type: 'ai_action',
          title: `Workflow ${allCompleted ? 'completed' : hasPending ? 'paused' : 'failed'}: ${workflow.name}`,
          description: `${stepResults.filter(s => s.status === 'completed').length}/${steps.length} steps completed in ${totalDuration}ms. AI-reasoned execution with ${previousOutputs.length}-step context chain.`,
          command_id: command?.id,
          user_id: user.id,
          icon: allCompleted ? '🔄' : hasPending ? '⏸️' : '💥',
          color: allCompleted ? 'green' : hasPending ? 'orange' : 'red',
        })

      // Audit log
      const prevHash = await getLatestHash(adminClient, orgId)
      const seqNum = await getNextSequence(adminClient, orgId)
      const eventHash = generateHash(orgId, 'workflow_execution', 'execute', { workflowId, steps: steps.length, ai_reasoned: true }, prevHash, new Date())

      await adminClient
        .from('audit_log')
        .insert({
          organization_id: orgId,
          sequence_number: seqNum,
          event_type: 'workflow_execution',
          actor_id: user.id,
          actor_type: 'user',
          resource_type: 'workflow',
          resource_id: workflowId,
          action: 'execute',
          details: {
            workflow_name: workflow.name,
            total_steps: steps.length,
            completed: stepResults.filter(s => s.status === 'completed').length,
            failed: stepResults.filter(s => s.status === 'failed').length,
            duration_ms: totalDuration,
            ai_reasoned: true,
            reasoning_summary: stepResults.map(s => ({
              step: s.stepName,
              status: s.status,
              confidence: s.aiReasoning?.confidence,
              approach: s.aiReasoning?.approach,
            })),
          },
          previous_hash: prevHash,
          event_hash: eventHash,
        })

      return new Response(
        JSON.stringify({
          success: allCompleted,
          workflowId,
          workflowName: workflow.name,
          status: allCompleted ? 'completed' : hasPending ? 'paused_approval' : 'failed',
          stepResults,
          duration_ms: totalDuration,
          contextChainDepth: previousOutputs.length,
          aiReasoned: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── ACTION: execute_step — Run a single step with AI reasoning ──────────
    if (action === 'execute_step') {
      if (!stepId) {
        return new Response(
          JSON.stringify({ error: 'stepId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: step } = await adminClient
        .from('workflow_steps')
        .select('*, workflows!inner(organization_id, name, description)')
        .eq('id', stepId)
        .single()

      if (!step || (step.workflows as { organization_id: string }).organization_id !== orgId) {
        return new Response(
          JSON.stringify({ error: 'Step not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const wfMeta = step.workflows as { organization_id: string; name: string; description: string | null }

      // Get org context
      const { data: org } = await adminClient
        .from('organizations')
        .select('industry, market, autonomy_level')
        .eq('id', orgId)
        .single()

      // Get agent instructions
      let agentInstructions: string | null = null
      if (step.agent_id) {
        const { data: instructions } = await adminClient
          .from('agent_instructions')
          .select('instructions')
          .eq('agent_id', step.agent_id)
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .limit(1)
          .single()
        agentInstructions = instructions?.instructions || null
      }

      // AI Reasoning
      const reasoning = await aiReasonAboutStep(
        step as WorkflowStep,
        wfMeta.name,
        wfMeta.description,
        [], // No prior context for single step execution
        { industry: org?.industry, market: org?.market, autonomy_level: org?.autonomy_level },
        agentInstructions,
        supabaseUrl,
      )

      // Create and dispatch action
      const { data: pipelineAction } = await adminClient
        .from('action_pipeline')
        .insert({
          organization_id: orgId,
          agent_id: step.agent_id,
          created_by: user.id,
          category: mapActionType(step.action_type),
          action_type: step.action_type,
          action_description: `[${wfMeta.name}] Step ${step.step_number}: ${step.name} — ${reasoning.interpretation}`,
          action_params: {
            ...reasoning.enrichedParams,
            _ai_reasoning: {
              interpretation: reasoning.interpretation,
              approach: reasoning.approach,
              risk: reasoning.riskAssessment,
              confidence: reasoning.confidence,
            },
          },
          risk_level: reasoning.confidence < 0.5 ? 'high' : 'low',
          status: 'approved',
          requires_approval: false,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_notes: `AI confidence: ${(reasoning.confidence * 100).toFixed(0)}%`,
          idempotency_key: `wf-step-${stepId}-${Date.now()}`,
        })
        .select()
        .single()

      if (!pipelineAction) {
        return new Response(
          JSON.stringify({ error: 'Failed to create action' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Dispatch
      const dispatchResponse = await fetch(`${supabaseUrl}/functions/v1/dispatch-action`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ actionId: pipelineAction.id }),
      })

      const dispatchResult = await dispatchResponse.json()

      await adminClient
        .from('workflow_steps')
        .update({ status: dispatchResult.success ? 'completed' : 'failed' })
        .eq('id', stepId)

      return new Response(
        JSON.stringify({
          success: dispatchResult.success,
          stepId,
          actionPipelineId: pipelineAction.id,
          result: dispatchResult,
          aiReasoning: reasoning,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: execute, execute_step, generate' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Workflow engine error:', error)
    return new Response(
      JSON.stringify({ error: 'Workflow execution failed', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function mapActionType(actionType: string): string {
  const map: Record<string, string> = {
    'send_email': 'communication',
    'update_client': 'data_mutation',
    'create_task': 'scheduling',
    'generate_report': 'reporting',
    'api_call': 'integration',
    'notification': 'communication',
    'data_update': 'data_mutation',
    'approval_gate': 'system',
    'ai_analysis': 'reporting',
  }
  return map[actionType] || 'system'
}

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
