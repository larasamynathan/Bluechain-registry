import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, MapPinOff, Radar, Copy } from "lucide-react";

import { AlertLogDialog } from "@/components/alert-log-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { detectAnomalies, type EvidenceWithProject } from "@/lib/anomaly";
import { evidenceBadgeClass, evidenceStatusLabel, formatCoords } from "@/lib/projects";

export function AnomalyPanel({ enabled = true }: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: ["anomaly-scan"],
    enabled,
    queryFn: async (): Promise<EvidenceWithProject[]> => {
      const { data, error } = await supabase
        .from("evidence_submissions")
        .select("*, projects(*)")
        .not("latitude", "is", null)
        .order("captured_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as EvidenceWithProject[];
    },
  });

  const findings = detectAnomalies(query.data ?? []).filter(
    (f) => f.evidence.status !== "rejected",
  );

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radar className="size-4 text-primary" />
            Fraud &amp; anomaly detection
          </CardTitle>
          <CardDescription>
            Needs investigation — duplicate GPS clusters (within 50 m / 24 h) and submissions
            outside the registered site radius.
          </CardDescription>
        </div>
        <Badge variant="outline" className={findings.length ? "border-destructive/40 bg-destructive/10 text-destructive" : "text-muted-foreground"}>
          {findings.length} flagged
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Scanning submissions…
          </p>
        )}
        {!query.isLoading && findings.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No suspicious submission patterns detected.
          </p>
        )}

        {findings.map(({ evidence, reasons }) => (
          <div
            key={evidence.id}
            className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">
                {evidence.projects?.name ?? "Unknown project"}
              </p>
              <Badge variant="outline" className={evidenceBadgeClass(evidence.status)}>
                {evidenceStatusLabel(evidence.status)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {evidence.latitude !== null && evidence.longitude !== null
                  ? formatCoords(evidence.latitude, evidence.longitude)
                  : "No GPS"}{" "}
                · {new Date(evidence.captured_at).toLocaleString()}
              </span>
            </div>

            <ul className="space-y-1">
              {reasons.map((reason) => (
                <li key={reason.kind + reason.detail} className="flex gap-2 text-xs">
                  {reason.kind === "duplicate" ? (
                    <Copy className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                  ) : (
                    <MapPinOff className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                  )}
                  <span>
                    <span className="font-medium text-destructive">{reason.label}</span>{" "}
                    <span className="text-muted-foreground">— {reason.detail}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2 pt-1">
              {evidence.projects && (
                <Button asChild variant="ghost" size="sm">
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: evidence.project_id }}
                  >
                    View project
                  </Link>
                </Button>
              )}
              <AlertLogDialog
                projectId={evidence.project_id}
                defaultType="anomaly"
                defaultMessage={reasons.map((r) => `${r.label}: ${r.detail}`).join(" | ")}
                triggerLabel="Raise alert"
                triggerVariant="outline"
                triggerSize="sm"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
