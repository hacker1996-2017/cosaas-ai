import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HUBSPOT_API = 'https://api.hubapi.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Verify JWT
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: { claims }, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claims) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const userId = claims.sub;

    // Service client for secure DB operations
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Get user's org
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!profile?.organization_id) {
      return jsonResponse({ error: 'User has no organization' }, 400);
    }
    const orgId = profile.organization_id;

    const body = await req.json();
    const { action, ...params } = body;

    // ─── CONNECT (save token) ───────────────────────────────────────────────
    if (action === 'connect') {
      const { access_token } = params;
      if (!access_token) {
        return jsonResponse({ error: 'access_token is required' }, 400);
      }

      // Validate token with HubSpot
      const testRes = await fetch(`${HUBSPOT_API}/account-info/v3/details`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!testRes.ok) {
        const errText = await testRes.text();
        console.error('HubSpot token validation failed:', testRes.status, errText);
        return jsonResponse({ error: 'Invalid HubSpot access token. Please check the token and try again.', code: 'INVALID_TOKEN' }, 400);
      }

      const portalInfo = await testRes.json();

      // Upsert to DB
      const { error: saveErr } = await serviceClient
        .from('hubspot_config')
        .upsert({
          organization_id: orgId,
          access_token,
          portal_id: String(portalInfo.portalId),
          hub_domain: portalInfo.uiDomain || null,
          hub_name: portalInfo.accountType || 'HubSpot',
          connected_by: userId,
        }, { onConflict: 'organization_id' });

      if (saveErr) {
        console.error('Failed to save HubSpot config:', saveErr);
        return jsonResponse({ error: 'Failed to save HubSpot configuration' }, 500);
      }

      return jsonResponse({
        success: true,
        portal: {
          portalId: portalInfo.portalId,
          uiDomain: portalInfo.uiDomain,
          timeZone: portalInfo.timeZone,
        },
      });
    }

    // ─── GET CONFIG (requires existing connection) ──────────────────────────
    const { data: config } = await serviceClient
      .from('hubspot_config')
      .select('access_token, portal_id, hub_domain, hub_name, last_sync_at, contacts_synced')
      .eq('organization_id', orgId)
      .maybeSingle();

    // Actions that don't need config
    if (action === 'status') {
      return jsonResponse({
        connected: !!config,
        portalId: config?.portal_id || null,
        hubDomain: config?.hub_domain || null,
        hubName: config?.hub_name || null,
        lastSyncAt: config?.last_sync_at || null,
        contactsSynced: config?.contacts_synced || 0,
      });
    }

    if (!config) {
      return jsonResponse({ error: 'HubSpot not connected', code: 'NOT_CONNECTED' }, 400);
    }

    const hubToken = config.access_token;

    // ─── DISCONNECT ─────────────────────────────────────────────────────────
    if (action === 'disconnect') {
      const { error: delErr } = await serviceClient
        .from('hubspot_config')
        .delete()
        .eq('organization_id', orgId);

      if (delErr) {
        return jsonResponse({ error: 'Failed to disconnect' }, 500);
      }
      return jsonResponse({ success: true });
    }

    // ─── LIST CONTACTS ──────────────────────────────────────────────────────
    if (action === 'list_contacts') {
      const limit = params.limit || 20;
      const res = await hubspotGet(
        hubToken,
        `/crm/v3/objects/contacts?properties=firstname,lastname,email,phone,company&limit=${limit}`
      );
      return jsonResponse(res);
    }

    // ─── LIST DEALS ─────────────────────────────────────────────────────────
    if (action === 'list_deals') {
      const limit = params.limit || 10;
      const res = await hubspotGet(
        hubToken,
        `/crm/v3/objects/deals?properties=dealname,amount,dealstage,closedate,pipeline&limit=${limit}`
      );
      return jsonResponse(res);
    }

    // ─── SYNC CONTACTS (HubSpot → Clients table) ────────────────────────────
    if (action === 'sync_contacts') {
      // Fetch up to 100 contacts from HubSpot
      const hsRes = await hubspotGet(
        hubToken,
        '/crm/v3/objects/contacts?properties=firstname,lastname,email,phone,company&limit=100'
      );

      const contacts = hsRes.results || [];
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const contact of contacts) {
        const props = contact.properties || {};
        const email = props.email?.trim();
        const firstName = props.firstname?.trim() || '';
        const lastName = props.lastname?.trim() || '';
        const name = `${firstName} ${lastName}`.trim() || email || `Contact ${contact.id}`;

        if (!name) {
          skipped++;
          continue;
        }

        // Check if client exists by email (if email present)
        let existingClient = null;
        if (email) {
          const { data: found } = await serviceClient
            .from('clients')
            .select('id')
            .eq('organization_id', orgId)
            .eq('email', email)
            .maybeSingle();
          existingClient = found;
        }

        const clientData = {
          organization_id: orgId,
          name,
          email: email || null,
          phone: props.phone || null,
          company: props.company || null,
          metadata: { hubspot_id: contact.id },
        };

        if (existingClient) {
          await serviceClient
            .from('clients')
            .update(clientData)
            .eq('id', existingClient.id);
          updated++;
        } else {
          await serviceClient
            .from('clients')
            .insert(clientData);
          created++;
        }
      }

      // Update sync stats
      await serviceClient
        .from('hubspot_config')
        .update({
          last_sync_at: new Date().toISOString(),
          contacts_synced: (config.contacts_synced || 0) + created,
        })
        .eq('organization_id', orgId);

      return jsonResponse({
        success: true,
        summary: { total: contacts.length, created, updated, skipped },
      });
    }

    // ─── PUSH CLIENT TO HUBSPOT ─────────────────────────────────────────────
    if (action === 'push_contact') {
      const { clientId } = params;
      if (!clientId) return jsonResponse({ error: 'clientId is required' }, 400);

      const { data: client } = await serviceClient
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('organization_id', orgId)
        .single();

      if (!client) return jsonResponse({ error: 'Client not found' }, 404);

      const nameParts = (client.name || '').split(' ');
      const properties: Record<string, string> = {
        firstname: nameParts[0] || '',
        lastname: nameParts.slice(1).join(' ') || '',
      };
      if (client.email) properties.email = client.email;
      if (client.phone) properties.phone = client.phone;
      if (client.company) properties.company = client.company;

      const hsRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties }),
      });

      if (!hsRes.ok) {
        const errText = await hsRes.text();
        throw new Error(`HubSpot API error [${hsRes.status}]: ${errText}`);
      }

      const hsContact = await hsRes.json();

      // Update client metadata with HubSpot ID
      await serviceClient
        .from('clients')
        .update({ metadata: { ...client.metadata, hubspot_id: hsContact.id } })
        .eq('id', clientId);

      return jsonResponse({ success: true, hubspotContactId: hsContact.id });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[hubspot]', message);
    return jsonResponse({ error: message }, 500);
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hubspotGet(token: string, path: string) {
  const res = await fetch(`${HUBSPOT_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot API [${res.status}]: ${body}`);
  }
  return res.json();
}
