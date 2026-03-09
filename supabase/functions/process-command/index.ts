import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CommandContext {
  commandId: string;
  commandText: string;
  organizationId: string;
  userId: string;
  organization: {
    name: string;
    industry: string | null;
    market: string | null;
    autonomyLevel: string;
  };
  agents: Array<{
    id: string;
    name: string;
    role: string;
    emoji: string;
    status: string;
  }>;
  recentCommands: Array<{
    command_text: string;
    status: string;
  }>;
  clientCount: number;
  clientSample: Array<{ name: string; email: string | null; status: string | null }>;
}

interface ParsedIntent {
  primaryIntent: string;
  category: 'client_management' | 'communication' | 'analysis' | 'scheduling' | 'workflow' | 'reporting' | 'other';
  entities: Array<{ type: string; value: string }>;
  suggestedAgents: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  requiresDecision: boolean;
  clarificationNeeded: boolean;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
  executionPlan?: string[];
}

function mapIntentCategoryToActionCategory(category: string): string {
  const map: Record<string, string> = {
    'client_management': 'data_mutation',
    'communication': 'communication',
    'analysis': 'reporting',
    'scheduling': 'scheduling',
    'workflow': 'system',
    'reporting': 'reporting',
    'other': 'system',
  }
  return map[category] || 'system'
}

function mapComplexityToRisk(complexity: string, requiresDecision: boolean): string {
  if (requiresDecision && complexity === 'high') return 'critical'
  if (complexity === 'high') return 'high'
  if (complexity === 'medium') return 'medium'
  return 'low'
}

interface StrategicAnalysis {
  title: string;
  description: string;
  reasoning: string;
  confidenceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  impactIfApproved: string;
  impactIfRejected: string;
  financialImpact?: string;
  secondOrderEffects: string[];
  assumptions: string[];
}

