import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessDocumentRequest {
  documentId: string;
  fileName: string;
  fileType: string;
  storagePath: string;
  organizationId: string;
}

interface IntelligenceExtraction {
  summary: string;
  tags: string[];
  entities: {
    people: string[];
    organizations: string[];
    dates: string[];
    amounts: string[];
    locations: string[];
  };
  insights: string[];
  deadlines: Array<{ date: string; description: string; urgency: "low" | "medium" | "high" | "critical" }>;
  action_proposals: Array<{
    title: string;
    description: string;
    type: "task" | "email" | "workflow" | "pipeline_action";
    priority: "low" | "medium" | "high";
    suggested_assignee?: string;
    deadline?: string;
    risk_level: "low" | "medium" | "high" | "critical";
  }>;
  risk_signals: Array<{ signal: string; severity: "low" | "medium" | "high" | "critical" }>;
  document_classification: {
    category: string;
    subcategory: string;
    confidentiality: "public" | "internal" | "confidential" | "restricted";
  };
  key_metrics: Array<{ name: string; value: string; context: string }>;
  relationships: Array<{ entity1: string; relationship: string; entity2: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Validate JWT for Lovable Cloud (ES256 compatibility)
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
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { documentId, fileName, fileType, storagePath, organizationId } = body as Partial<ProcessDocumentRequest>;

    if (!documentId || !organizationId) {
      return new Response(
        JSON.stringify({ error: "documentId and organizationId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeFileName = fileName || "unknown";
    const safeFileType = (fileType || "").toLowerCase();
    const safeStoragePath = storagePath || "";

    console.log(`Processing document: ${safeFileName} (${documentId})`);

    // Update status to processing
    await supabase
      .from("documents")
      .update({ processing_status: "processing" })
      .eq("id", documentId);

    // Download the file content for text-based files
    let fileContent = "";
    let canExtractText = false;

    if (["txt", "pdf", "docx"].includes(safeFileType)) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(safeStoragePath);

      if (downloadError) {
        console.error("Error downloading file:", downloadError);
      } else if (fileData) {
        if (safeFileType === "txt") {
          fileContent = await fileData.text();
          canExtractText = true;
        } else {
          // For PDF/DOCX, we note we need richer parsing
          canExtractText = false;
        }
      }
    }

    // Build comprehensive AI prompt with tool calling for structured extraction
    const systemPrompt = `You are an elite intelligence analyst for an executive management platform. Your mission is to extract ACTIONABLE INTELLIGENCE from documents—not just summarize them.

Every document contains signals, patterns, and implications. Your job is to surface them with surgical precision.

EXTRACTION PRIORITIES:
1. ENTITIES: People, organizations, dates, amounts, locations
2. INSIGHTS: Non-obvious implications and strategic observations
3. DEADLINES: Time-sensitive items with urgency classification
4. ACTION PROPOSALS: Concrete next steps the executive should consider
5. RISK SIGNALS: Red flags, compliance issues, financial risks
6. RELATIONSHIPS: How entities connect to each other
7. KEY METRICS: Numbers that matter for decision-making

For ACTION PROPOSALS, generate specific, executable recommendations that require CEO/human approval:
- Tasks to assign
- Emails to draft
- Workflows to trigger
- Pipeline actions to queue

ACCURACY IS PARAMOUNT. If uncertain, indicate confidence level. Never fabricate entities or metrics.`;

    let userPrompt: string;
    if (canExtractText && fileContent.length > 0) {
      const truncatedContent = fileContent.length > 15000 
        ? fileContent.substring(0, 15000) + "\n\n[... document truncated for processing ...]"
        : fileContent;
      
      userPrompt = `Analyze this document and extract comprehensive intelligence:

FILE: ${safeFileName}
TYPE: ${safeFileType.toUpperCase()}

CONTENT:
${truncatedContent}`;
    } else {
      userPrompt = `Analyze this document based on available metadata and infer likely intelligence:

FILE: ${safeFileName}
TYPE: ${safeFileType.toUpperCase()}

Note: Full text extraction unavailable for this file type. Provide metadata-based analysis and indicate this limitation in your confidence assessment.`;
    }

    // Use tool calling for structured extraction
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_document_intelligence",
              description: "Extract structured intelligence from the document",
              parameters: {
                type: "object",
                properties: {
                  summary: { 
                    type: "string", 
                    description: "2-4 sentence executive summary capturing the document's strategic significance" 
                  },
                  tags: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "3-10 lowercase classification tags" 
                  },
                  entities: {
                    type: "object",
                    properties: {
                      people: { type: "array", items: { type: "string" } },
                      organizations: { type: "array", items: { type: "string" } },
                      dates: { type: "array", items: { type: "string" } },
                      amounts: { type: "array", items: { type: "string" } },
                      locations: { type: "array", items: { type: "string" } }
                    },
                    required: ["people", "organizations", "dates", "amounts", "locations"]
                  },
                  insights: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Strategic observations and non-obvious implications" 
                  },
                  deadlines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        description: { type: "string" },
                        urgency: { type: "string", enum: ["low", "medium", "high", "critical"] }
                      },
                      required: ["date", "description", "urgency"]
                    }
                  },
                  action_proposals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short action title" },
                        description: { type: "string", description: "Detailed action description" },
                        type: { type: "string", enum: ["task", "email", "workflow", "pipeline_action"] },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                        suggested_assignee: { type: "string", description: "Role or person to assign" },
                        deadline: { type: "string", description: "Suggested completion date" },
                        risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] }
                      },
                      required: ["title", "description", "type", "priority", "risk_level"]
                    },
                    description: "Proposed actions requiring CEO/human approval"
                  },
                  risk_signals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        signal: { type: "string" },
                        severity: { type: "string", enum: ["low", "medium", "high", "critical"] }
                      },
                      required: ["signal", "severity"]
                    }
                  },
                  document_classification: {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      subcategory: { type: "string" },
                      confidentiality: { type: "string", enum: ["public", "internal", "confidential", "restricted"] }
                    },
                    required: ["category", "subcategory", "confidentiality"]
                  },
                  key_metrics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        value: { type: "string" },
                        context: { type: "string" }
                      },
                      required: ["name", "value", "context"]
                    }
                  },
                  relationships: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        entity1: { type: "string" },
                        relationship: { type: "string" },
                        entity2: { type: "string" }
                      },
                      required: ["entity1", "relationship", "entity2"]
                    }
                  },
                  confidence_score: {
                    type: "number",
                    description: "0-1 confidence in extraction accuracy"
                  }
                },
                required: ["summary", "tags", "entities", "insights", "action_proposals", "document_classification", "confidence_score"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_document_intelligence" } },
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      // Fallback to basic analysis
      const fallbackIntelligence = createFallbackIntelligence(safeFileName, safeFileType);
      
      await updateDocumentWithIntelligence(supabase, documentId, fallbackIntelligence, 0.3, organizationId, safeFileName);

      return new Response(
        JSON.stringify({ 
          success: true, 
          intelligence: fallbackIntelligence,
          fallback: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    
    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let intelligence: IntelligenceExtraction;
    let confidenceScore = 0.85;

    if (toolCall?.function?.arguments) {
      try {
        intelligence = JSON.parse(toolCall.function.arguments);
        confidenceScore = intelligence.confidence_score || 0.85;
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError);
        intelligence = createFallbackIntelligence(safeFileName, safeFileType);
        confidenceScore = 0.3;
      }
    } else {
      // Try to extract from content if no tool call
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            intelligence = JSON.parse(jsonMatch[0]);
          } else {
            intelligence = createFallbackIntelligence(safeFileName, safeFileType);
            confidenceScore = 0.3;
          }
        } catch {
          intelligence = createFallbackIntelligence(safeFileName, safeFileType);
          confidenceScore = 0.3;
        }
      } else {
        intelligence = createFallbackIntelligence(safeFileName, safeFileType);
        confidenceScore = 0.3;
      }
    }

    // Update document with full intelligence
    await updateDocumentWithIntelligence(supabase, documentId, intelligence, confidenceScore, organizationId, fileName);

    console.log(`Document intelligence extracted: ${documentId}, confidence: ${confidenceScore}`);

    return new Response(
      JSON.stringify({
        success: true,
        intelligence,
        confidence: confidenceScore,
        proposed_actions: intelligence.action_proposals?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing document:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

async function updateDocumentWithIntelligence(
  supabase: any,
  documentId: string,
  intelligence: IntelligenceExtraction,
  confidenceScore: number,
  organizationId: string,
  fileName: string
) {
  // Clean tags
  const cleanedTags = (intelligence.tags || [])
    .map((tag: string) => tag.toLowerCase().trim().replace(/[^a-z0-9-]/g, ""))
    .filter((tag: string) => tag.length > 0 && tag.length < 30)
    .slice(0, 15);

  // Update document with intelligence
  const { error: updateError } = await supabase
    .from("documents")
    .update({
      summary: intelligence.summary?.substring(0, 1000) || `${fileName} analyzed`,
      tags: cleanedTags,
      intelligence: intelligence,
      intelligence_confidence: confidenceScore,
      intelligence_extracted_at: new Date().toISOString(),
      processing_status: "analyzed",
      proposed_actions_count: intelligence.action_proposals?.length || 0,
      processed_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (updateError) {
    console.error("Failed to update document:", updateError);
    throw new Error(`Failed to update document: ${updateError.message}`);
  }

  // Create timeline event
  await supabase.from("timeline_events").insert({
    organization_id: organizationId,
    event_type: "ai_action",
    title: "Document Intelligence Extracted",
    description: `AI analyzed "${fileName}": ${intelligence.action_proposals?.length || 0} action proposals, ${intelligence.risk_signals?.length || 0} risk signals, confidence ${Math.round(confidenceScore * 100)}%`,
    icon: "🧠",
    color: intelligence.risk_signals?.some(r => r.severity === "critical" || r.severity === "high") ? "orange" : "blue",
    confidence_score: confidenceScore,
  });

  // If there are action proposals, create a notification for CEO
  if (intelligence.action_proposals && intelligence.action_proposals.length > 0) {
    // Get CEO user for notification
    const { data: ceoRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("role", "ceo")
      .limit(1);

    if (ceoRoles && ceoRoles.length > 0) {
      const highRiskActions = intelligence.action_proposals.filter(a => a.risk_level === "high" || a.risk_level === "critical");
      
      await supabase.from("notifications").insert({
        organization_id: organizationId,
        user_id: ceoRoles[0].user_id,
        category: highRiskActions.length > 0 ? "decision" : "action",
        priority: highRiskActions.length > 0 ? "high" : "normal",
        title: `📄 Document Intelligence: ${fileName}`,
        body: `${intelligence.action_proposals.length} action proposals extracted. ${highRiskActions.length > 0 ? `⚠️ ${highRiskActions.length} high-risk items require attention.` : 'Review and approve to execute.'}`,
        source_type: "document",
        source_id: documentId,
        action_url: `/documents/${documentId}`,
        action_label: "Review Intelligence",
        icon: "📄",
      });
    }
  }
}

function createFallbackIntelligence(fileName: string, fileType: string): IntelligenceExtraction {
  const tags = inferTagsFromFilename(fileName, fileType);
  
  return {
    summary: `${fileType.toUpperCase()} document: ${fileName}. Full content analysis unavailable; metadata-based assessment provided.`,
    tags,
    entities: { people: [], organizations: [], dates: [], amounts: [], locations: [] },
    insights: ["Document uploaded for processing. Consider manual review for full intelligence extraction."],
    deadlines: [],
    action_proposals: [],
    risk_signals: [{ signal: "Limited extraction capability for this file type", severity: "low" }],
    document_classification: {
      category: inferCategoryFromFilename(fileName),
      subcategory: fileType,
      confidentiality: "internal"
    },
    key_metrics: [],
    relationships: [],
    confidence_score: 0.3
  };
}

function inferTagsFromFilename(fileName: string, fileType: string): string[] {
  const tags: string[] = [fileType];
  const lowerName = fileName.toLowerCase();

  const patterns: Record<string, string[]> = {
    contract: ["contract", "agreement", "legal"],
    invoice: ["invoice", "billing", "finance"],
    report: ["report", "analysis"],
    proposal: ["proposal", "pitch", "sales"],
    policy: ["policy", "compliance"],
    resume: ["resume", "cv", "hr"],
    budget: ["budget", "finance", "planning"],
    meeting: ["meeting", "notes", "minutes"],
    presentation: ["presentation", "deck"],
    template: ["template"],
  };

  for (const [keyword, relatedTags] of Object.entries(patterns)) {
    if (lowerName.includes(keyword)) {
      tags.push(...relatedTags);
    }
  }

  if (/q[1-4]|quarter/i.test(lowerName)) tags.push("quarterly");
  if (/202[0-9]|annual|yearly/i.test(lowerName)) tags.push("annual");
  if (/draft/i.test(lowerName)) tags.push("draft");
  if (/final/i.test(lowerName)) tags.push("final");

  return [...new Set(tags)].slice(0, 10);
}

function inferCategoryFromFilename(fileName: string): string {
  const lowerName = fileName.toLowerCase();
  if (/contract|agreement|legal|nda/.test(lowerName)) return "Legal";
  if (/invoice|receipt|payment|billing/.test(lowerName)) return "Finance";
  if (/report|analysis|review/.test(lowerName)) return "Reports";
  if (/proposal|pitch|deck/.test(lowerName)) return "Sales";
  if (/policy|procedure|compliance/.test(lowerName)) return "Compliance";
  if (/resume|cv|application/.test(lowerName)) return "HR";
  return "General";
}
