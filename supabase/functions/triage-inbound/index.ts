import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // 1. Fetch the message
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
      .select('name, industry, market, autonomy_level, kill_switch_active')
      .eq('id', organizationId)
      .single()

    if (org?.kill_switch_active) {
      // Still store but don't auto-respond
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

    // 3. Fetch agents for routing
    const { data: agents } = await adminClient
      .from('agents')
      .select('id, name, role, emoji, status')
      .eq('organization_id', organizationId)

    // 4. Fetch client context if known
    let clientContext = ''
    if (message.client_id) {
      const { data: client } = await adminClient
        .from('clients')
        .select('name, company, status, mrr, risk_of_churn, tags')
        .eq('id', message.client_id)
        .single()

      if (client) {
        clientContext = `\nKnown client: ${client.name} (${client.company || 'no company'}), Status: ${client.status}, MRR: $${client.mrr}, Churn Risk: ${client.risk_of_churn}`
      }
    }

    // 5. Fetch recent messages in thread for context
    let threadContext = ''
    if (message.thread_id) {
      const { data: threadMessages } = await adminClient
        .from('messages')
        .select('sender_type, content, created_at')
        .eq('thread_id', message.thread_id)
        .order('created_at', { ascending: true })
        .limit(10)

      if (threadMessages && threadMessages.length > 1) {
        threadContext = '\nConversation history:\n' + threadMessages.map(m =>
          `[${m.sender_type}]: ${m.content.substring(0, 200)}`
        ).join('\n')
      }
    }

    // 6. AI Classification
    const systemPrompt = `You are the Chief of Staff AI for ${org?.name || 'the company'}, a ${org?.industry || 'business'} company.

Your job is to triage inbound client messages. Classify them, assess risk, and either draft an auto-response or escalate to the human CEO.

Available agents for routing:
${(agents || []).map(a => `- ${a.emoji} ${a.name}: ${a.role}`).join('\n')}
${clientContext}
${threadContext}

RULES:
- Auto-respond to: simple inquiries, status checks, thank yous, general questions
- ESCALATE to Decision Center: complaints, billing disputes, contract changes, urgent issues, anything involving money > $500
- Always be professional, helpful, and concise in auto-responses
- If unsure, escalate rather than auto-respond incorrectly

Respond ONLY with valid JSON:
{
  "classification": "brief classification of the message",
  "confidence": 0.0-1.0,
  "riskLevel": "low" | "medium" | "high" | "critical",
  "suggestedResponse": "the response to send to the client",
  "shouldAutoRespond": true/false,
  "requiresEscalation": true/false,
  "escalationReason": "why this needs CEO attention (if applicable)",
  "suggestedAgent": "name of best agent to handle this",
  "category": "inquiry" | "complaint" | "support" | "billing" | "urgent" | "feedback" | "other"
}`

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
          { role: 'user', content: `Triage this inbound message from ${message.sender_name || 'a client'} (${message.channel}):\n\n"${message.content}"` }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    })

    let triage: TriageResult
    if (!aiResponse.ok) {
      console.error('AI Gateway error:', await aiResponse.text())
      triage = {
        classification: 'unclassified',
        confidence: 0.5,
        riskLevel: 'medium',
        suggestedResponse: 'Thank you for reaching out. A team member will get back to you shortly.',
        shouldAutoRespond: false,
        requiresEscalation: true,
        escalationReason: 'AI classification failed',
        category: 'other'
      }
    } else {
      const aiData = await aiResponse.json()
      const content = aiData.choices[0]?.message?.content || ''
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        triage = jsonMatch ? JSON.parse(jsonMatch[0]) : {
          classification: 'parse_error', confidence: 0.5, riskLevel: 'medium',
          suggestedResponse: 'Thank you for your message. We will respond shortly.',
          shouldAutoRespond: false, requiresEscalation: true, category: 'other'
        }
      } catch {
        triage = {
          classification: 'parse_error', confidence: 0.5, riskLevel: 'medium',
          suggestedResponse: 'Thank you for your message. We will respond shortly.',
          shouldAutoRespond: false, requiresEscalation: true, category: 'other'
        }
      }
    }

    // 7. Update the inbound message with AI classification
    await adminClient
      .from('messages')
      .update({
        ai_classification: triage.classification,
        ai_confidence: triage.confidence,
        risk_level: triage.riskLevel,
        ai_auto_responded: triage.shouldAutoRespond,
      })
      .eq('id', messageId)

    // 8. Auto-respond if appropriate
    if (triage.shouldAutoRespond && triage.confidence >= 0.75) {
      // Find the best agent
      const bestAgent = (agents || []).find(a =>
        a.name.toLowerCase().includes((triage.suggestedAgent || '').toLowerCase())
      ) || (agents || []).find(a => a.name.includes('Chief of Staff')) || (agents || [])[0]

      await adminClient
        .from('messages')
        .insert({
          organization_id: organizationId,
          client_id: message.client_id,
          agent_id: bestAgent?.id || null,
          sender_type: 'agent',
          sender_name: bestAgent?.name || 'AI Assistant',
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
    }

    // 9. If escalation needed, create action pipeline entry + decision
    let pipelineActionId = null
    let decisionId = null

    if (triage.requiresEscalation) {
      const bestAgent = (agents || []).find(a =>
        a.name.toLowerCase().includes((triage.suggestedAgent || '').toLowerCase())
      ) || (agents || []).find(a => a.name.includes('Chief of Staff')) || (agents || [])[0]

      // Create action pipeline entry
      const { data: pipelineAction } = await adminClient
        .from('action_pipeline')
        .insert({
          organization_id: organizationId,
          agent_id: bestAgent?.id || null,
          created_by: bestAgent?.id || organizationId, // system-created
          category: triage.category === 'billing' ? 'financial' : 'communication',
          action_type: `inbound_${triage.category}`,
          action_description: `Inbound ${triage.category} from ${message.sender_name || 'client'}: "${message.content.substring(0, 100)}..."`,
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
        .select()
        .single()

      pipelineActionId = pipelineAction?.id

      // Update message with pipeline link
      if (pipelineActionId) {
        await adminClient
          .from('messages')
          .update({ action_pipeline_id: pipelineActionId })
          .eq('id', messageId)
      }

      // Create decision for CEO
      const { data: decision } = await adminClient
        .from('decisions')
        .insert({
          organization_id: organizationId,
          agent_id: bestAgent?.id || null,
          title: `Inbound ${triage.category}: ${message.sender_name || 'Client'}`,
          description: `${message.content.substring(0, 300)}`,
          reasoning: triage.escalationReason || triage.classification,
          confidence_score: triage.confidence,
          risk_level: triage.riskLevel,
          impact_if_approved: `Respond with: "${triage.suggestedResponse.substring(0, 200)}"`,
          impact_if_rejected: 'Message will remain unresponded. Client may follow up.',
          status: 'pending',
          deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
        })
        .select()
        .single()

      decisionId = decision?.id

      // Timeline event
      await adminClient
        .from('timeline_events')
        .insert({
          organization_id: organizationId,
          event_type: 'escalation',
          title: `Inbound ${triage.category} escalated`,
          description: `From ${message.sender_name || 'client'} via ${message.channel}. ${triage.escalationReason || ''}`,
          agent_id: bestAgent?.id || null,
          icon: triage.riskLevel === 'critical' ? '🚨' : '📨',
          color: triage.riskLevel === 'high' || triage.riskLevel === 'critical' ? 'red' : 'orange',
          confidence_score: triage.confidence,
        })
    } else {
      // Low-risk auto-handled: still log timeline
      await adminClient
        .from('timeline_events')
        .insert({
          organization_id: organizationId,
          event_type: 'ai_action',
          title: `Auto-responded to ${message.sender_name || 'client'}`,
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
          autoResponded: triage.shouldAutoRespond && triage.confidence >= 0.75,
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