function extractJsonFromResponse(content: string): unknown | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      let cleaned = jsonMatch[0]
      try { return JSON.parse(cleaned) } catch {
        cleaned = cleaned
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/[\x00-\x1F\x7F]/g, '')
        return JSON.parse(cleaned)
      }
    }
  } catch (e) {
    console.error('JSON extraction failed:', e)
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!

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

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI Gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { commandId, userResponse } = await req.json()

    if (!commandId) {
      return new Response(
        JSON.stringify({ error: 'Command ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // ─── CONTINUATION FLOW: User responding to a clarification ──────────
    if (userResponse) {
      return await handleClarificationResponse(
        adminClient, lovableApiKey, supabaseUrl, authHeader, user.id, commandId, userResponse
      )
    }

    // ─── NEW COMMAND FLOW ───────────────────────────────────────────────
    const context = await buildCommandContext(adminClient, commandId, user.id)
    if (!context) {
      return new Response(
        JSON.stringify({ error: 'Command not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update status
    await adminClient
      .from('commands')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', commandId)

    // Parse intent with AI
    const parsedIntent = await parseCommandIntent(lovableApiKey, context)

    await adminClient
      .from('commands')
      .update({
        parsed_intent: parsedIntent,
        confidence_score: parsedIntent.clarificationNeeded ? 0.6 : 0.85,
        risk_level: parsedIntent.estimatedComplexity === 'high' ? 'high' :
          parsedIntent.estimatedComplexity === 'medium' ? 'medium' : 'low'
      })
      .eq('id', commandId)

    // ─── CLARIFICATION BRANCH ───────────────────────────────────────────
    if (parsedIntent.clarificationNeeded) {
      const aiMessage = await generateConversationalResponse(
        lovableApiKey, context, parsedIntent, null, 'clarification'
      )

      await adminClient
        .from('commands')
        .update({
          status: 'in_progress',
          result: {
            awaiting_clarification: true,
            ai_message: aiMessage.message,
            ai_message_type: 'clarification',
            clarification_question: parsedIntent.clarificationQuestion,
            clarification_options: aiMessage.options || parsedIntent.clarificationOptions || [],
            execution_plan: aiMessage.executionPlan || [],
          }
        })
        .eq('id', commandId)

      return new Response(
        JSON.stringify({
          success: true,
          parsedIntent,
          status: 'awaiting_clarification',
          aiResponse: {
            message: aiMessage.message,
            type: 'clarification',
            options: aiMessage.options || [],
            executionPlan: aiMessage.executionPlan || [],
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─── EXECUTION FLOW ─────────────────────────────────────────────────
    return await executeCommand(
      adminClient, lovableApiKey, supabaseUrl, authHeader, user.id,
      commandId, context, parsedIntent
    )
  } catch (error) {
    console.error('Error processing command:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process command', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─── Handle user's response to clarification ────────────────────────────────
// deno-lint-ignore no-explicit-any
async function handleClarificationResponse(
  adminClient: any, apiKey: string, supabaseUrl: string, authHeader: string,
  userId: string, commandId: string, userResponse: string
) {
  const { data: command } = await adminClient
    .from('commands')
    .select('*')
    .eq('id', commandId)
    .single()

  if (!command) {
    return new Response(
      JSON.stringify({ error: 'Command not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Build context with the additional user response
  const context = await buildCommandContext(adminClient, commandId, userId)
  if (!context) {
    return new Response(
      JSON.stringify({ error: 'Context build failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Enrich the command text with the clarification answer
  const enrichedCommand = `${command.command_text}\n\nAdditional details: ${userResponse}`
  context.commandText = enrichedCommand

  // Re-parse with enriched context (force no clarification this time)
  const parsedIntent = await parseCommandIntent(apiKey, context, true)

  await adminClient
    .from('commands')
    .update({
      parsed_intent: parsedIntent,
      confidence_score: 0.9,
      result: {
        ...(command.result || {}),
        awaiting_clarification: false,
        user_clarification: userResponse,
      }
    })
    .eq('id', commandId)

  return await executeCommand(
    adminClient, apiKey, supabaseUrl, authHeader, userId,
    commandId, context, parsedIntent
  )
}

// ─── Core execution flow ────────────────────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function executeCommand(
  adminClient: any, apiKey: string, supabaseUrl: string, authHeader: string,
  userId: string, commandId: string, context: CommandContext, parsedIntent: ParsedIntent
) {
  // Assign agent
  const assignedAgent = selectBestAgent(context.agents, parsedIntent)
  if (assignedAgent) {
    await adminClient.from('commands').update({ agent_id: assignedAgent.id }).eq('id', commandId)
    await adminClient.from('agents').update({ status: 'busy', active_tasks: 1 }).eq('id', assignedAgent.id)
  }

  // Create action_pipeline entry
  const actionCategory = mapIntentCategoryToActionCategory(parsedIntent.category)
  const riskLevel = mapComplexityToRisk(parsedIntent.estimatedComplexity, parsedIntent.requiresDecision)

  const { data: pipelineAction, error: pipelineError } = await adminClient
    .from('action_pipeline')
    .insert({
      organization_id: context.organizationId,
      command_id: commandId,
      agent_id: assignedAgent?.id || null,
      created_by: userId,
      category: actionCategory,
      action_type: parsedIntent.category,
      action_description: parsedIntent.primaryIntent,
      action_params: {
        original_command: context.commandText,
        entities: parsedIntent.entities,
        suggested_agents: parsedIntent.suggestedAgents,
        complexity: parsedIntent.estimatedComplexity,
        execution_plan: parsedIntent.executionPlan || [],
      },
      risk_level: riskLevel,
      status: 'created',
      requires_approval: parsedIntent.requiresDecision,
      idempotency_key: `cmd-${commandId}`,
    })
    .select()
    .single()

  if (pipelineError) {
    throw new Error(`Action pipeline creation failed: ${pipelineError.message}`)
  }

  // Evaluate action via policy engine
  let evaluationResult = null
  try {
    const evalResponse = await fetch(`${supabaseUrl}/functions/v1/evaluate-action`, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId: pipelineAction.id }),
    })
    if (evalResponse.ok) {
      evaluationResult = await evalResponse.json()
    }
  } catch (evalError) {
    console.error('Policy evaluation error:', evalError)
  }

  const finalStatus = evaluationResult?.status || 'pending_approval'
  let decision = null

  // Create decision if needed
  if (finalStatus === 'pending_approval' || parsedIntent.requiresDecision) {
    const analysis = await generateStrategicAnalysis(apiKey, context, parsedIntent)
    const { data: decisionData } = await adminClient
      .from('decisions')
      .insert({
        organization_id: context.organizationId,
        command_id: commandId,
        agent_id: assignedAgent?.id,
        title: analysis.title,
        description: analysis.description,
        reasoning: analysis.reasoning,
        confidence_score: analysis.confidenceScore,
        risk_level: analysis.riskLevel,
        impact_if_approved: analysis.impactIfApproved,
        impact_if_rejected: analysis.impactIfRejected,
        financial_impact: analysis.financialImpact,
        status: 'pending',
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()
    decision = decisionData
  }

  // Timeline event
  await adminClient
    .from('timeline_events')
    .insert({
      organization_id: context.organizationId,
      event_type: 'ai_action',
      title: `Command routed: "${context.commandText.substring(0, 50)}${context.commandText.length > 50 ? '...' : ''}"`,
      description: `Routed → ${finalStatus}. Agent: ${assignedAgent?.name || 'Chief of Staff'}.${decision ? ' Decision pending.' : ''}`,
      command_id: commandId,
      agent_id: assignedAgent?.id,
      user_id: userId,
      icon: finalStatus === 'approved' ? '✅' : '⚖️',
      color: finalStatus === 'approved' ? 'green' : 'orange',
      confidence_score: 0.85,
    })

  // Auto-dispatch if approved
  let dispatchResult = null
  if (!decision && finalStatus === 'approved') {
    try {
      const dispatchResponse = await fetch(`${supabaseUrl}/functions/v1/dispatch-action`, {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: pipelineAction.id }),
      })
      dispatchResult = await dispatchResponse.json()
    } catch (dispatchError) {
      console.error('Auto-dispatch failed:', dispatchError)
    }
  }

  // Reset agent
  if (assignedAgent && !decision) {
    await adminClient.from('agents').update({ status: 'available', active_tasks: 0 }).eq('id', assignedAgent.id)
  }

  // ─── GENERATE RICH AI RESPONSE ────────────────────────────────────────
  const responseType = decision ? 'pending_decision'
    : dispatchResult?.success ? 'execution_complete'
    : 'routed'

  const aiResponse = await generateConversationalResponse(
    apiKey, context, parsedIntent, dispatchResult, responseType
  )

  // Store rich result on the command
  const richResult: Record<string, unknown> = {
    ai_message: aiResponse.message,
    ai_message_type: responseType,
    execution_steps: aiResponse.executionSteps || [],
    action_pipeline_id: pipelineAction.id,
    awaiting_clarification: false,
  }

  if (dispatchResult?.success) {
    richResult.execution_result = dispatchResult.outputData || dispatchResult.evidence || {}
    richResult.evidence_collected = true
    richResult.duration_ms = dispatchResult.duration_ms
  }

  if (decision) {
    richResult.decision_id = decision.id
    richResult.decision_title = decision.title
  }

  // If this was a report, include the report content
  if (dispatchResult?.outputData?.report) {
    richResult.report_content = dispatchResult.outputData.report
    richResult.report_stats = dispatchResult.outputData.stats
  }

  await adminClient
    .from('commands')
    .update({
      status: dispatchResult?.success ? 'completed' : decision ? 'in_progress' : 'queued',
      completed_at: dispatchResult?.success ? new Date().toISOString() : null,
      result: richResult,
    })
    .eq('id', commandId)

  return new Response(
    JSON.stringify({
      success: true,
      parsedIntent,
      assignedAgent: assignedAgent ? { id: assignedAgent.id, name: assignedAgent.name } : null,
      decision: decision ? { id: decision.id, title: decision.title } : null,
      pipelineAction: { id: pipelineAction.id, status: finalStatus },
      dispatched: !!dispatchResult,
      executionResult: dispatchResult || null,
      status: responseType === 'execution_complete' ? 'executed'
        : responseType === 'pending_decision' ? 'pending_decision'
        : finalStatus === 'approved' ? 'approved' : 'routed',
      aiResponse: {
        message: aiResponse.message,
        type: responseType,
        executionSteps: aiResponse.executionSteps || [],
      },
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// ─── Build context ──────────────────────────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function buildCommandContext(client: any, commandId: string, userId: string): Promise<CommandContext | null> {
  const { data: command } = await client.from('commands').select('*').eq('id', commandId).single()
  if (!command) return null

  const { data: org } = await client.from('organizations').select('*').eq('id', command.organization_id).single()
  if (!org) return null

  const [agentsRes, recentRes, clientCountRes, clientSampleRes] = await Promise.all([
    client.from('agents').select('id, name, role, emoji, status').eq('organization_id', command.organization_id),
    client.from('commands').select('command_text, status').eq('organization_id', command.organization_id).order('created_at', { ascending: false }).limit(5),
    client.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', command.organization_id),
    client.from('clients').select('name, email, status').eq('organization_id', command.organization_id).limit(10),
  ])

  return {
    commandId: command.id,
    commandText: command.command_text,
    organizationId: command.organization_id,
    userId,
    organization: {
      name: org.name,
      industry: org.industry,
      market: org.market,
      autonomyLevel: org.autonomy_level || 'draft_actions',
    },
    agents: agentsRes.data || [],
    recentCommands: recentRes.data || [],
    clientCount: clientCountRes.count || 0,
    clientSample: clientSampleRes.data || [],
  }
}

// ─── Parse intent ───────────────────────────────────────────────────────────
async function parseCommandIntent(apiKey: string, context: CommandContext, forceClear = false): Promise<ParsedIntent> {
  const clientList = context.clientSample.length > 0
    ? `\n\nExisting clients: ${context.clientSample.map(c => `${c.name}${c.email ? ` (${c.email})` : ''}`).join(', ')}`
    : '\n\nNo clients in the system yet.'

  const systemPrompt = `You are an AI Chief of Staff for ${context.organization.name}, a ${context.organization.industry || 'business'} company in the ${context.organization.market || 'general'} market.

Parse the executive's command with EXTREME PRECISION. You must extract every detail needed for execution.

Available agents:
${context.agents.map(a => `- ${a.emoji} ${a.name}: ${a.role}`).join('\n')}
${clientList}

CRITICAL RULES:
- If the command is "send email" without specifying TO WHOM, ABOUT WHAT → set clarificationNeeded=true
- If "add client" without a name → clarificationNeeded=true  
- If "generate report" → clarificationNeeded=false (you can generate from available data), but provide an executionPlan
- If "schedule call" without specifying with whom or when → clarificationNeeded=true
- For ANY action that could affect money, contracts, or client relationships → requiresDecision=true
- ALWAYS provide clarificationOptions (2-4 suggested answers) when clarificationNeeded=true
- ALWAYS provide executionPlan (step-by-step what will happen) for complex commands
${forceClear ? '\n- The user has provided additional details. Do NOT request further clarification unless truly critical info is still missing.' : ''}

Return ONLY valid JSON:
{
  "primaryIntent": "Detailed description of what needs to happen",
  "category": "client_management" | "communication" | "analysis" | "scheduling" | "workflow" | "reporting" | "other",
  "entities": [{"type": "client_name" | "date" | "amount" | "email" | "phone" | "metric" | "subject" | "recipient" | "other", "value": "extracted value"}],
  "suggestedAgents": ["agent names"],
  "estimatedComplexity": "low" | "medium" | "high",
  "requiresDecision": true/false,
  "clarificationNeeded": true/false,
  "clarificationQuestion": "Specific question if clarification needed",
  "clarificationOptions": ["Option 1", "Option 2", "Option 3"],
  "executionPlan": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
}`

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse this command: "${context.commandText}"` },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    }),
  })

  if (!response.ok) {
    console.error('AI Gateway error:', await response.text())
    return getDefaultIntent(context)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''
  const parsed = extractJsonFromResponse(content) as ParsedIntent | null

  if (parsed && parsed.primaryIntent) {
    return parsed
  }

  return getDefaultIntent(context)
}

function getDefaultIntent(context: CommandContext): ParsedIntent {
  return {
    primaryIntent: context.commandText,
    category: 'other',
    entities: [],
    suggestedAgents: ['Chief of Staff'],
    estimatedComplexity: 'medium',
    requiresDecision: true,
    clarificationNeeded: false,
    executionPlan: ['Analyze command', 'Route to appropriate agent', 'Execute and report back'],
  }
}

// ─── Generate conversational AI response ────────────────────────────────────
async function generateConversationalResponse(
  apiKey: string,
  context: CommandContext,
  intent: ParsedIntent,
  executionResult: Record<string, unknown> | null,
  responseType: string
): Promise<{
  message: string;
  options?: string[];
  executionSteps?: Array<{ label: string; status: string; detail?: string }>;
  executionPlan?: string[];
}> {
  let prompt = ''

  if (responseType === 'clarification') {
    prompt = `You are an executive AI Chief of Staff. The CEO said: "${context.commandText}"

You need more information to execute this properly. The question is: "${intent.clarificationQuestion || 'What additional details do you need?'}"

Generate a professional, intelligent response that:
1. Acknowledges the CEO's intent
2. Explains WHY you need clarification (what could go wrong without it)
3. Asks the specific question
4. Suggests 3-4 concrete options they can pick from

Also generate an execution plan showing what WILL happen once you have the info.

Format your response in markdown. Be concise but thorough. Address the CEO directly.

Return JSON:
{
  "message": "Your markdown-formatted response to the CEO",
  "options": ["Concrete option 1", "Concrete option 2", "Concrete option 3"],
  "executionPlan": ["Step 1", "Step 2", "Step 3"]
}`
  } else if (responseType === 'execution_complete') {
    const evidence = executionResult?.evidence || {}
    const outputData = executionResult?.outputData || {}
    const duration = executionResult?.duration_ms || 0

    prompt = `You are an executive AI Chief of Staff. The CEO commanded: "${context.commandText}"

The action was executed successfully. Here are the results:
- Duration: ${duration}ms
- Evidence: ${JSON.stringify(evidence)}
- Output: ${JSON.stringify(outputData)}
- Category: ${intent.category}
- Agent: ${intent.suggestedAgents[0] || 'Chief of Staff'}

Generate a DETAILED executive briefing that:
1. Confirms exactly what was done
2. Shows key evidence/proof of execution
3. Lists any follow-up items or next steps
4. Provides strategic context on impact

If there's a report in the output, include it in full.
If an email was sent, confirm to whom, subject, and status.
If a client was created/updated, confirm the details.

Format in markdown with headers, bullets, and bold for key info.

Return JSON:
{
  "message": "Your detailed markdown briefing",
  "executionSteps": [{"label": "step name", "status": "done", "detail": "what happened"}]
}`
  } else if (responseType === 'pending_decision') {
    prompt = `You are an executive AI Chief of Staff. The CEO commanded: "${context.commandText}"

This action requires your approval before execution. Here's why:
- Risk level: ${intent.estimatedComplexity}
- Category: ${intent.category}
- Requires decision: ${intent.requiresDecision}

Generate a response that:
1. Explains what will be done once approved
2. Highlights the risks and why approval is needed
3. Points to the Decision Center for approval
4. Shows the execution plan

Format in markdown. Be strategic and thorough.

Return JSON:
{
  "message": "Your markdown response",
  "executionSteps": [{"label": "step name", "status": "pending", "detail": "what will happen"}]
}`
  } else {
    prompt = `You are an executive AI Chief of Staff. The CEO commanded: "${context.commandText}"

The command has been analyzed and routed through the governance pipeline.
- Category: ${intent.category}
- Complexity: ${intent.estimatedComplexity}
- Assigned to: ${intent.suggestedAgents[0] || 'Operations'}

Generate a response that:
1. Confirms the command was understood
2. Explains the routing and what happens next
3. Shows the execution plan steps

Format in markdown.

Return JSON:
{
  "message": "Your markdown response",
  "executionSteps": [{"label": "step name", "status": "in_progress", "detail": "what's happening"}]
}`
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: `You are an elite executive AI assistant for ${context.organization.name}. Always respond with JSON only.` },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const content = data.choices[0]?.message?.content || ''
      const parsed = extractJsonFromResponse(content) as Record<string, unknown> | null

      if (parsed?.message) {
        return {
          message: parsed.message as string,
          options: (parsed.options as string[]) || undefined,
          executionSteps: (parsed.executionSteps as Array<{ label: string; status: string; detail?: string }>) || undefined,
          executionPlan: (parsed.executionPlan as string[]) || undefined,
        }
      }
    }
  } catch (e) {
    console.error('Conversational response generation failed:', e)
  }

  // Fallback responses
  if (responseType === 'clarification') {
    return {
      message: `I want to execute "${context.commandText}" precisely. ${intent.clarificationQuestion || 'Could you provide more details?'}`,
      options: intent.clarificationOptions || ['Please specify the details'],
      executionPlan: intent.executionPlan || ['Await your input', 'Process command', 'Execute and confirm'],
    }
  }

  return {
    message: responseType === 'execution_complete'
      ? `✅ **Command executed successfully.**\n\nYour request "${context.commandText}" has been completed. Evidence has been collected and logged in the audit trail.`
      : responseType === 'pending_decision'
      ? `⚖️ **Approval Required**\n\nYour command "${context.commandText}" has been analyzed and requires your approval. Please review in the **Decision Center**.`
      : `📋 **Command Routed**\n\nYour request has been analyzed and routed to **${intent.suggestedAgents[0] || 'the appropriate agent'}** for processing.`,
    executionSteps: (intent.executionPlan || []).map((step, i) => ({
      label: step,
      status: responseType === 'execution_complete' ? 'done' : i === 0 ? 'in_progress' : 'pending',
    })),
  }
}

// ─── Agent selection ────────────────────────────────────────────────────────
function selectBestAgent(
  agents: CommandContext['agents'],
  intent: ParsedIntent
): CommandContext['agents'][0] | null {
  if (agents.length === 0) return null

  for (const suggestedName of intent.suggestedAgents) {
    const match = agents.find(a =>
      a.name.toLowerCase().includes(suggestedName.toLowerCase()) ||
      suggestedName.toLowerCase().includes(a.name.toLowerCase())
    )
    if (match && match.status !== 'error') return match
  }

  const categoryAgentMap: Record<string, string[]> = {
    'client_management': ['Customer Success', 'Sales', 'Account', 'CRM', 'Client'],
    'communication': ['Communications', 'Marketing', 'Email', 'Outreach'],
    'analysis': ['Analytics', 'Finance', 'Risk', 'Data'],
    'scheduling': ['Calendar', 'Operations', 'Scheduling'],
    'workflow': ['Operations', 'Project', 'Process'],
    'reporting': ['Analytics', 'Finance', 'Reporting'],
    'other': ['Chief of Staff', 'Operations'],
  }

  const preferredAgents = categoryAgentMap[intent.category] || []
  for (const preferred of preferredAgents) {
    const match = agents.find(a =>
      a.name.toLowerCase().includes(preferred.toLowerCase()) ||
      a.role.toLowerCase().includes(preferred.toLowerCase())
    )
    if (match && match.status !== 'error') return match
  }

  const chiefOfStaff = agents.find(a => a.name.includes('Chief of Staff'))
  if (chiefOfStaff) return chiefOfStaff

  return agents.find(a => a.status === 'available') || agents[0]
}

// ─── Strategic analysis ─────────────────────────────────────────────────────
async function generateStrategicAnalysis(
  apiKey: string, context: CommandContext, intent: ParsedIntent
): Promise<StrategicAnalysis> {
  const systemPrompt = `You are a strategic advisor for ${context.organization.name}. Analyze this command and provide decision-ready insights.

Command: "${context.commandText}"
Intent: ${intent.primaryIntent}
Category: ${intent.category}
Complexity: ${intent.estimatedComplexity}
Industry: ${context.organization.industry || 'Not specified'}
Market: ${context.organization.market || 'Not specified'}
Clients: ${context.clientCount}

Return ONLY valid JSON:
{
  "title": "Brief decision title (max 60 chars)",
  "description": "One sentence action description",
  "reasoning": "2-3 sentence strategic reasoning",
  "confidenceScore": 0.0-1.0,
  "riskLevel": "low" | "medium" | "high" | "critical",
  "impactIfApproved": "Positive outcomes",
  "impactIfRejected": "Consequences",
  "financialImpact": "Estimated impact or null",
  "secondOrderEffects": ["downstream effects"],
  "assumptions": ["key assumptions"]
}`

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the strategic analysis.' },
      ],
      temperature: 0.4,
      max_tokens: 1500,
    }),
  })

  if (!response.ok) {
    return getDefaultAnalysis(context, intent)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''
  const parsed = extractJsonFromResponse(content) as StrategicAnalysis | null

  return parsed || getDefaultAnalysis(context, intent)
}

function getDefaultAnalysis(context: CommandContext, intent: ParsedIntent): StrategicAnalysis {
  return {
    title: `Action: ${intent.primaryIntent.substring(0, 50)}`,
    description: context.commandText,
    reasoning: 'This command requires executive review before execution.',
    confidenceScore: 0.7,
    riskLevel: intent.estimatedComplexity === 'high' ? 'high' : 'medium',
    impactIfApproved: 'Command will be executed by the assigned agent.',
    impactIfRejected: 'No action will be taken.',
    financialImpact: undefined,
    secondOrderEffects: [],
    assumptions: ['Executive intent is correctly understood'],
  }
}
