import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { organization_id, batch_type = 'premium', insurer_id } = await req.json();

    if (!organization_id) {
      return new Response(JSON.stringify({ error: 'organization_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check kill switch
    const { data: org } = await supabase.from('organizations').select('kill_switch_active').eq('id', organization_id).single();
    if (org?.kill_switch_active) {
      return new Response(JSON.stringify({ error: 'Kill switch active — reconciliation blocked' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create batch record
    const { data: batch, error: batchError } = await supabase
      .from('reconciliation_batches')
      .insert({
        organization_id,
        batch_type,
        insurer_id: insurer_id || null,
        status: 'processing',
        started_at: new Date().toISOString(),
        initiated_by: user.id,
      })
      .select()
      .single();

    if (batchError) throw batchError;

    let totalRecords = 0;
    let matchedCount = 0;
    let exceptionCount = 0;
    let totalAmount = 0;
    let matchedAmount = 0;
    let discrepancyAmount = 0;

    if (batch_type === 'premium') {
      // ── Premium Reconciliation ─────────────────────────────────────
      // Get all active policies
      let policyQuery = supabase
        .from('insurance_policies')
        .select('id, premium_amount, insurer_id, policy_number, status')
        .eq('organization_id', organization_id)
        .eq('status', 'active');
      if (insurer_id) policyQuery = policyQuery.eq('insurer_id', insurer_id);
      const { data: activePolicies } = await policyQuery;

      if (activePolicies && activePolicies.length > 0) {
        for (const policy of activePolicies) {
          totalRecords++;
          totalAmount += Number(policy.premium_amount);

          // Get premiums for this policy
          const { data: policyPremiums } = await supabase
            .from('premiums')
            .select('*')
            .eq('insurance_policy_id', policy.id)
            .eq('organization_id', organization_id)
            .order('due_date', { ascending: false })
            .limit(1);

          const latestPremium = policyPremiums?.[0];

          if (!latestPremium) {
            // Missing premium record
            exceptionCount++;
            discrepancyAmount += Number(policy.premium_amount);
            await supabase.from('reconciliation_exceptions').insert({
              organization_id,
              batch_id: batch.id,
              insurance_policy_id: policy.id,
              exception_type: 'missing_premium',
              expected_amount: Number(policy.premium_amount),
              actual_amount: 0,
              discrepancy: Number(policy.premium_amount),
              status: 'exception',
              metadata: { policy_number: policy.policy_number },
            });
          } else if (latestPremium.status === 'overdue') {
            exceptionCount++;
            const disc = Number(policy.premium_amount) - Number(latestPremium.paid_amount || 0);
            discrepancyAmount += disc;
            await supabase.from('reconciliation_exceptions').insert({
              organization_id,
              batch_id: batch.id,
              insurance_policy_id: policy.id,
              exception_type: 'overdue_premium',
              expected_amount: Number(policy.premium_amount),
              actual_amount: Number(latestPremium.paid_amount || 0),
              discrepancy: disc,
              status: 'exception',
              metadata: { policy_number: policy.policy_number, due_date: latestPremium.due_date },
            });
          } else if (latestPremium.status === 'paid') {
            matchedCount++;
            matchedAmount += Number(latestPremium.paid_amount || policy.premium_amount);
          } else {
            // Due but not overdue — count as pending
            matchedCount++;
            matchedAmount += Number(policy.premium_amount);
          }
        }
      }
    } else if (batch_type === 'commission') {
      // ── Commission Reconciliation ──────────────────────────────────
      let commQuery = supabase
        .from('commissions')
        .select('id, expected_amount, received_amount, insurance_policy_id, insurer_id, status')
        .eq('organization_id', organization_id);
      if (insurer_id) commQuery = commQuery.eq('insurer_id', insurer_id);
      const { data: allCommissions } = await commQuery;

      if (allCommissions && allCommissions.length > 0) {
        for (const commission of allCommissions) {
          totalRecords++;
          totalAmount += Number(commission.expected_amount);

          if (commission.status === 'received' && commission.received_amount !== null) {
            const diff = Math.abs(Number(commission.expected_amount) - Number(commission.received_amount));
            if (diff > 0.01) {
              // Amount mismatch
              exceptionCount++;
              discrepancyAmount += diff;
              await supabase.from('reconciliation_exceptions').insert({
                organization_id,
                batch_id: batch.id,
                insurance_policy_id: commission.insurance_policy_id,
                exception_type: 'commission_mismatch',
                expected_amount: Number(commission.expected_amount),
                actual_amount: Number(commission.received_amount),
                discrepancy: diff,
                status: 'exception',
                metadata: { commission_id: commission.id, insurer_id: commission.insurer_id },
              });
            } else {
              matchedCount++;
              matchedAmount += Number(commission.received_amount);
            }
          } else if (commission.status === 'pending') {
            exceptionCount++;
            discrepancyAmount += Number(commission.expected_amount);
            await supabase.from('reconciliation_exceptions').insert({
              organization_id,
              batch_id: batch.id,
              insurance_policy_id: commission.insurance_policy_id,
              exception_type: 'pending_commission',
              expected_amount: Number(commission.expected_amount),
              actual_amount: 0,
              discrepancy: Number(commission.expected_amount),
              status: 'exception',
              metadata: { commission_id: commission.id, insurer_id: commission.insurer_id },
            });
          } else {
            matchedCount++;
            matchedAmount += Number(commission.received_amount || commission.expected_amount);
          }
        }
      }
    }

    // Update batch with results
    await supabase
      .from('reconciliation_batches')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_records: totalRecords,
        matched_count: matchedCount,
        exception_count: exceptionCount,
        total_amount: totalAmount,
        matched_amount: matchedAmount,
        discrepancy_amount: discrepancyAmount,
      })
      .eq('id', batch.id);

    // Audit log
    const { data: prevHash } = await supabase.rpc('latest_audit_hash', { p_org_id: organization_id });
    const { data: seqNum } = await supabase.rpc('next_audit_sequence', { p_org_id: organization_id });
    const details = { batch_id: batch.id, batch_type, totalRecords, matchedCount, exceptionCount, discrepancyAmount };
    const { data: hash } = await supabase.rpc('generate_audit_hash', {
      p_org_id: organization_id,
      p_event_type: 'reconciliation',
      p_action: 'reconciliation_completed',
      p_details: details,
      p_previous_hash: prevHash || 'GENESIS',
      p_timestamp: new Date().toISOString(),
    });

    await supabase.from('audit_log').insert({
      organization_id,
      event_type: 'reconciliation',
      action: 'reconciliation_completed',
      actor_id: user.id,
      actor_type: 'user',
      resource_type: 'reconciliation_batch',
      resource_id: batch.id,
      details,
      event_hash: hash || 'N/A',
      previous_hash: prevHash || 'GENESIS',
      sequence_number: seqNum || 1,
    });

    return new Response(
      JSON.stringify({
        success: true,
        batch_id: batch.id,
        summary: { totalRecords, matchedCount, exceptionCount, totalAmount, matchedAmount, discrepancyAmount },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Reconciliation error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
