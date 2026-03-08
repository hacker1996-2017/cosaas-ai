import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')

    if (!elevenlabsApiKey) {
      return new Response(
        JSON.stringify({ error: 'ELEVENLABS_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json()
    const { action } = body

    // ── ACTION: get_token — Get a conversation token for the browser widget ──
    if (action === 'get_token') {
      const { agentId } = body
      if (!agentId) {
        return new Response(
          JSON.stringify({ error: 'agentId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
        { headers: { 'xi-api-key': elevenlabsApiKey } }
      )

      if (!response.ok) {
        const errText = await response.text()
        return new Response(
          JSON.stringify({ error: 'Failed to get conversation token', details: errText }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const data = await response.json()
      return new Response(
        JSON.stringify({ token: data.token }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── ACTION: tts — Text-to-speech generation ──
    if (action === 'tts') {
      const { text, voiceId } = body
      if (!text) {
        return new Response(
          JSON.stringify({ error: 'text is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const voice = voiceId || 'EXAVITQu4vr4xnSDxMaL' // Default: Sarah

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': elevenlabsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        }
      )

      if (!response.ok) {
        const errText = await response.text()
        return new Response(
          JSON.stringify({ error: 'TTS failed', details: errText }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Return audio as base64
      const audioBuffer = await response.arrayBuffer()
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

      return new Response(
        JSON.stringify({
          success: true,
          audio_base64: base64Audio,
          content_type: 'audio/mpeg',
          text_length: text.length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── ACTION: list_voices — List available ElevenLabs voices ──
    if (action === 'list_voices') {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': elevenlabsApiKey },
      })

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to list voices' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const data = await response.json()
      const voices = (data.voices || []).map((v: { voice_id: string; name: string; labels: Record<string, string> }) => ({
        id: v.voice_id,
        name: v.name,
        accent: v.labels?.accent,
        gender: v.labels?.gender,
      }))

      return new Response(
        JSON.stringify({ voices }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── ACTION: log_call — Log a voice interaction to the calls table ──
    if (action === 'log_call') {
      const { calleeNumber, clientId, agentId, transcript, summary, durationSeconds, sentimentScore } = body

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

      const { data: call, error: callError } = await adminClient
        .from('calls')
        .insert({
          organization_id: profile.organization_id,
          callee_number: calleeNumber || 'ai-voice-call',
          client_id: clientId || null,
          agent_id: agentId || null,
          status: 'completed',
          started_at: new Date(Date.now() - (durationSeconds || 60) * 1000).toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds || 0,
          transcript: transcript || null,
          summary: summary || null,
          sentiment_score: sentimentScore || null,
          metadata: { provider: 'elevenlabs', logged_by: user.id },
        })
        .select()
        .single()

      if (callError) {
        return new Response(
          JSON.stringify({ error: 'Failed to log call', details: callError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Write timeline event
      await adminClient
        .from('timeline_events')
        .insert({
          organization_id: profile.organization_id,
          event_type: 'ai_action',
          title: `📞 Voice call logged${clientId ? '' : ' (internal)'}`,
          description: summary || `Duration: ${durationSeconds || 0}s. Provider: ElevenLabs.`,
          agent_id: agentId || null,
          user_id: user.id,
          icon: '📞',
          color: 'green',
        })

      return new Response(
        JSON.stringify({ success: true, callId: call.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action. Use: get_token, tts, list_voices, log_call' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Voice service error:', error)
    return new Response(
      JSON.stringify({ error: 'Voice service failed', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})