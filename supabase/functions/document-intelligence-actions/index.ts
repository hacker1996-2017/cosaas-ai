import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActionProposal {
  title: string;
  description: string;
  type: "task" | "email" | "workflow" | "pipeline_action";
  priority: "low" | "medium" | "high";
  suggested_assignee?: string;
  deadline?: string;
  risk_level: "low" | "medium" | "high" | "critical";
}

interface CreateActionsRequest {
  documentId: string;
  organizationId: string;
  selectedActionIndices?: number[]; // If provided, only create these actions; otherwise create all
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { documentId, organizationId, selectedActionIndices }: CreateActionsRequest = await req.json();

    // Fetch document with intelligence
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const intelligence = document.intelligence as any;
    if (!intelligence?.action_proposals || intelligence.action_proposals.length === 0) {
      return new Response(
        JSON.stringify({ error: "No action proposals in document intelligence" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const proposals: ActionProposal[] = selectedActionIndices
      ? selectedActionIndices.map(i => intelligence.action_proposals[i]).filter(Boolean)
      : intelligence.action_proposals;

    const createdItems: any[] = [];
    const timestamp = new Date().toISOString();

    for (const proposal of proposals) {
      try {
        switch (proposal.type) {
          case "task": {
            // Create a client task (general task without specific client)
            // For now, create as an action pipeline entry
            const { data: action, error } = await supabase
              .from("action_pipeline")
              .insert({
                organization_id: organizationId,
                action_type: "create_task",
                action_description: proposal.title,
                action_params: {
                  title: proposal.title,
                  description: proposal.description,
                  priority: proposal.priority,
                  deadline: proposal.deadline,
                  source_document_id: documentId,
                  suggested_assignee: proposal.suggested_assignee,
                },
                category: "communication",
                risk_level: proposal.risk_level,
                status: "pending_approval",
                requires_approval: true,
                created_by: user.id,
              })
              .select()
              .single();

            if (!error && action) {
              createdItems.push({ type: "action_pipeline", id: action.id, title: proposal.title });
            }
            break;
          }

          case "email": {
            // Create draft email action
            const { data: action, error } = await supabase
              .from("action_pipeline")
              .insert({
                organization_id: organizationId,
                action_type: "send_email",
                action_description: `Draft email: ${proposal.title}`,
                action_params: {
                  subject: proposal.title,
                  body_draft: proposal.description,
                  source_document_id: documentId,
                  priority: proposal.priority,
                },
                category: "communication",
                risk_level: proposal.risk_level,
                status: "pending_approval",
                requires_approval: true,
                created_by: user.id,
              })
              .select()
              .single();

            if (!error && action) {
              createdItems.push({ type: "action_pipeline", id: action.id, title: proposal.title });
            }
            break;
          }

          case "workflow": {
            // Create workflow trigger action
            const { data: action, error } = await supabase
              .from("action_pipeline")
              .insert({
                organization_id: organizationId,
                action_type: "trigger_workflow",
                action_description: `Workflow: ${proposal.title}`,
                action_params: {
                  workflow_name: proposal.title,
                  trigger_reason: proposal.description,
                  source_document_id: documentId,
                  priority: proposal.priority,
                },
                category: "system",
                risk_level: proposal.risk_level,
                status: "pending_approval",
                requires_approval: true,
                created_by: user.id,
              })
              .select()
              .single();

            if (!error && action) {
              createdItems.push({ type: "action_pipeline", id: action.id, title: proposal.title });
            }
            break;
          }

          case "pipeline_action": {
            // Create general pipeline action
            const { data: action, error } = await supabase
              .from("action_pipeline")
              .insert({
                organization_id: organizationId,
                action_type: "custom_action",
                action_description: proposal.title,
                action_params: {
                  title: proposal.title,
                  description: proposal.description,
                  source_document_id: documentId,
                  priority: proposal.priority,
                  deadline: proposal.deadline,
                },
                category: "system",
                risk_level: proposal.risk_level,
                status: "pending_approval",
                requires_approval: true,
                created_by: user.id,
              })
              .select()
              .single();

            if (!error && action) {
              createdItems.push({ type: "action_pipeline", id: action.id, title: proposal.title });
            }
            break;
          }
        }
      } catch (itemError) {
        console.error(`Failed to create action for proposal: ${proposal.title}`, itemError);
      }
    }

    // Update document status to actioned
    await supabase
      .from("documents")
      .update({ 
        processing_status: "actioned",
        updated_at: timestamp,
      })
      .eq("id", documentId);

    // Create timeline event
    await supabase.from("timeline_events").insert({
      organization_id: organizationId,
      event_type: "ai_action",
      title: "Document Actions Queued",
      description: `${createdItems.length} actions created from document intelligence and queued for approval`,
      icon: "⚡",
      color: "green",
      confidence_score: 1.0,
    });

    // Create audit log entry
    const latestHash = await getLatestAuditHash(supabase, organizationId);
    const seqNum = await getNextAuditSequence(supabase, organizationId);
    const eventHash = await generateAuditHash(
      supabase,
      organizationId,
      "document_actions_created",
      `Created ${createdItems.length} actions from document ${documentId}`,
      { document_id: documentId, actions_created: createdItems.length, action_ids: createdItems.map(a => a.id) },
      latestHash,
      timestamp
    );

    await supabase.from("audit_log").insert({
      organization_id: organizationId,
      event_type: "document_actions_created",
      action: `Created ${createdItems.length} actions from document intelligence`,
      resource_type: "document",
      resource_id: documentId,
      actor_id: user.id,
      actor_type: "user",
      details: { 
        document_id: documentId, 
        actions_created: createdItems.length,
        action_ids: createdItems.map(a => a.id),
        proposals_processed: proposals.length,
      },
      sequence_number: seqNum,
      event_hash: eventHash,
      previous_hash: latestHash,
    });

    return new Response(
      JSON.stringify({
        success: true,
        created_count: createdItems.length,
        created_items: createdItems,
        message: `${createdItems.length} actions queued for approval`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating document actions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getLatestAuditHash(supabase: any, orgId: string): Promise<string> {
  const { data } = await supabase.rpc("latest_audit_hash", { p_org_id: orgId });
  return data || "GENESIS";
}

async function getNextAuditSequence(supabase: any, orgId: string): Promise<number> {
  const { data } = await supabase.rpc("next_audit_sequence", { p_org_id: orgId });
  return data || 1;
}

async function generateAuditHash(
  supabase: any,
  orgId: string,
  eventType: string,
  action: string,
  details: any,
  previousHash: string,
  timestamp: string
): Promise<string> {
  const { data } = await supabase.rpc("generate_audit_hash", {
    p_org_id: orgId,
    p_event_type: eventType,
    p_action: action,
    p_details: details,
    p_previous_hash: previousHash,
    p_timestamp: timestamp,
  });
  return data || "HASH_ERROR";
}
