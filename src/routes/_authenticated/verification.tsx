import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  ImageOff,
  Loader2,
  MapPin,
  ShieldCheck,
  ShieldX,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { AnomalyPanel } from "@/components/anomaly-panel";
import { CarbonCreditDialog } from "@/components/carbon-credit-dialog";
import { ProjectMap } from "@/components/project-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  aiScoreBadgeClass,
  ecosystemMeta,
  evidenceBadgeClass,
  evidenceStatusLabel,
  formatCoords,
  type Project,
} from "@/lib/projects";

const QUICK_REJECT_REASONS = [
  "Photo does not clearly show the restoration site.",
  "GPS location is inconsistent with the registered project boundary.",
  "Low AI confidence — vegetation not clearly identifiable.",
  "Duplicate of a previously submitted photo.",
  "Insufficient evidence of ecosystem type claimed.",
];

function hoursSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

type Evidence = Database["public"]["Tables"]["evidence_submissions"]["Row"];
type QueueItem = Evidence & { projects: Project | null };

export const Route = createFileRoute("/_authenticated/verification")({
  head: () => ({
    meta: [
      { title: "Verification Queue — BlueChain Registry" },
      {
        name: "description",
        content:
          "Verifier review queue: inspect flagged and pending field evidence, approve or reject claims and issue carbon credits.",
      },
      { property: "og:title", content: "Verification Queue — BlueChain Registry" },
      {
        property: "og:description",
        content:
          "Verifier review queue: inspect flagged and pending field evidence, approve or reject claims and issue carbon credits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerificationPage,
});

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function usePhotoUrl(path: string | null) {
  return useQuery({
    queryKey: ["evidence-photo", path],
    enabled: Boolean(path),
    staleTime: 45 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("evidence-photos")
        .createSignedUrl(path as string, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

function QueueThumb({ path }: { path: string | null }) {
  const { data } = usePhotoUrl(path);
  if (!path || !data) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted text-muted-foreground">
        <ImageOff className="size-4" />
      </div>
    );
  }
  return (
    <img
      src={data}
      alt="Evidence thumbnail"
      loading="lazy"
      className="size-12 shrink-0 rounded-lg border border-border/60 object-cover"
    />
  );
}

function AiMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

function VerificationPage() {
  const { isAdmin, isVerifier, isLoading: rolesLoading } = useRoles();
  const canReview = isAdmin || isVerifier;
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [justVerified, setJustVerified] = useState<
    { project: Project; evidenceId: string } | null
  >(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const queueQuery = useQuery({
    queryKey: ["review-queue"],
    enabled: canReview,
    queryFn: async (): Promise<QueueItem[]> => {
      const { data, error } = await supabase
        .from("evidence_submissions")
        .select("*, projects(*)")
        .in("status", ["pending", "flagged"])
        .order("captured_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as QueueItem[];
      // Flagged items always surface first.
      return rows.sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === "flagged" ? -1 : 1;
      });
    },
  });

  const queue = queueQuery.data ?? [];
  const selected = queue.find((item) => item.id === selectedId) ?? queue[0] ?? null;
  const photo = usePhotoUrl(selected?.photo_path ?? null);

  const reviewMutation = useMutation({
    mutationFn: async ({ decision }: { decision: "verified" | "rejected" }) => {
      if (!selected) throw new Error("Nothing selected.");
      const trimmed = notes.trim().slice(0, 1000);
      if (decision === "rejected" && trimmed.length < 5) {
        throw new Error("A rejection reason is required (at least 5 characters).");
      }
      const { data: userData } = await supabase.auth.getUser();
      const reviewerId = userData.user?.id;
      if (!reviewerId) throw new Error("You must be signed in.");

      const { error } = await supabase
        .from("evidence_submissions")
        .update({
          status: decision,
          review_notes: trimmed || null,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selected.id);
      if (error) throw error;

      const projectName = selected.projects?.name ?? "your project";
      const { error: notifyError } = await supabase.from("notifications").insert({
        user_id: selected.submitter_id,
        title: decision === "verified" ? "Evidence verified" : "Evidence rejected",
        message:
          decision === "verified"
            ? `Your submission for ${projectName} was verified.${trimmed ? ` Notes: ${trimmed}` : ""}`
            : `Your submission for ${projectName} was rejected. Reason: ${trimmed}`,
        link: `/projects/${selected.project_id}`,
      });
      if (notifyError) throw notifyError;

      return decision;
    },
    onSuccess: (decision) => {
      toast.success(
        decision === "verified"
          ? "Submission verified and the submitter was notified."
          : "Submission rejected and the submitter was notified.",
      );
      setNotes("");
      if (decision === "verified" && selected?.projects) {
        setJustVerified({ project: selected.projects, evidenceId: selected.id });
      }
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["project-evidence"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const bulkMutation = useMutation({
    mutationFn: async ({
      ids,
      decision,
      reason,
    }: {
      ids: string[];
      decision: "verified" | "rejected";
      reason: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const reviewerId = userData.user?.id;
      if (!reviewerId) throw new Error("You must be signed in.");
      const trimmed = reason.trim().slice(0, 1000);
      if (decision === "rejected" && trimmed.length < 5) {
        throw new Error("A rejection reason is required for bulk rejection.");
      }

      const targets = queue.filter((item) => ids.includes(item.id));
      for (const item of targets) {
        const { error } = await supabase
          .from("evidence_submissions")
          .update({
            status: decision,
            review_notes: trimmed || null,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        if (error) throw error;

        const projectName = item.projects?.name ?? "your project";
        await supabase.from("notifications").insert({
          user_id: item.submitter_id,
          title: decision === "verified" ? "Evidence verified" : "Evidence rejected",
          message:
            decision === "verified"
              ? `Your submission for ${projectName} was verified.${trimmed ? ` Notes: ${trimmed}` : ""}`
              : `Your submission for ${projectName} was rejected. Reason: ${trimmed}`,
          link: `/projects/${item.project_id}`,
        });
      }
      return { decision, count: targets.length };
    },
    onSuccess: ({ decision, count }) => {
      toast.success(
        `${count} submission${count === 1 ? "" : "s"} ${
          decision === "verified" ? "verified" : "rejected"
        } and submitter${count === 1 ? "" : "s"} notified.`,
      );
      setCheckedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["project-evidence"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (rolesLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking your permissions…
      </div>
    );
  }

  if (!canReview) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldX className="size-4 text-destructive" />
            Verifier access required
          </CardTitle>
          <CardDescription>
            Only accredited verifiers and administrators can review evidence submissions.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <ShieldCheck className="size-6 text-primary" />
          Verification queue
        </h1>
        <p className="text-sm text-muted-foreground">
          Flagged submissions are prioritised. Review the imagery and AI breakdown before deciding.
        </p>
      </header>

      <AnomalyPanel enabled={canReview} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Pending review</CardTitle>
            <CardDescription>
              {queueQuery.isLoading ? "Loading…" : `${queue.length} submission(s) awaiting a decision`}
            </CardDescription>
            {queue.length > 0 && (
              <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                <Checkbox
                  checked={checkedIds.size > 0 && checkedIds.size === queue.length}
                  onCheckedChange={(v) =>
                    setCheckedIds(v ? new Set(queue.map((q) => q.id)) : new Set())
                  }
                />
                Select all visible
              </label>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {checkedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 p-2.5">
                <span className="text-xs font-medium text-primary">
                  {checkedIds.size} selected
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1"
                  disabled={bulkMutation.isPending}
                  onClick={() =>
                    bulkMutation.mutate({
                      ids: [...checkedIds],
                      decision: "verified",
                      reason: notes,
                    })
                  }
                >
                  <CheckCircle2 className="size-3.5" /> Approve selected
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1"
                  disabled={bulkMutation.isPending || notes.trim().length < 5}
                  onClick={() =>
                    bulkMutation.mutate({
                      ids: [...checkedIds],
                      decision: "rejected",
                      reason: notes,
                    })
                  }
                >
                  <ShieldX className="size-3.5" /> Reject selected
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  Uses the notes field below — required to reject.
                </span>
              </div>
            )}
            {!queueQuery.isLoading && queue.length === 0 && (
              <p className="text-sm text-muted-foreground">The queue is clear. Nice work.</p>
            )}
            {queue.map((item) => {
              const waitingHours = hoursSince(item.captured_at);
              const overdue = waitingHours > 48;
              return (
                <div
                  key={item.id}
                  className={`flex w-full items-center gap-2 rounded-lg border p-2.5 text-left transition-colors ${
                    selected?.id === item.id
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <Checkbox
                    checked={checkedIds.has(item.id)}
                    onCheckedChange={(v) =>
                      setCheckedIds((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(item.id);
                        else next.delete(item.id);
                        return next;
                      })
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(item.id);
                      setNotes("");
                      setJustVerified(null);
                      reviewMutation.reset();
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <QueueThumb path={item.photo_path} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium">
                        {item.projects?.name ?? "Unknown project"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(item.captured_at)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className={evidenceBadgeClass(item.status)}>
                          {evidenceStatusLabel(item.status)}
                        </Badge>
                        {item.ai_confidence_score !== null && (
                          <Badge
                            variant="outline"
                            className={aiScoreBadgeClass(item.ai_confidence_score)}
                          >
                            AI {item.ai_confidence_score}%
                          </Badge>
                        )}
                        {overdue && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-warning/40 bg-warning/15 text-warning"
                          >
                            <Clock className="size-3" /> {Math.round(waitingHours)}h waiting
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {selected ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selected.projects?.name ?? "Unknown project"}
                </CardTitle>
                <CardDescription>
                  {selected.projects
                    ? `${ecosystemMeta(selected.projects.ecosystem).label} · ${Number(
                        selected.projects.area_hectares,
                      ).toLocaleString()} ha · health ${selected.projects.health_score}/100`
                    : "Project context unavailable"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {photo.data ? (
                  <img
                    src={photo.data}
                    alt="Full size evidence submission"
                    className="max-h-[420px] w-full rounded-xl border border-border/60 object-contain bg-muted/30"
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-sm text-muted-foreground">
                    {selected.photo_path ? "Loading photo…" : "No photo attached"}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <AiMetric
                    label="AI confidence"
                    value={
                      selected.ai_confidence_score !== null
                        ? `${selected.ai_confidence_score}%`
                        : "—"
                    }
                  />
                  <AiMetric
                    label="Vegetation health"
                    value={
                      selected.ai_vegetation_health !== null
                        ? `${selected.ai_vegetation_health}%`
                        : "—"
                    }
                  />
                  <AiMetric
                    label="Canopy density"
                    value={
                      selected.ai_canopy_density !== null ? `${selected.ai_canopy_density}%` : "—"
                    }
                  />
                  <AiMetric
                    label="Ecosystem match"
                    value={
                      selected.ai_ecosystem_match === null
                        ? "—"
                        : selected.ai_ecosystem_match
                          ? "Consistent"
                          : "Inconsistent"
                    }
                  />
                </div>

                {selected.ai_summary && (
                  <p className="flex gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{selected.ai_summary}</span>
                  </p>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Submission details</p>
                    <p className="text-sm text-muted-foreground">
                      {selected.notes || "No description provided."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Captured {formatDate(selected.captured_at)}
                    </p>
                    <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {selected.latitude !== null && selected.longitude !== null
                        ? formatCoords(selected.latitude, selected.longitude)
                        : "No GPS captured"}
                    </p>
                  </div>
                  {selected.latitude !== null && selected.longitude !== null && (
                    <ProjectMap
                      latitude={selected.latitude}
                      longitude={selected.longitude}
                      className="h-48"
                      title="Evidence GPS location"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Verifier decision</CardTitle>
                <CardDescription>
                  Notes are optional on approval and required when rejecting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="review-notes">Review notes / rejection reason</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REJECT_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setNotes(reason)}
                        className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    id="review-notes"
                    rows={3}
                    maxLength={1000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Explain your decision for the submitter…"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="gap-2"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate({ decision: "verified" })}
                  >
                    {reviewMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Approve &amp; verify
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate({ decision: "rejected" })}
                  >
                    <ShieldX className="size-4" />
                    Reject
                  </Button>
                  {justVerified && (
                    <CarbonCreditDialog
                      project={justVerified.project}
                      evidenceId={justVerified.evidenceId}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="flex items-center justify-center p-10">
            <p className="text-sm text-muted-foreground">
              Select a submission from the queue to review it.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
