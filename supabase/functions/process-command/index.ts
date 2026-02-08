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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!

    // Validate JWT for Lovable Cloud (ES256 compatibility)
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
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Authenticated user: ${user.id}`)

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI Gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { commandId } = await req.json()
    
    if (!commandId) {
      return new Response(
        JSON.stringify({ error: 'Command ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch command and context
    const context = await buildCommandContext(adminClient, commandId, user.id)
    if (!context) {
      return new Response(
        JSON.stringify({ error: 'Command not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Update command status to in_progress
    await adminClient
      .from('commands')
      .update({ 
        status: 'in_progress', 
        started_at: new Date().toISOString() 
      })
      .eq('id', commandId)

    // 3. Parse intent using AI
    const parsedIntent = await parseCommandIntent(lovableApiKey, context)
    
    // 4. Update command with parsed intent
    await adminClient
      .from('commands')
      .update({ 
        parsed_intent: parsedIntent,
        confidence_score: parsedIntent.clarificationNeeded ? 0.6 : 0.85,
        risk_level: parsedIntent.estimatedComplexity === 'high' ? 'high' : 
                   parsedIntent.estimatedComplexity === 'medium' ? 'medium' : 'low'
      })
      .eq('id', commandId)

    // 5. Assign to best agent
    const assignedAgent = selectBestAgent(context.agents, parsedIntent)
    if (assignedAgent) {
      await adminClient
        .from('commands')
        .update({ agent_id: assignedAgent.id })
        .eq('id', commandId)

      // Update agent status
      await adminClient
        .from('agents')
        .update({ status: 'busy', active_tasks: 1 })
        .eq('id', assignedAgent.id)
    }

    // 6. Generate strategic analysis if required
    let decision = null
    if (parsedIntent.requiresDecision || context.organization.autonomyLevel !== 'execute_autonomous') {
      const analysis = await generateStrategicAnalysis(lovableApiKey, context, parsedIntent)
      
      // Create decision for CEO review
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
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        })
        .select()
        .single()

      decision = decisionData
    }

    // 7. Create timeline event
    await adminClient
      .from('timeline_events')
      .insert({
        organization_id: context.organizationId,
        event_type: 'ai_action',
        title: `Command received: "${context.commandText.substring(0, 50)}${context.commandText.length > 50 ? '...' : ''}"`,
        description: `Assigned to ${assignedAgent?.name || 'Chief of Staff'}. ${decision ? 'Pending CEO decision.' : 'Processing autonomously.'}`,
        command_id: commandId,
        agent_id: assignedAgent?.id,
        user_id: user.id,
        icon: assignedAgent?.emoji || '🎯',
        color: parsedIntent.estimatedComplexity === 'high' ? 'orange' : 'blue',
        confidence_score: parsedIntent.clarificationNeeded ? 0.6 : 0.85
      })

    // 8. If no decision required and autonomy allows, complete immediately
    if (!decision && context.organization.autonomyLevel === 'execute_autonomous') {
      await completeCommand(adminClient, commandId, context, parsedIntent, assignedAgent)
    }

    // 9. Reset agent status if not pending decision
    if (assignedAgent && !decision) {
      await adminClient
        .from('agents')
        .update({ status: 'available', active_tasks: 0 })
        .eq('id', assignedAgent.id)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        parsedIntent,
        assignedAgent: assignedAgent ? { id: assignedAgent.id, name: assignedAgent.name } : null,
        decision: decision ? { id: decision.id, title: decision.title } : null,
        status: decision ? 'pending_decision' : 'completed'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing command:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process command', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function buildCommandContext(
  client: ReturnType<typeof createClient>,
  commandId: string,
  userId: string
): Promise<CommandContext | null> {
  // Fetch command
  const { data: command } = await client
    .from('commands')
    .select('*')
    .eq('id', commandId)
    .single()

  if (!command) return null

  // Fetch organization
  const { data: org } = await client
    .from('organizations')
    .select('*')
    .eq('id', command.organization_id)
    .single()

  if (!org) return null

  // Fetch agents
  const { data: agents } = await client
    .from('agents')
    .select('id, name, role, emoji, status')
    .eq('organization_id', command.organization_id)

  // Fetch recent commands for context
  const { data: recentCommands } = await client
    .from('commands')
    .select('command_text, status')
    .eq('organization_id', command.organization_id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch client count
  const { count: clientCount } = await client
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', command.organization_id)

  return {
    commandId: command.id,
    commandText: command.command_text,
    organizationId: command.organization_id,
    userId,
    organization: {
      name: org.name,
      industry: org.industry,
      market: org.market,
      autonomyLevel: org.autonomy_level || 'draft_actions'
    },
    agents: agents || [],
    recentCommands: recentCommands || [],
    clientCount: clientCount || 0
  }
}

async function parseCommandIntent(
  apiKey: string,
  context: CommandContext
): Promise<ParsedIntent> {
  const systemPrompt = `You are an AI Chief of Staff assistant for ${context.organization.name}, a ${context.organization.industry || 'business'} company in the ${context.organization.market || 'general'} market.

Your task is to parse executive commands and extract structured intent. Be precise and actionable.

Available agents:
${context.agents.map(a => `- ${a.emoji} ${a.name}: ${a.role}`).join('\n')}

