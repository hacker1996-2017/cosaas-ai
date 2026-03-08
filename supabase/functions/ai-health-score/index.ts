import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.organization_id;
    const { clientId } = await req.json();

    // Fetch client data
    const clientQuery = clientId
      ? supabase.from("clients").select("*").eq("id", clientId).eq("organization_id", orgId)
      : supabase.from("clients").select("*").eq("organization_id", orgId);

    const { data: clients } = await clientQuery;
    if (!clients?.length) {
      return new Response(JSON.stringify({ error: "No clients found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const client of clients) {
      // Gather signals
      const [
        { data: recentMessages },
        { data: recentEmails },
        { data: tasks },
        { data: policies },
        { data: notes },
      ] = await Promise.all([
        supabase.from("messages").select("created_at, sender_type, ai_classification, risk_level")
          .eq("client_id", client.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("emails").select("created_at, status, opened_at")
          .eq("client_id", client.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("client_tasks").select("status, priority, due_date")
          .eq("client_id", client.id),
        supabase.from("insurance_policies").select("status, premium_amount, expiry_date")
          .eq("client_id", client.id),
        supabase.from("client_notes").select("content, note_type, created_at")
          .eq("client_id", client.id).order("created_at", { ascending: false }).limit(5),
      ]);

      // Compute score components (0-100 each)
      let engagementScore = 50;
      let financialScore = 50;
      let operationalScore = 50;
      let sentimentScore = 50;

      // Engagement: recent contact recency + message volume
      const msgCount = (recentMessages?.length || 0) + (recentEmails?.length || 0);
      if (msgCount > 10) engagementScore = 90;
      else if (msgCount > 5) engagementScore = 75;
      else if (msgCount > 2) engagementScore = 60;
      else if (msgCount > 0) engagementScore = 40;
      else engagementScore = 20;

      // Recency boost
      const lastContact = client.last_contact_at ? new Date(client.last_contact_at) : null;
      if (lastContact) {
        const daysSince = (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) engagementScore = Math.min(100, engagementScore + 15);
        else if (daysSince > 30) engagementScore = Math.max(0, engagementScore - 20);
        else if (daysSince > 60) engagementScore = Math.max(0, engagementScore - 35);
      }

      // Financial: MRR, lifetime value, policy health
      const mrr = Number(client.mrr) || 0;
      const ltv = Number(client.lifetime_value) || 0;
      if (mrr > 5000) financialScore = 90;
      else if (mrr > 1000) financialScore = 75;
      else if (mrr > 0) financialScore = 55;
      else financialScore = 30;

      const activePolicies = policies?.filter(p => p.status === 'active').length || 0;
      if (activePolicies > 2) financialScore = Math.min(100, financialScore + 10);

      // Operational: task completion
      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
      const overdueTasks = tasks?.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length || 0;
      if (totalTasks > 0) {
        operationalScore = Math.round((completedTasks / totalTasks) * 100);
      }
      operationalScore = Math.max(0, operationalScore - (overdueTasks * 10));

      // Sentiment: risk classifications from messages
      const highRiskMsgs = recentMessages?.filter(m => m.risk_level === 'high' || m.risk_level === 'critical').length || 0;
      const complainMsgs = recentMessages?.filter(m => m.ai_classification === 'complaint' || m.ai_classification === 'billing').length || 0;
      sentimentScore = Math.max(0, 80 - (highRiskMsgs * 15) - (complainMsgs * 10));

      // Weighted composite
      const healthScore = Math.round(
        engagementScore * 0.30 +
        financialScore * 0.25 +
        operationalScore * 0.20 +
        sentimentScore * 0.25
      );

      // Determine risk level
      let riskLevel: string;
      if (healthScore >= 80) riskLevel = 'low';
      else if (healthScore >= 60) riskLevel = 'medium';
      else if (healthScore >= 40) riskLevel = 'high';
      else riskLevel = 'critical';

      // Build recommendations
      const recommendations: string[] = [];
      if (engagementScore < 50) recommendations.push('Schedule a check-in call — engagement is low');
      if (financialScore < 50) recommendations.push('Review pricing and upsell opportunities');
      if (operationalScore < 50) recommendations.push('Clear overdue tasks and follow up on blockers');
      if (sentimentScore < 50) recommendations.push('Address recent complaints or billing concerns');
      if (overdueTasks > 2) recommendations.push(`${overdueTasks} tasks overdue — prioritize resolution`);

      // Update client health score in DB
      await supabase
        .from("clients")
        .update({
          health_score: healthScore,
          risk_of_churn: riskLevel as any,
        })
        .eq("id", client.id);

      results.push({
        clientId: client.id,
        clientName: client.name,
        healthScore,
        riskLevel,
        breakdown: { engagementScore, financialScore, operationalScore, sentimentScore },
        recommendations,
        signals: { msgCount, activePolicies, totalTasks, completedTasks, overdueTasks },
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
