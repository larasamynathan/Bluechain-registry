import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, Coins, Flame, FolderKanban, Loader2, Plus, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { evidenceBadgeClass, evidenceStatusLabel, type EvidenceStatus } from "@/lib/projects";

const STATUSES = ["pending", "flagged", "verified", "approved", "rejected"] as const;

/** Longest run of consecutive days (ending today or yesterday) with at least one submission. */
function computeStreak(dates: string[]) {
  const days = new Set(dates.map((d) => new Date(d).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function SubmitterDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["submitter-dashboard"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      const [projects, evidence] = await Promise.all([
        supabase.from("projects").select("id, name, status").eq("owner_id", userId),
        supabase
          .from("evidence_submissions")
          .select("id, project_id, status, created_at, ai_confidence_score")
          .eq("submitter_id", userId)
          .order("created_at", { ascending: false }),
      ]);
      if (projects.error) throw projects.error;
      if (evidence.error) throw evidence.error;

      const projectIds = (projects.data ?? []).map((p) => p.id);
      let credits: { tco2e: number }[] = [];
      if (projectIds.length > 0) {
        const { data: creditRows, error: creditError } = await supabase
          .from("carbon_credits")
          .select("tco2e")
          .in("project_id", projectIds);
        if (creditError) throw creditError;
        credits = creditRows ?? [];
      }

      return { projects: projects.data ?? [], evidence: evidence.data ?? [], credits };
    },
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading your workspace…
      </div>
    );
  }

  const counts = Object.fromEntries(
    STATUSES.map((s) => [s, data.evidence.filter((e) => e.status === s).length]),
  ) as Record<(typeof STATUSES)[number], number>;
  const projectName = (id: string) => data.projects.find((p) => p.id === id)?.name ?? "Project";

  const totalTco2e = data.credits.reduce((sum, c) => sum + Number(c.tco2e ?? 0), 0);
  const reviewed = data.evidence.filter((e) => ["verified", "approved", "rejected"].includes(e.status));
  const accepted = reviewed.filter((e) => e.status !== "rejected");
  const acceptanceRate = reviewed.length ? (accepted.length / reviewed.length) * 100 : 0;
  const streak = computeStreak(data.evidence.map((e) => e.created_at));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">My field workspace</h1>
          <p className="text-sm text-muted-foreground">
            Your restoration projects and the evidence you have submitted.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="gap-2">
            <Link to="/projects/new">
              <Plus className="size-4" /> New project
            </Link>
          </Button>
          <Button asChild variant="secondary" className="gap-2">
            <Link to="/projects">
              <Camera className="size-4" /> Submit evidence
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Carbon credited to your projects</CardDescription>
            <Coins className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-primary">
              {totalTco2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} tCO₂e
            </p>
            <p className="text-xs text-muted-foreground">issued from your verified evidence</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Acceptance rate</CardDescription>
            <Target className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{acceptanceRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">
              {accepted.length}/{reviewed.length} reviewed submissions accepted
            </p>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Submission streak</CardDescription>
            <Flame className="size-4 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-warning">{streak}</p>
            <p className="text-xs text-muted-foreground">
              consecutive day{streak === 1 ? "" : "s"} submitting evidence
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>My projects</CardDescription>
            <FolderKanban className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{data.projects.length}</p>
            <p className="text-xs text-muted-foreground">
              {data.evidence.length} evidence submission{data.evidence.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        {(["pending", "verified", "flagged"] as const).map((s) => (
          <Card key={s}>
            <CardHeader className="pb-2">
              <CardDescription className="capitalize">{s} evidence</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{counts[s]}</p>
              <p className="text-xs text-muted-foreground">
                {s === "pending"
                  ? "waiting for a verifier"
                  : s === "verified"
                    ? "approved by a verifier"
                    : "needs priority review"}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent submissions</CardTitle>
            <CardDescription>Your last five evidence uploads.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No evidence yet — open a project and submit your first photo.
              </p>
            ) : (
              data.evidence.slice(0, 5).map((e) => {
                return (
                  <Link
                    key={e.id}
                    to="/projects/$projectId"
                    params={{ projectId: e.project_id }}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{projectName(e.project_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                        {e.ai_confidence_score != null && ` · AI ${e.ai_confidence_score}%`}
                      </p>
                    </div>
                    <Badge className={evidenceBadgeClass(e.status as EvidenceStatus)}>
                      {evidenceStatusLabel(e.status as EvidenceStatus)}
                    </Badge>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submission breakdown</CardTitle>
            <CardDescription>All of your evidence by status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {STATUSES.map((s) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">{s}</span>
                <span className="font-medium">{counts[s]}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
