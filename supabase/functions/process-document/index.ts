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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { documentId, fileName, fileType, storagePath, organizationId }: ProcessDocumentRequest = await req.json();

    console.log(`Processing document: ${fileName} (${documentId})`);

    // Download the file content for text-based files
    let fileContent = "";
    let canExtractText = false;

    // For text-based files, we can extract content
    if (["txt", "pdf", "docx"].includes(fileType)) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(storagePath);

      if (downloadError) {
        console.error("Error downloading file:", downloadError);
      } else if (fileData) {
        // For txt files, we can read directly
        if (fileType === "txt") {
          fileContent = await fileData.text();
          canExtractText = true;
        } else {
          // For PDF/DOCX, we'll use metadata-based summarization
          // In production, you'd use a proper document parser
          canExtractText = false;
        }
      }
    }

    // Build AI prompt based on what we can extract
    const systemPrompt = `You are an AI document analyst for an executive management platform. Your job is to analyze documents and provide:
1. A concise summary (2-3 sentences max) that captures the key purpose and content
2. Relevant tags for categorization (3-7 tags)

You must respond with a JSON object in this exact format:
{
  "summary": "Brief summary of the document",
  "tags": ["tag1", "tag2", "tag3"]
}

Tags should be lowercase, single words or hyphenated phrases. Focus on:
- Document type (contract, report, policy, invoice, proposal, etc.)
- Subject matter (finance, legal, hr, marketing, sales, operations, etc.)
- Urgency or status if apparent (urgent, draft, final, pending, etc.)
- Key entities or topics mentioned`;

    let userPrompt: string;

    if (canExtractText && fileContent.length > 0) {
      // Truncate content if too long
      const truncatedContent = fileContent.length > 10000 
        ? fileContent.substring(0, 10000) + "... [truncated]"
        : fileContent;
      
      userPrompt = `Analyze this document:

File name: ${fileName}
File type: ${fileType.toUpperCase()}

Content:
${truncatedContent}`;
    } else {
      // Metadata-based analysis when we can't extract text
      userPrompt = `Analyze this document based on its metadata:

File name: ${fileName}
File type: ${fileType.toUpperCase()}

Since I cannot read the file content directly, infer the likely purpose and appropriate tags based on the filename and file type. Be conservative in your summary, noting that it's based on metadata only.`;
    }

    // Call Lovable AI for analysis
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
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      // Fallback to basic metadata-based tagging
      const fallbackTags = inferTagsFromFilename(fileName, fileType);
      const fallbackSummary = `${fileType.toUpperCase()} document: ${fileName}`;

      const { error: updateError } = await supabase
        .from("documents")
        .update({
          summary: fallbackSummary,
          tags: fallbackTags,
          processed_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (updateError) {
        throw new Error(`Failed to update document: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          summary: fallbackSummary, 
          tags: fallbackTags,
          fallback: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse AI response
    let analysis: { summary: string; tags: string[] };
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback
      analysis = {
        summary: `${fileType.toUpperCase()} document uploaded: ${fileName}`,
        tags: inferTagsFromFilename(fileName, fileType),
      };
    }

    // Validate and clean tags
    const cleanedTags = analysis.tags
      .map((tag: string) => tag.toLowerCase().trim().replace(/[^a-z0-9-]/g, ""))
      .filter((tag: string) => tag.length > 0 && tag.length < 30)
      .slice(0, 10);

    // Update the document with AI analysis
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        summary: analysis.summary.substring(0, 500),
        tags: cleanedTags,
        processed_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateError) {
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    // Create timeline event for document processing
    await supabase.from("timeline_events").insert({
      organization_id: organizationId,
      event_type: "ai_action",
      title: "Document Analyzed",
      description: `AI processed "${fileName}" and extracted ${cleanedTags.length} tags`,
      icon: "📄",
      color: "blue",
      confidence_score: 0.85,
    });

    console.log(`Document processed successfully: ${documentId}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: analysis.summary,
        tags: cleanedTags,
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

// Helper function to infer tags from filename
function inferTagsFromFilename(fileName: string, fileType: string): string[] {
  const tags: string[] = [fileType];
  const lowerName = fileName.toLowerCase();

  // Common document type patterns
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

  // Date-related patterns
  if (/q[1-4]|quarter/i.test(lowerName)) tags.push("quarterly");
  if (/202[0-9]|annual|yearly/i.test(lowerName)) tags.push("annual");
  if (/draft/i.test(lowerName)) tags.push("draft");
  if (/final/i.test(lowerName)) tags.push("final");

  return [...new Set(tags)].slice(0, 7);
}
