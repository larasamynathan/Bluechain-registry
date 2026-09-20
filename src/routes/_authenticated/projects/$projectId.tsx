import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BellRing,
  CalendarDays,
  FileStack,
  Loader2,
  MapPin,
  Ruler,
} from "lucide-react";

import { AlertLogDialog, alertTypeLabel } from "@/components/alert-log-dialog";
import { EvidenceSubmitForm } from "@/components/evidence-submit-form";
import { EvidenceTimeline } from "@/components/evidence-timeline";
import { ProjectMap } from "@/components/project-map";
import { PublicQrDialog } from "@/components/public-qr-dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  ecosystemMeta,
  formatCoords,
  riskFromHealth,
  severityBadgeClass,
  statusBadgeClass,
  statusLabel,
  type Project,
} from "@/lib/projects";

type Evidence = Database["public"]["Tables"]["evidence_submissions"]["Row"];
type Alert = Database["public"]["Tables"]["alerts"]["Row"];

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Project Detail — BlueChain Registry" },
      {
        name: "description",
        content: "Restoration site overview with location map, evidence submissions and open alerts.",
      },
      { property: "og:title", content: "Project Detail — BlueChain Registry" },
      {
        property: "og:description",
        content: "Restoration site overview with location map, evidence submissions and open alerts.",
      },
    ],
  }),
  component: ProjectDetailPage,
});

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const { isAdmin, isVerifier } = useRoles();
  const canManageAlerts = isAdmin || isVerifier;

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: async (): Promise<Project | null> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const evidenceQuery = useQuery({
    queryKey: ["project-evidence", projectId],
    queryFn: async (): Promise<Evidence[]> => {
      const { data, error } = await supabase
        .from("evidence_submissions")
        .select("*")
        .eq("project_id", projectId)
        .order("captured_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const alertsQuery = useQuery({
    queryKey: ["project-alerts", projectId],
    queryFn: async (): Promise<Alert[]> => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (projectQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading project…
      </div>
    );
  }

  const project = projectQuery.data;
  if (!project) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Project not found</CardTitle>
          <CardDescription>It may have been removed or you don't have access.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="secondary" className="gap-2">
            <Link to="/projects">
              <ArrowLeft className="size-4" />
              Back to projects
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const eco = ecosystemMeta(project.ecosystem);
  const EcoIcon = eco.icon;
  const risk = riskFromHealth(project.health_score);
  const evidence = evidenceQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
  const activeAlerts = alerts.filter((a) => !a.resolved);
  const openAlerts = activeAlerts.length;
  const severityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    return (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
  });

  const stats = [
    { label: "Ecosystem", value: eco.label },
    { label: "Area", value: `${Number(project.area_hectares).toLocaleString()} ha` },
    { label: "Evidence", value: String(evidence.length) },
    { label: "Open alerts", value: String(openAlerts) },
  ];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
        <Link to="/projects">
          <ArrowLeft className="size-4" />
          All projects
        </Link>
      </Button>

      <header className="flex flex-wrap items-start gap-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <EcoIcon className="size-6" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="font-display text-2xl font-semibold">{project.name}</h1>
          <p className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {formatCoords(project.latitude, project.longitude)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="size-3.5" />
              {Number(project.area_hectares).toLocaleString()} ha
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              Registered {formatDate(project.created_at)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={statusBadgeClass(project.status)}>
            {statusLabel(project.status)}
          </Badge>
          <Badge variant="outline" className={risk.className}>
            {risk.label} · {project.health_score}
          </Badge>
          <PublicQrDialog projectId={project.id} projectName={project.name} />
        </div>

      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="space-y-1 py-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className="font-display text-xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location</CardTitle>
            <CardDescription>{formatCoords(project.latitude, project.longitude)}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectMap
              latitude={project.latitude}
              longitude={project.longitude}
              className="h-80"
              title={`Map of ${project.name}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription>Site description and health signal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {project.description || "No description provided for this site yet."}
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Health score</span>
                <span className={`font-medium ${risk.className}`}>{project.health_score} / 100</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${risk.barClassName}`}
                  style={{ width: `${Math.min(100, Math.max(0, project.health_score))}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <EvidenceSubmitForm projectId={project.id} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileStack className="size-4 text-primary" />
              Submission history
            </CardTitle>
            <CardDescription>Field records captured for this site, newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            <EvidenceTimeline items={evidence} isLoading={evidenceQuery.isLoading} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">


        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <BellRing className="size-4 text-primary" />
                Alerts
              </CardTitle>
              <CardDescription>
                Active risk signals raised against this site
                {activeAlerts.length > 0 ? ` (${activeAlerts.length} unresolved)` : ""}.
              </CardDescription>
            </div>
            {canManageAlerts && <AlertLogDialog projectId={project.id} triggerSize="sm" />}
          </CardHeader>
          <CardContent className="space-y-3">
            {alertsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading alerts…</p>}
            {!alertsQuery.isLoading && alerts.length === 0 && (
              <p className="text-sm text-muted-foreground">No alerts for this project.</p>
            )}
            {sortedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{alertTypeLabel(alert.alert_type)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {alert.message} · {formatDate(alert.created_at)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={alert.resolved ? "text-muted-foreground" : severityBadgeClass(alert.severity)}
                >
                  {alert.resolved ? "resolved" : alert.severity}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
