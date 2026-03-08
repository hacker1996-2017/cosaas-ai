import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const payload = await req.json()
    console.log('Resend webhook received:', JSON.stringify(payload).slice(0, 500))

    // ── Handle Resend email status events ──
    if (payload.type && payload.data) {
      const { type, data } = payload
      const resendEmailId = data.email_id

      if (!resendEmailId) {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: email } = await adminClient
        .from('emails')
        .select('id, status')
        .eq('external_id', resendEmailId)
        .single()

      if (!email) {
        console.log('Email not found for Resend ID:', resendEmailId)
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const updates: Record<string, unknown> = {}

      switch (type) {
        case 'email.delivered':
          updates.status = 'sent'
          break
        case 'email.bounced':
          updates.status = 'bounced'
          break
        case 'email.opened':
          updates.opened_at = new Date().toISOString()
          break
        case 'email.clicked':
          updates.clicked_at = new Date().toISOString()
          break
        case 'email.complained':
          updates.status = 'failed'
          break
      }

      if (Object.keys(updates).length > 0) {
        await adminClient.from('emails').update(updates).eq('id', email.id)
      }

      return new Response(
        JSON.stringify({ received: true, updated: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Handle inbound email (reply) ──
    // Resend inbound emails have from, to, subject, text/html fields
    if ((payload.from || payload.headers) && !payload.type) {
      const fromAddress =
        typeof payload.from === 'string'
          ? payload.from
          : payload.from?.address || String(payload.from)

      const rawTo = payload.to
      const toAddresses: string[] = Array.isArray(rawTo)
        ? rawTo.map((t: unknown) => (typeof t === 'string' ? t : (t as { address?: string }).address || String(t)))
        : [typeof rawTo === 'string' ? rawTo : (rawTo as { address?: string })?.address || String(rawTo)]

      const subject = payload.subject || '(No subject)'
      const bodyText = payload.text || payload.body || ''
      const bodyHtml = payload.html || null
      const headers: Array<{ name: string; value: string }> = payload.headers || []

      let threadId: string | null = null
      let organizationId: string | null = null

      // 1) Try matching via In-Reply-To / References headers
      const inReplyTo = headers.find((h) => h.name?.toLowerCase() === 'in-reply-to')?.value
      const references = headers.find((h) => h.name?.toLowerCase() === 'references')?.value
      const messageIdRef = inReplyTo || (references ? references.split(/\s+/).pop() : null)

      if (messageIdRef) {
        const cleanId = messageIdRef.replace(/[<>]/g, '')
        const { data: origEmail } = await adminClient
          .from('emails')
          .select('id, thread_id, organization_id')
          .eq('external_id', cleanId)
          .limit(1)
          .maybeSingle()

        if (origEmail) {
          threadId = origEmail.thread_id || origEmail.id
          organizationId = origEmail.organization_id
        }
      }

      // 2) Fallback: match by subject (strip Re:)
      if (!organizationId) {
        const cleanSubject = subject.replace(/^(re:\s*)+/i, '').trim()
        if (cleanSubject) {
          const { data: origEmail } = await adminClient
            .from('emails')
            .select('id, thread_id, organization_id')
            .eq('subject', cleanSubject)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (origEmail) {
            threadId = origEmail.thread_id || origEmail.id
            organizationId = origEmail.organization_id
          }
        }
      }

      // 3) Fallback: match by to_addresses (find org that previously sent from one of those addresses)
      if (!organizationId) {
        for (const addr of toAddresses) {
          const { data: matchEmails } = await adminClient
            .from('emails')
            .select('organization_id')
            .eq('from_address', addr)
            .limit(1)

          if (matchEmails && matchEmails.length > 0) {
            organizationId = matchEmails[0].organization_id
            break
          }
        }
      }

      if (!organizationId) {
        console.log('Could not determine organization for inbound email from', fromAddress)
        return new Response(
          JSON.stringify({ received: true, stored: false, reason: 'no_org_match' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Store the inbound email
      const { error: insertError } = await adminClient.from('emails').insert({
        organization_id: organizationId,
        from_address: fromAddress,
        to_addresses: toAddresses,
        subject,
        body_text: bodyText,
        body_html: bodyHtml,
        thread_id: threadId,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          direction: 'inbound',
          matched_by: threadId ? (messageIdRef ? 'message_id' : 'subject') : 'org_lookup',
        },
      })

      if (insertError) {
        console.error('Failed to store inbound email:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to store email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Inbound email stored, threadId:', threadId)
      return new Response(
        JSON.stringify({ received: true, stored: true, threadId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
