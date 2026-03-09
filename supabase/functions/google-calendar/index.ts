import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { claims }, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claims.sub;
    const body = await req.json();
    const { action, ...params } = body;

    // Fetch the user's stored Google Calendar token
    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_calendar_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({ error: 'Google Calendar not connected', code: 'NOT_CONNECTED' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check token expiry
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Google Calendar token expired. Please reconnect.', code: 'TOKEN_EXPIRED' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = tokenRow.access_token;
    let result: unknown;

    switch (action) {
      case 'list_events':
        result = await listEvents(accessToken, params);
        break;
      case 'create_event':
        result = await createCalendarEvent(accessToken, params);
        break;
      case 'update_event':
        result = await updateCalendarEvent(accessToken, params);
        break;
      case 'delete_event':
        result = await deleteCalendarEvent(accessToken, params.eventId);
        break;
      case 'check_status': {
        const res = await fetch(`${CALENDAR_BASE}/users/me/calendarList?maxResults=1`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        result = { connected: res.ok, status: res.status };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[google-calendar]', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function listEvents(
  accessToken: string,
  { calendarId = 'primary', timeMin, timeMax, maxResults = 25 }: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  }
) {
  const qs = new URLSearchParams({
    orderBy: 'startTime',
    singleEvents: 'true',
    maxResults: String(maxResults),
  });
  if (timeMin) qs.set('timeMin', timeMin);
  if (timeMax) qs.set('timeMax', timeMax);

  const res = await fetch(`${CALENDAR_BASE}/calendars/${calendarId}/events?${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Calendar API [${res.status}]: ${body}`);
  }
  return res.json();
}

async function createCalendarEvent(
  accessToken: string,
  { calendarId = 'primary', event }: { calendarId?: string; event: object }
) {
  const res = await fetch(`${CALENDAR_BASE}/calendars/${calendarId}/events?sendUpdates=all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Calendar API [${res.status}]: ${body}`);
  }
  return res.json();
}

async function updateCalendarEvent(
  accessToken: string,
  { calendarId = 'primary', eventId, event }: { calendarId?: string; eventId: string; event: object }
) {
  const res = await fetch(
    `${CALENDAR_BASE}/calendars/${calendarId}/events/${eventId}?sendUpdates=all`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Calendar API [${res.status}]: ${body}`);
  }
  return res.json();
}

async function deleteCalendarEvent(accessToken: string, eventId: string, calendarId = 'primary') {
  const res = await fetch(
    `${CALENDAR_BASE}/calendars/${calendarId}/events/${eventId}?sendUpdates=all`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok && res.status !== 204) {
    const body = await res.text();
    throw new Error(`Google Calendar API [${res.status}]: ${body}`);
  }
  return { success: true };
}
