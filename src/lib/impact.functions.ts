import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ImpactStory = {
  story: string | null;
  generatedAt: string | null;
  stats: {
    startDate: string | null;
    verifiedCount: number;
    totalCount: number;
    firstCanopy: number | null;
    latestCanopy: number | null;
    firstHealth: number | null;
    latestHealth: number | null;
    tco2e: number;
    status: string;
    ecosystem: string;
    areaHectares: number;
    name: string;
  } | null;
};

type MinimalClient = {
  from: (table: string) => any;
};

function anonClientFactory() {
  return import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
}

/** Accumulate the streamed Responses API output into a single string. */
async function astraNarrative(prompt: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      input: prompt,
      stream: true,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
    }),
  });

  if (res.status === 429) throw new Error("AI rate limit reached, please try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
  if (!res.ok || !res.body) {
    console.error("Impact story gateway error", res.status, await res.text().catch(() => ""));
    throw new Error("Could not generate the impact summary");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let done = false;
  while (!done) {
    const chunk = await reader.read();
    done = chunk.done;
    if (chunk.value) buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        } else if (event.type === "response.completed" && !text) {
          text = event.response?.output_text ?? "";
        }
      } catch {
        // ignore partial/unknown events
      }
    }
  }
  return text.trim();
}

async function buildStory(client: MinimalClient, projectId: string, force: boolean): Promise<ImpactStory> {
  const { data: project, error } = await client
    .from("projects")
    .select(
      "id, name, ecosystem, status, area_hectares, health_score, created_at, updated_at, impact_story, impact_story_generated_at",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) return { story: null, generatedAt: null, stats: null };

  const [{ data: evidence }, { data: credits }] = await Promise.all([
    client
      .from("evidence_submissions")
      .select("id, status, captured_at, created_at, reviewed_at, ai_canopy_density, ai_vegetation_health")
      .eq("project_id", projectId)
      .order("captured_at", { ascending: true }),
    client.from("carbon_credits").select("id, tco2e, created_at").eq("project_id", projectId),
  ]);

  const rows = (evidence ?? []) as {
    status: string;
    captured_at: string;
    created_at: string;
    reviewed_at: string | null;
    ai_canopy_density: number | null;
    ai_vegetation_health: number | null;
  }[];
  const creditRows = (credits ?? []) as { tco2e: number | string; created_at: string }[];

  const verified = rows.filter((r) => r.status === "verified" || r.status === "approved");
  const canopySeries = verified.filter((r) => r.ai_canopy_density != null);
  const healthSeries = verified.filter((r) => r.ai_vegetation_health != null);
  const tco2e = creditRows.reduce((sum, c) => sum + Number(c.tco2e ?? 0), 0);

  const stats: NonNullable<ImpactStory["stats"]> = {
    startDate: rows[0]?.captured_at ?? project.created_at ?? null,
    verifiedCount: verified.length,
    totalCount: rows.length,
    firstCanopy: canopySeries[0]?.ai_canopy_density ?? null,
    latestCanopy: canopySeries[canopySeries.length - 1]?.ai_canopy_density ?? null,
    firstHealth: healthSeries[0]?.ai_vegetation_health ?? null,
    latestHealth: healthSeries[healthSeries.length - 1]?.ai_vegetation_health ?? null,
    tco2e: Number(tco2e.toFixed(2)),
    status: project.status,
    ecosystem: project.ecosystem,
    areaHectares: Number(project.area_hectares ?? 0),
    name: project.name,
  };

  // Regenerate only when the underlying record has moved on since the last write.
  const marks = [
    project.updated_at,
    ...rows.map((r) => r.reviewed_at ?? r.created_at),
    ...creditRows.map((c) => c.created_at),
  ]
    .filter(Boolean)
    .map((v) => new Date(v as string).getTime());
  const newestChange = marks.length ? Math.max(...marks) : 0;
  const generatedAt = project.impact_story_generated_at
    ? new Date(project.impact_story_generated_at).getTime()
    : 0;
  const stale = !project.impact_story || generatedAt < newestChange;

  if (!force && !stale) {
    return {
      story: project.impact_story,
      generatedAt: project.impact_story_generated_at,
      stats,
    };
  }

  const facts = [
    `Project name: ${stats.name}`,
    `Ecosystem: ${stats.ecosystem.replace("_", " ")}`,
    `Restoration area: ${stats.areaHectares} hectares`,
    `Current registry status: ${stats.status}`,
    `First field record captured: ${stats.startDate ? new Date(stats.startDate).toDateString() : "not yet"}`,
    `Verified submissions: ${stats.verifiedCount} of ${stats.totalCount} total submissions`,
    stats.firstCanopy != null && stats.latestCanopy != null
      ? `Canopy cover, first verified reading ${stats.firstCanopy}% → latest verified reading ${stats.latestCanopy}%`
      : "Canopy cover trend: not enough verified readings yet",
    stats.firstHealth != null && stats.latestHealth != null
      ? `Vegetation health, first ${stats.firstHealth}% → latest ${stats.latestHealth}%`
      : "Vegetation health trend: not enough verified readings yet",
    `Carbon credits issued to date: ${stats.tco2e} tCO2e`,
  ].join("\n");

  const prompt = `You write short, factual restoration impact summaries for a blue-carbon registry.

Using ONLY the data below, write ONE paragraph of 2-3 sentences (max 60 words) that a funder could read. Start with the time frame ("Since <month year>, ..."). Mention the verified submission count, the canopy or health trend if available, and the credits issued. Never invent numbers, species, people or places. If a trend or credit total is missing, say so plainly instead of guessing. Plain prose only, no markdown, no bullet points, no headings.

DATA
${facts}`;

  let story: string;
  try {
    story = await astraNarrative(prompt);
  } catch (aiError) {
    console.error(aiError);
    // Fall back to the cached story rather than losing the panel entirely.
    return { story: project.impact_story ?? null, generatedAt: project.impact_story_generated_at, stats };
  }
  if (!story) {
    return { story: project.impact_story ?? null, generatedAt: project.impact_story_generated_at, stats };
  }

  const now = new Date().toISOString();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error: writeError } = await supabaseAdmin
    .from("projects")
    .update({ impact_story: story, impact_story_generated_at: now })
    .eq("id", projectId);
  if (writeError) console.error("Could not cache impact story", writeError);

  return { story, generatedAt: now, stats };
}

function validate(input: { projectId: string; force?: boolean }) {
  if (!input?.projectId || typeof input.projectId !== "string") {
    throw new Error("projectId is required");
  }
  return { projectId: input.projectId.slice(0, 64), force: Boolean(input.force) };
}

/** Public registry path — reads only published (non-draft) projects. */
export const getPublicImpactStory = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const client = await anonClientFactory();
    return buildStory(client as unknown as MinimalClient, data.projectId, data.force);
  });

/** Signed-in path — reads under the caller's own row-level permissions. */
export const getImpactStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    return buildStory(context.supabase as unknown as MinimalClient, data.projectId, data.force);
  });