Respond ONLY with valid JSON matching this schema:
{
  "primaryIntent": "Brief summary of what the executive wants to accomplish",
  "category": "client_management" | "communication" | "analysis" | "scheduling" | "workflow" | "reporting" | "other",
  "entities": [{"type": "client_name" | "date" | "amount" | "email" | "phone" | "metric" | "other", "value": "extracted value"}],
  "suggestedAgents": ["agent names best suited for this task"],
  "estimatedComplexity": "low" | "medium" | "high",
  "requiresDecision": true/false (true if involves money, contracts, client relationships, or risk),
  "clarificationNeeded": true/false,
  "clarificationQuestion": "question to ask if clarification needed"
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
        { role: 'user', content: `Parse this command: "${context.commandText}"` }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })
  })

  if (!response.ok) {
    console.error('AI Gateway error:', await response.text())
    // Return default intent on error
    return {
      primaryIntent: context.commandText,
      category: 'other',
      entities: [],
      suggestedAgents: ['Chief of Staff'],
      estimatedComplexity: 'medium',
      requiresDecision: true,
      clarificationNeeded: false
    }
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''
  
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e)
  }

  return {
    primaryIntent: context.commandText,
    category: 'other',
    entities: [],
    suggestedAgents: ['Chief of Staff'],
    estimatedComplexity: 'medium',
    requiresDecision: true,
    clarificationNeeded: false
  }
}

function selectBestAgent(
  agents: CommandContext['agents'],
  intent: ParsedIntent
): CommandContext['agents'][0] | null {
  if (agents.length === 0) return null

  // First check if any suggested agents match
  for (const suggestedName of intent.suggestedAgents) {
    const match = agents.find(a => 
      a.name.toLowerCase().includes(suggestedName.toLowerCase()) ||
      suggestedName.toLowerCase().includes(a.name.toLowerCase())
    )
    if (match && match.status !== 'error') return match
  }

  // Category-based matching
  const categoryAgentMap: Record<string, string[]> = {
    'client_management': ['Customer Success', 'Sales', 'Account', 'CRM', 'Client'],
    'communication': ['Communications', 'Marketing', 'Email', 'Outreach'],
    'analysis': ['Analytics', 'Finance', 'Risk', 'Data'],
    'scheduling': ['Calendar', 'Operations', 'Scheduling'],
    'workflow': ['Operations', 'Project', 'Process'],
    'reporting': ['Analytics', 'Finance', 'Reporting'],
    'other': ['Chief of Staff', 'Operations']
  }

  const preferredAgents = categoryAgentMap[intent.category] || []
  
  for (const preferred of preferredAgents) {
    const match = agents.find(a => 
      a.name.toLowerCase().includes(preferred.toLowerCase()) ||
      a.role.toLowerCase().includes(preferred.toLowerCase())
    )
    if (match && match.status !== 'error') return match
  }

  // Default to Chief of Staff or first available
  const chiefOfStaff = agents.find(a => a.name.includes('Chief of Staff'))
  if (chiefOfStaff) return chiefOfStaff

  return agents.find(a => a.status === 'available') || agents[0]
}

async function generateStrategicAnalysis(
  apiKey: string,
  context: CommandContext,
  intent: ParsedIntent
): Promise<StrategicAnalysis> {
  const systemPrompt = `You are a strategic advisor for ${context.organization.name}. Analyze executive commands and provide decision-ready insights.

The executive issued this command: "${context.commandText}"
Parsed intent: ${intent.primaryIntent}
Category: ${intent.category}
Complexity: ${intent.estimatedComplexity}

Company context:
- Industry: ${context.organization.industry || 'Not specified'}
- Market: ${context.organization.market || 'Not specified'}  
- Total clients: ${context.clientCount}

Respond ONLY with valid JSON:
{
  "title": "Brief decision title (max 60 chars)",
  "description": "One sentence description of the action",
  "reasoning": "Why this action makes strategic sense (2-3 sentences)",
  "confidenceScore": 0.0-1.0 (how confident are you this will succeed),
  "riskLevel": "low" | "medium" | "high" | "critical",
  "impactIfApproved": "Positive outcomes if approved",
  "impactIfRejected": "Consequences if not approved",
  "financialImpact": "Estimated financial impact if applicable, or null",
  "secondOrderEffects": ["List of potential downstream effects"],
  "assumptions": ["Key assumptions being made"]
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
        { role: 'user', content: 'Generate the strategic analysis.' }
      ],
      temperature: 0.4,
      max_tokens: 1500
    })
  })

  if (!response.ok) {
    console.error('AI Gateway error:', await response.text())
    return getDefaultAnalysis(context, intent)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e)
  }

  return getDefaultAnalysis(context, intent)
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
    financialImpact: null,
    secondOrderEffects: [],
    assumptions: ['Executive intent is correctly understood']
  }
}

async function completeCommand(
  client: ReturnType<typeof createClient>,
  commandId: string,
  context: CommandContext,
  intent: ParsedIntent,
  agent: CommandContext['agents'][0] | null
) {
  // Update command as completed
  await client
    .from('commands')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      result: {
        status: 'success',
        executedBy: agent?.name || 'Chief of Staff',
        summary: `Executed: ${intent.primaryIntent}`,
        entities: intent.entities
      }
    })
    .eq('id', commandId)

  // Create completion timeline event
  await client
    .from('timeline_events')
    .insert({
      organization_id: context.organizationId,
      event_type: 'ai_action',
      title: `Command completed: ${intent.primaryIntent.substring(0, 40)}`,
      description: `Executed by ${agent?.name || 'Chief of Staff'} with ${Math.round(0.85 * 100)}% confidence.`,
      command_id: commandId,
      agent_id: agent?.id,
      icon: '✅',
      color: 'green',
      confidence_score: 0.85
    })
}
