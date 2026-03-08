import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Auth
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
    const { action, emailId, to, subject, context, replyToEmailId } = body

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get user profile and org
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id, full_name')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'No organization found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orgId = profile.organization_id

    // Get org info for AI context
    const { data: org } = await adminClient
      .from('organizations')
      .select('name, industry, market')
      .eq('id', orgId)
      .single()

    // ── ACTION: draft — AI generates a new email draft ──
    if (action === 'draft') {
      if (!to || !subject) {
        return new Response(
          JSON.stringify({ error: 'to and subject are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch client context if we have email match
      let clientContext = ''
      const { data: client } = await adminClient
        .from('clients')
        .select('name, company, industry, status, mrr, tags')
        .eq('organization_id', orgId)
        .eq('email', to)
        .maybeSingle()

      if (client) {
        clientContext = `\nRecipient info: ${client.name} at ${client.company || 'N/A'}, industry: ${client.industry || 'N/A'}, status: ${client.status}, MRR: $${client.mrr || 0}`
      }

      // Fetch recent communications with this email
      let recentComms = ''
      const { data: recentEmails } = await adminClient
        .from('emails')
        .select('subject, body_text, from_address, to_addresses, created_at, status')
        .eq('organization_id', orgId)
        .or(`to_addresses.cs.{${to}},from_address.eq.${to}`)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentEmails?.length) {
        recentComms = '\nRecent email history:\n' + recentEmails.map(e =>
          `- [${e.status}] ${e.from_address} → ${(e.to_addresses as string[]).join(', ')}: "${e.subject}" (${e.created_at})`
        ).join('\n')
      }

      const systemPrompt = `You are the Chief of Staff AI for ${org?.name || 'the organization'}${org?.industry ? ` in the ${org.industry} industry` : ''}.
You draft professional, concise business emails on behalf of the CEO/leadership.

Rules:
- Write in a professional but warm tone
- Keep emails concise and action-oriented
- Include a clear call-to-action when appropriate
- Do NOT include subject line in the body
- Do NOT add placeholder signatures — just end naturally
- Return ONLY the email body text, nothing else
${clientContext}${recentComms}`

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Draft an email with subject "${subject}" to ${to}.${context ? ` Additional context: ${context}` : ''}` },
          ],
        }),
      })

      if (!aiResponse.ok) {
        const status = aiResponse.status
        if (status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        throw new Error(`AI gateway returned ${status}`)
      }

      const aiData = await aiResponse.json()
      const draftBody = aiData.choices?.[0]?.message?.content || ''

      return new Response(
        JSON.stringify({ draft: draftBody }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── ACTION: reply — AI drafts a reply to an existing email ──
    if (action === 'reply') {
      if (!replyToEmailId) {
        return new Response(
          JSON.stringify({ error: 'replyToEmailId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: originalEmail, error: emailErr } = await adminClient
        .from('emails')
        .select('*')
        .eq('id', replyToEmailId)
        .single()

      if (emailErr || !originalEmail) {
        return new Response(
          JSON.stringify({ error: 'Original email not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (originalEmail.organization_id !== orgId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get thread context
      let threadEmails: typeof originalEmail[] = []
      if (originalEmail.thread_id) {
        const { data } = await adminClient
          .from('emails')
          .select('*')
          .eq('thread_id', originalEmail.thread_id)
          .order('created_at', { ascending: true })
          .limit(10)
        threadEmails = data || []
      } else {
        threadEmails = [originalEmail]
      }

      const threadContext = threadEmails.map(e =>
        `From: ${e.from_address}\nTo: ${(e.to_addresses as string[]).join(', ')}\nSubject: ${e.subject}\nDate: ${e.created_at}\n\n${e.body_text || e.body_html || '[no body]'}`
      ).join('\n---\n')

      const systemPrompt = `You are the Chief of Staff AI for ${org?.name || 'the organization'}${org?.industry ? ` in the ${org.industry} industry` : ''}.
You draft professional reply emails on behalf of the CEO/leadership.

Rules:
- Write in a professional but warm tone
- Address the points raised in the original email
- Keep replies concise and action-oriented
- Do NOT include subject line or headers
- Do NOT add placeholder signatures
- Return ONLY the reply body text
`

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Draft a reply to this email thread:\n\n${threadContext}${context ? `\n\nAdditional instructions: ${context}` : ''}` },
          ],
        }),
      })

      if (!aiResponse.ok) {
        const status = aiResponse.status
        if (status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        throw new Error(`AI gateway returned ${status}`)
      }

      const aiData = await aiResponse.json()
      const replyBody = aiData.choices?.[0]?.message?.content || ''

      return new Response(
        JSON.stringify({
          draft: replyBody,
          replyTo: originalEmail.from_address,
          subject: originalEmail.subject.startsWith('Re:') ? originalEmail.subject : `Re: ${originalEmail.subject}`,
          threadId: originalEmail.thread_id || originalEmail.id,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── ACTION: summarize — AI reads and summarizes an email or thread ──
    if (action === 'summarize') {
      if (!emailId) {
        return new Response(
          JSON.stringify({ error: 'emailId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: email, error: emailErr } = await adminClient
        .from('emails')
        .select('*')
        .eq('id', emailId)
        .single()

      if (emailErr || !email || email.organization_id !== orgId) {
        return new Response(
          JSON.stringify({ error: 'Email not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get full thread if exists
      let threadEmails: typeof email[] = []
      if (email.thread_id) {
        const { data } = await adminClient
          .from('emails')
          .select('*')
          .eq('thread_id', email.thread_id)
          .order('created_at', { ascending: true })
          .limit(20)
        threadEmails = data || []
      } else {
        threadEmails = [email]
      }

      const threadContent = threadEmails.map(e =>
        `From: ${e.from_address} → ${(e.to_addresses as string[]).join(', ')}\nSubject: ${e.subject}\nDate: ${e.created_at}\n${e.body_text || e.body_html || '[empty]'}`
      ).join('\n---\n')

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: `You are an executive assistant. Summarize email threads concisely. Include: key points, action items, sentiment, and urgency level (low/medium/high/critical). Format as bullet points.` },
            { role: 'user', content: `Summarize this email thread:\n\n${threadContent}` },
          ],
        }),
      })

      if (!aiResponse.ok) {
        const status = aiResponse.status
        if (status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: 'AI credits exhausted.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        throw new Error(`AI gateway returned ${status}`)
      }

      const aiData = await aiResponse.json()
      const summary = aiData.choices?.[0]?.message?.content || ''

      return new Response(
        JSON.stringify({ summary }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: draft, reply, or summarize' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('AI email error:', error)
    return new Response(
      JSON.stringify({ error: 'AI email processing failed', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
