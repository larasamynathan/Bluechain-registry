import { createServerFn } from "@tanstack/react-start";

export const searchPublicProjects = createServerFn({ method: "GET" })
  .inputValidator((input: { q?: string } | undefined) => ({
    q: typeof input?.q === "string" ? input.q.slice(0, 120).trim() : "",
  }))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    let query = supabase
      .from("projects")
      .select("id, name, ecosystem, status, area_hectares, health_score, latitude, longitude, created_at")
      .neq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(60);

    const q = data.q;
    if (q) {
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
      query = uuid ? query.eq("id", q) : query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPublicProject = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => {
    if (!input?.id || typeof input.id !== "string") throw new Error("id is required");
    return { id: input.id.slice(0, 64) };
  })
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: project, error } = await supabase
      .from("projects")
      .select(
        "id, name, description, ecosystem, status, area_hectares, health_score, latitude, longitude, created_at, updated_at",
      )
      .eq("id", data.id)
      .neq("status", "draft")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) return null;

    const [{ data: evidence }, { data: credits }] = await Promise.all([
      supabase
        .from("evidence_submissions")
        .select(
          "id, captured_at, created_at, status, notes, photo_path, latitude, longitude, ai_confidence_score, ai_vegetation_health, ai_canopy_density, ai_ecosystem_match, ai_summary, reviewed_at",
        )
        .eq("project_id", data.id)
        .order("captured_at", { ascending: false })
        .limit(60),
      supabase
        .from("carbon_credits")
        .select("id, tco2e, methodology, growth_stage, years, area_hectares, created_at, evidence_id")
        .eq("project_id", data.id)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const photos: Record<string, string> = {};
    for (const row of evidence ?? []) {
      if (!row.photo_path) continue;
      const { data: signed } = await supabaseAdmin.storage
        .from("evidence-photos")
        .createSignedUrl(row.photo_path, 60 * 60);
      if (signed?.signedUrl) photos[row.id] = signed.signedUrl;
    }

    return {
      project,
      evidence: evidence ?? [],
      credits: credits ?? [],
      photos,
      totals: {
        tco2e: (credits ?? []).reduce((sum, c) => sum + Number(c.tco2e ?? 0), 0),
        evidenceCount: (evidence ?? []).length,
      },
    };
  });
