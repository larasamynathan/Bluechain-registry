import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Award, Clock, Flame, Loader2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { evidenceBadgeClass, evidenceStatusLabel, type EvidenceStatus } from "@/lib/projects";

function formatHours(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} d`;
}

/** Longest run of consecutive days (ending today or yesterday) with at least one review. */
function computeStreak(reviewDates: string[]) {
  const days = new Set(reviewDates.map((d) => new Date(d).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  // allow the streak to still "count" if today has no review yet but yesterday does
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function VerifierDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["verifier-dashboard"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const [evidence, projects, people] = await Promise.all([
        supabase
          .from("evidence_submissions")
          .select("id, project_id, status, created_at, reviewed_at, reviewed_by, ai_confidence_score")
          .order("created_at", { ascending: false }),
        supabase.from("projects").select("id, name"),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      if (evidence.error) throw evidence.error;
      if (projects.error) throw projects.error;
      return {
        evidence: evidence.data ?? [],
        projects: projects.data ?? [],
        people: people.data ?? [],
        userId,
      };
    },
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading your review queue…
      </div>
    );
  }

  const projectName = (id: string) => data.projects.find((p) => p.id === id)?.name ?? "Project";
  const queue = data.evidence
    .filter((e) => e.status === "pending" || e.status === "flagged")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "flagged" ? -1 : 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  const flagged = queue.filter((e) => e.status === "flagged").length;

  const weekAgo = Date.now() - 7 * 86_400_000;
  const mine = data.evidence.filter((e) => e.reviewed_by && e.reviewed_by === data.userId);
  const verifiedThisWeek = mine.filter(
    (e) => e.reviewed_at && new Date(e.reviewed_at).getTime() >= weekAgo,
  ).length;
  const turnarounds = mine
    .filter((e) => e.reviewed_at)
    .map((e) => (new Date(e.reviewed_at!).getTime() - new Date(e.created_at).getTime()) / 3_600_000)
    .filter((h) => h >= 0);
  const avgHours = turnarounds.length
    ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length
    : 0;
  const streak = computeStreak(mine.filter((e) => e.reviewed_at).map((e) => e.reviewed_at!));

  const monthAgo = Date.now() - 30 * 86_400_000;
  const personLabel = (id: string) => {
    const p = data.people.find((x) => x.id === id);
    return p?.full_name || p?.email || `${id.slice(0, 8)}…`;
  };
  const leaderboardCounts = new Map<string, number>();
  for (const e of data.evidence) {
    if (!e.reviewed_by || !e.reviewed_at) continue;
    if (new Date(e.reviewed_at).getTime() < monthAgo) continue;
    leaderboardCounts.set(e.reviewed_by, (leaderboardCounts.get(e.reviewed_by) ?? 0) + 1);
  }
  const leaderboard = [...leaderboardCounts.entries()]
    .map(([id, count]) => ({ id, name: personLabel(id), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Verification workspace</h1>
          <p className="text-sm text-muted-foreground">
            Evidence awaiting your review, flagged submissions first.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/verification">
            Open review interface <ArrowRight className="size-4" />
          </Link>
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Awaiting review</CardDescription>
            <ShieldCheck className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-primary">{queue.length}</p>
            <p className="text-xs text-muted-foreground">pending + flagged submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Flagged for priority</CardDescription>
            <AlertTriangle className="size-4 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{flagged}</p>
            <p className="text-xs text-muted-foreground">low AI confidence or anomalies</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Verified this week</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{verifiedThisWeek}</p>
            <p className="text-xs text-muted-foreground">reviews completed by you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Avg. review time</CardDescription>
            <Clock className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatHours(avgHours)}</p>
            <p className="text-xs text-muted-foreground">submission → your decision</p>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Review streak</CardDescription>
            <Flame className="size-4 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-warning">{streak}</p>
            <p className="text-xs text-muted-foreground">
              consecutive day{streak === 1 ? "" : "s"} with a review
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pending review queue</CardTitle>
            <CardDescription>Flagged submissions are listed first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {queue.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing waiting — the review queue is clear.
              </p>
            ) : (
              queue.slice(0, 8).map((e) => (
                <Link
                  key={e.id}
                  to="/verification"
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
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="size-4 text-primary" />
              Verifier leaderboard
            </CardTitle>
            <CardDescription>Most reviews completed in the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews completed this month yet.</p>
            ) : (
              leaderboard.map((row, i) => (
                <div
                  key={row.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm ${
                    row.id === data.userId
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/60 bg-muted/20"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="truncate">
                      {row.name} {row.id === data.userId && "(you)"}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium">{row.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
