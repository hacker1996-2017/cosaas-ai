import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface TriageResult {
  classification: string
  confidence: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  suggestedResponse: string
  shouldAutoRespond: boolean
  requiresEscalation: boolean
  escalationReason?: string
  suggestedAgent?: string
  category: 'inquiry' | 'complaint' | 'support' | 'billing' | 'urgent' | 'feedback' | 'other'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI Gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { messageId, organizationId } = await req.json()

    if (!messageId || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'messageId and organizationId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch the inbound message
    const { data: message, error: msgError } = await adminClient
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (msgError || !message) {
      return new Response(
        JSON.stringify({ error: 'Message not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fetch organization context
    const { data: org } = await adminClient
      .from('organizations')
      .select('name, industry, market, autonomy_level, kill_switch_active, settings')
      .eq('id', organizationId)
      .single()

    if (org?.kill_switch_active) {
      await adminClient
        .from('messages')
        .update({
          ai_classification: 'kill_switch_active',
          ai_confidence: 1.0,
          risk_level: 'high',
        })
        .eq('id', messageId)

      return new Response(
        JSON.stringify({ status: 'kill_switch_active', autoResponded: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Parallel fetches: agents, client, thread history, agent instructions
    const [agentsRes, clientRes, threadRes, instructionsRes] = await Promise.all([
      adminClient
        .from('agents')
        .select('id, name, role, emoji, status')
        .eq('organization_id', organizationId),

      message.client_id
        ? adminClient
            .from('clients')
            .select('name, company, status, mrr, risk_of_churn, tags, industry, primary_contact_name')
            .eq('id', message.client_id)
            .single()
        : Promise.resolve({ data: null }),

      message.thread_id
        ? adminClient
            .from('messages')
            .select('sender_type, sender_name, content, created_at, ai_classification')
            .eq('thread_id', message.thread_id)
            .neq('id', messageId)
            .order('created_at', { ascending: true })
            .limit(20)
        : Promise.resolve({ data: null }),

      adminClient
        .from('agent_instructions')
        .select('instructions, deliverables, constraints')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .limit(5),
    ])

    const agents = agentsRes.data || []
    const client = clientRes.data
    const threadMessages = threadRes.data || []
    const instructions = instructionsRes.data || []

    // Build rich context
    const clientContext = client
      ? `\n## Known Client Profile
- Name: ${client.name}${client.company ? ` (${client.company})` : ''}
- Status: ${client.status || 'unknown'}
- Industry: ${client.industry || 'unknown'}
- MRR: $${client.mrr || 0}
- Churn Risk: ${client.risk_of_churn || 'unknown'}
- Tags: ${(client.tags || []).join(', ') || 'none'}`
      : ''

    // Build full conversation as chat messages for the AI
    const conversationMessages: Array<{ role: string; content: string }> = []

    for (const m of threadMessages) {
      if (m.sender_type === 'client') {
        conversationMessages.push({ role: 'user', content: m.content })
      } else if (m.sender_type === 'agent' || m.sender_type === 'system') {
        conversationMessages.push({ role: 'assistant', content: m.content })
      }
    }

    // Add the current message
    conversationMessages.push({ role: 'user', content: message.content })

    // Build instruction context
    const instructionContext = instructions.length > 0
      ? `\n## Active Agent Instructions\n${instructions.map(i =>
          `- ${i.instructions}${i.deliverables ? `\n  Deliverables: ${(i.deliverables as string[]).join(', ')}` : ''}`
        ).join('\n')}`
      : ''

    // 4. Two-phase AI: First classify, then generate response
    const classificationPrompt = `You are the Chief of Staff AI for "${org?.name || 'the company'}", a ${org?.industry || 'business'} company operating in ${org?.market || 'the market'}.

## Your Role
Triage inbound client messages. Classify intent, assess risk, and decide whether to auto-respond or escalate to the CEO.

## Available Agents
${agents.map(a => `- ${a.emoji} ${a.name}: ${a.role} (${a.status})`).join('\n')}
${clientContext}
${instructionContext}

## Auto-Respond Rules (shouldAutoRespond = true)
- General inquiries, FAQs, status checks, thank-yous, greetings
- Simple support questions you can answer confidently
- Follow-up questions in ongoing conversations where context is clear

## Escalation Rules (requiresEscalation = true)
- Complaints or negative sentiment
- Billing disputes or refund requests
- Contract changes or cancellation requests
- Anything involving financial decisions > $500
- Urgent/time-sensitive matters
- Requests you're unsure about

## Response Quality Standards
- Be warm, professional, and genuinely helpful
- Use the client's name when known
- Reference conversation history naturally
- Keep responses concise but thorough
- Use markdown formatting for clarity (bullet points, bold for emphasis)
- Never fabricate information — if unsure, offer to connect them with the right person`

    const classifyResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: classificationPrompt },
          ...conversationMessages.slice(0, -1).map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          })),
          {
            role: 'user',
            content: `New inbound message from ${message.sender_name || 'a visitor'} (via ${message.channel}${message.sender_email ? `, email: ${message.sender_email}` : ''}):\n\n"${message.content}"\n\nRespond with a JSON classification object:\n{"classification":"brief label","confidence":0.0-1.0,"riskLevel":"low"|"medium"|"high"|"critical","suggestedResponse":"your full response to the client","shouldAutoRespond":true/false,"requiresEscalation":true/false,"escalationReason":"reason if escalating","suggestedAgent":"agent name","category":"inquiry"|"complaint"|"support"|"billing"|"urgent"|"feedback"|"other"}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    })

    let triage: TriageResult

    if (!classifyResponse.ok) {
      const errText = await classifyResponse.text()
      console.error('AI Gateway error:', classifyResponse.status, errText)

      // Graceful fallback
      triage = {
        classification: 'ai_unavailable',
        confidence: 0.5,
        riskLevel: 'medium',
        suggestedResponse: `Thank you for reaching out to ${org?.name || 'us'}! We've received your message and a team member will get back to you shortly.`,
        shouldAutoRespond: true,
        requiresEscalation: false,
        category: 'other'
      }
    } else {
      const aiData = await classifyResponse.json()
      const content = aiData.choices?.[0]?.message?.content || ''

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        triage = jsonMatch ? JSON.parse(jsonMatch[0]) : fallbackTriage(org?.name)
      } catch {
        triage = fallbackTriage(org?.name)
      }
    }

    // 5. Update the inbound message with classification
    await adminClient
      .from('messages')
      .update({
        ai_classification: triage.classification,
        ai_confidence: triage.confidence,
        risk_level: triage.riskLevel,
        ai_auto_responded: triage.shouldAutoRespond && triage.confidence >= 0.7,
      })
      .eq('id', messageId)

    // 6. Auto-respond if appropriate (confidence >= 0.7)
    let autoResponded = false
    if (triage.shouldAutoRespond && triage.confidence >= 0.7) {
      const bestAgent = findBestAgent(agents, triage.suggestedAgent)

      const { error: insertError } = await adminClient
        .from('messages')
        .insert({
          organization_id: organizationId,
          client_id: message.client_id,
          agent_id: bestAgent?.id || null,
          sender_type: 'agent',
          sender_name: bestAgent ? `${bestAgent.emoji} ${bestAgent.name}` : '🤖 AI Assistant',
          channel: message.channel,
          content: triage.suggestedResponse,
          thread_id: message.thread_id,
          is_read: false,
          is_internal: false,
          ai_classification: 'auto_response',
          ai_confidence: triage.confidence,
          risk_level: 'low',
          ai_auto_responded: true,
        })

      if (!insertError) {
        autoResponded = true
      } else {
        console.error('Failed to insert auto-response:', insertError)
      }
    }

    // 7. Escalation pathway
    let pipelineActionId: string | null = null
    let decisionId: string | null = null

    if (triage.requiresEscalation) {
      const bestAgent = findBestAgent(agents, triage.suggestedAgent)

      const [pipelineRes, decisionRes] = await Promise.all([
        adminClient
          .from('action_pipeline')
          .insert({
            organization_id: organizationId,
            agent_id: bestAgent?.id || null,
            created_by: bestAgent?.id || organizationId,
            category: triage.category === 'billing' ? 'financial' : 'communication',
            action_type: `inbound_${triage.category}`,
            action_description: `Inbound ${triage.category} from ${message.sender_name || 'client'}: "${message.content.substring(0, 120)}"`,
            action_params: {
              message_id: messageId,
              thread_id: message.thread_id,
              sender_name: message.sender_name,
              sender_email: message.sender_email,
              channel: message.channel,
              classification: triage.classification,
              suggested_response: triage.suggestedResponse,
            },
            risk_level: triage.riskLevel,
            status: 'pending_approval',
            requires_approval: true,
          })
          .select('id')
          .single(),

        adminClient
          .from('decisions')
          .insert({
            organization_id: organizationId,
            agent_id: bestAgent?.id || null,
            title: `${getCategoryEmoji(triage.category)} Inbound ${triage.category}: ${message.sender_name || 'Client'}`,
            description: message.content.substring(0, 500),
            reasoning: triage.escalationReason || triage.classification,
            confidence_score: triage.confidence,
            risk_level: triage.riskLevel,
            impact_if_approved: `Respond: "${triage.suggestedResponse.substring(0, 250)}"`,
            impact_if_rejected: 'Message remains unresponded. Client may follow up or escalate externally.',
            status: 'pending',
            deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          })
          .select('id')
          .single(),
      ])

      pipelineActionId = pipelineRes.data?.id || null
      decisionId = decisionRes.data?.id || null

      // Link pipeline to message + timeline event
      const updates: Promise<unknown>[] = []

      if (pipelineActionId) {
        updates.push(
          adminClient
            .from('messages')
            .update({ action_pipeline_id: pipelineActionId })
            .eq('id', messageId)
        )
      }

      updates.push(
        adminClient
          .from('timeline_events')
          .insert({
            organization_id: organizationId,
            event_type: 'escalation',
            title: `${getCategoryEmoji(triage.category)} Inbound ${triage.category} escalated`,
            description: `From ${message.sender_name || 'client'} via ${message.channel}. ${triage.escalationReason || ''}`.trim(),
            agent_id: bestAgent?.id || null,
            icon: triage.riskLevel === 'critical' ? '🚨' : '📨',
            color: triage.riskLevel === 'high' || triage.riskLevel === 'critical' ? 'red' : 'orange',
            confidence_score: triage.confidence,
          })
      )

      await Promise.all(updates)
    } else if (autoResponded) {
      // Log successful auto-response in timeline
      await adminClient
        .from('timeline_events')
        .insert({
          organization_id: organizationId,
          event_type: 'ai_action',
          title: `💬 Auto-responded to ${message.sender_name || 'client'}`,
          description: `${triage.classification} via ${message.channel}. Confidence: ${Math.round(triage.confidence * 100)}%`,
          icon: '💬',
          color: 'green',
          confidence_score: triage.confidence,
        })
    }

    return new Response(
      JSON.stringify({
        success: true,
        triage: {
          classification: triage.classification,
          category: triage.category,
          confidence: triage.confidence,
          riskLevel: triage.riskLevel,
          autoResponded,
          escalated: triage.requiresEscalation,
        },
        pipelineActionId,
        decisionId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error triaging inbound message:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to triage message', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function fallbackTriage(orgName?: string): TriageResult {
  return {
    classification: 'fallback',
    confidence: 0.6,
    riskLevel: 'low',
    suggestedResponse: `Thank you for reaching out to ${orgName || 'us'}! We've received your message and will get back to you shortly.`,
    shouldAutoRespond: true,
    requiresEscalation: false,
    category: 'other',
  }
}

function findBestAgent(
  agents: Array<{ id: string; name: string; role: string; emoji: string; status: string }>,
  suggestedName?: string
) {
  if (suggestedName) {
    const match = agents.find(a =>
      a.name.toLowerCase().includes(suggestedName.toLowerCase())
    )
    if (match) return match
  }
  return agents.find(a => a.name.includes('Chief of Staff'))
    || agents.find(a => a.status === 'available')
    || agents[0]
    || null
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    inquiry: '❓',
    complaint: '😤',
    support: '🛠️',
    billing: '💰',
    urgent: '🚨',
    feedback: '💭',
    other: '📩',
  }
  return map[category] || '📩'
}
