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
    const { action, workflowId, stepId } = body

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

    // ── ACTION: execute — Run entire workflow step-by-step ──────────────────
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
        .select('kill_switch_active')
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

      // Reset all steps to not_started
      await adminClient
        .from('workflow_steps')
        .update({ status: 'not_started', retry_count: 0 })
        .eq('workflow_id', workflowId)

      // Create a parent command for the workflow execution
      const { data: command } = await adminClient
        .from('commands')
        .insert({
          organization_id: orgId,
          user_id: user.id,
          command_text: `Execute workflow: ${workflow.name}`,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          parsed_intent: {
            primaryIntent: `Executing workflow "${workflow.name}" with ${steps.length} steps`,
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

      // Execute steps sequentially
      const stepResults: Array<{
        stepId: string
        stepName: string
        stepNumber: number
        status: string
        actionPipelineId?: string
        duration_ms: number
        error?: string
      }> = []

      let workflowFailed = false

      for (const step of steps as WorkflowStep[]) {
        if (workflowFailed) {
          // Mark remaining steps as cancelled
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

        // Mark step as in_progress
        await adminClient
          .from('workflow_steps')
          .update({ status: 'in_progress' })
          .eq('id', step.id)

        // Create action_pipeline entry for this step
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
            action_description: `[${workflow.name}] Step ${step.step_number}: ${step.name}`,
            action_params: {
              workflow_id: workflowId,
              workflow_name: workflow.name,
              step_id: step.id,
              step_number: step.step_number,
              ...(step.action_config || {}),
            },
            risk_level: 'low',
            status: 'created',
            requires_approval: false, // Workflow steps auto-execute
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
          })
          continue
        }

        // Run policy evaluation
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

            // If blocked, mark step as failed
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
              })
              continue
            }

            // If requires approval, pause workflow (don't fail)
            if (evalResult.status === 'pending_approval') {
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
              })

              // Pause — remaining steps wait for approval
              workflowFailed = true // Stop executing further steps
              continue
            }
          } else {
            const errText = await evalResponse.text()
            console.error('Policy evaluation failed for step:', errText)
          }
        } catch (evalError) {
          console.error('Error calling evaluate-action for step:', evalError)
        }

        // Dispatch the action
        try {
          // Auto-approve it first (workflow steps are pre-approved)
          await adminClient
            .from('action_pipeline')
            .update({
              status: 'approved',
              approved_by: user.id,
              approved_at: new Date().toISOString(),
              approval_notes: `Auto-approved as part of workflow "${workflow.name}"`,
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

            stepResults.push({
              stepId: step.id,
              stepName: step.name,
              stepNumber: step.step_number,
              status: 'completed',
              actionPipelineId: pipelineAction.id,
              duration_ms: Date.now() - stepStart,
            })
          } else {
            // Check if retryable
            const retryable = (step.retry_count || 0) < (step.max_retries || 3)
            if (retryable) {
              await adminClient
                .from('workflow_steps')
                .update({ status: 'failed', retry_count: (step.retry_count || 0) + 1 })
                .eq('id', step.id)
            } else {
              workflowFailed = true
              await adminClient
                .from('workflow_steps')
                .update({ status: 'failed' })
                .eq('id', step.id)
            }

            stepResults.push({
              stepId: step.id,
              stepName: step.name,
              stepNumber: step.step_number,
              status: 'failed',
              actionPipelineId: pipelineAction.id,
              duration_ms: Date.now() - stepStart,
              error: dispatchResult.error || 'Dispatch failed',
            })

            if (!retryable) workflowFailed = true
          }
        } catch (dispatchError) {
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
            error: (dispatchError as Error).message,
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
          description: `${stepResults.filter(s => s.status === 'completed').length}/${steps.length} steps completed in ${totalDuration}ms.${hasPending ? ' Awaiting approval for next step.' : ''}`,
          command_id: command?.id,
          user_id: user.id,
          icon: allCompleted ? '🔄' : hasPending ? '⏸️' : '💥',
          color: allCompleted ? 'green' : hasPending ? 'orange' : 'red',
        })

      // Audit log
      const prevHash = await getLatestHash(adminClient, orgId)
      const seqNum = await getNextSequence(adminClient, orgId)
      const eventHash = generateHash(orgId, 'workflow_execution', 'execute', { workflowId, steps: steps.length }, prevHash, new Date())

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
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── ACTION: execute_step — Run a single step ───────────────────────────
    if (action === 'execute_step') {
      if (!stepId) {
        return new Response(
          JSON.stringify({ error: 'stepId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: step } = await adminClient
        .from('workflow_steps')
        .select('*, workflows!inner(organization_id, name)')
        .eq('id', stepId)
        .single()

      if (!step || (step.workflows as { organization_id: string }).organization_id !== orgId) {
        return new Response(
          JSON.stringify({ error: 'Step not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create and dispatch a single action for this step
      const { data: pipelineAction } = await adminClient
        .from('action_pipeline')
        .insert({
          organization_id: orgId,
          agent_id: step.agent_id,
          created_by: user.id,
          category: mapActionType(step.action_type),
          action_type: step.action_type,
          action_description: `[${(step.workflows as { name: string }).name}] Step ${step.step_number}: ${step.name}`,
          action_params: step.action_config || {},
          risk_level: 'low',
          status: 'approved',
          requires_approval: false,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
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
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: execute, execute_step' }),
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
