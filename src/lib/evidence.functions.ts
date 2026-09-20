import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AiResult = {
  vegetation_health: number;
  canopy_density: number;
  ecosystem_match: boolean;
  confidence_score: number;
  summary: string;
  species_guess: string;
};

function clampPct(value: unknown, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export const analyzeEvidencePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { evidenceId: string }) => {
    if (!input?.evidenceId || typeof input.evidenceId !== "string") {
      throw new Error("evidenceId is required");
    }
    return { evidenceId: input.evidenceId };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: evidence, error: evidenceError } = await supabase
      .from("evidence_submissions")
      .select("id, photo_path, project_id")
      .eq("id", data.evidenceId)
      .maybeSingle();
    if (evidenceError) throw evidenceError;
    if (!evidence?.photo_path) throw new Error("Evidence photo not found");

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("ecosystem, name")
      .eq("id", evidence.project_id)
      .maybeSingle();
    if (projectError) throw projectError;

    const { data: file, error: fileError } = await supabase.storage
      .from("evidence-photos")
      .download(evidence.photo_path);
    if (fileError || !file) throw new Error("Could not read the uploaded photo");

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mime = file.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${base64}`;

    const declared = project?.ecosystem ?? "mangrove";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a blue-carbon MRV analyst. Assess field photos of coastal restoration sites. Respond ONLY by calling the provided tool.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `This photo was submitted as evidence for a restoration project whose declared ecosystem type is "${declared}" (options: mangrove, seagrass, salt_marsh). Score vegetation health (0-100), estimate canopy/vegetation density (0-100), state whether the vegetation visible is consistent with the declared ecosystem type, and give an overall confidence score (0-100) that this photo is valid, high-quality evidence for this ecosystem. If the image is unclear, unrelated, or inconsistent with the declared ecosystem, give a low confidence score.`,
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_analysis",
              description: "Report the vegetation analysis of the evidence photo",
              parameters: {
                type: "object",
                properties: {
                  vegetation_health: { type: "number", description: "0-100" },
                  canopy_density: { type: "number", description: "0-100" },
                  ecosystem_match: { type: "boolean" },
                  confidence_score: { type: "number", description: "0-100" },
                  summary: { type: "string", description: "One or two sentence assessment" },
                },
                required: [
                  "vegetation_health",
                  "canopy_density",
                  "ecosystem_match",
                  "confidence_score",
                  "summary",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_analysis" } },
      }),
    });

    if (response.status === 429) throw new Error("AI rate limit reached, please try again shortly.");
    if (response.status === 402) throw new Error("AI credits exhausted for this workspace.");
    if (!response.ok) {
      console.error("AI gateway error", response.status, await response.text());
      throw new Error("AI analysis failed");
    }

    const payload = (await response.json()) as {
      choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
    };
    const args = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("AI analysis returned no result");

    const parsed = JSON.parse(args) as Partial<AiResult>;
    const result: AiResult = {
      vegetation_health: clampPct(parsed.vegetation_health),
      canopy_density: clampPct(parsed.canopy_density),
      ecosystem_match: Boolean(parsed.ecosystem_match),
      confidence_score: clampPct(parsed.confidence_score),
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };

    const status = result.confidence_score < 60 ? "flagged" : "pending";

    const { error: updateError } = await supabase
      .from("evidence_submissions")
      .update({
        ai_confidence_score: result.confidence_score,
        ai_vegetation_health: result.vegetation_health,
        ai_canopy_density: result.canopy_density,
        ai_ecosystem_match: result.ecosystem_match,
        ai_summary: result.summary,
        status,
      })
      .eq("id", evidence.id);
    if (updateError) throw updateError;

    return { ...result, status };
  });
