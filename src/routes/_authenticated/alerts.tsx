import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AlertLogDialog, alertTypeLabel } from "@/components/alert-log-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { severityBadgeClass, type AlertSeverity, type Project } from "@/lib/projects";

type AlertRow = Database["public"]["Tables"]["alerts"]["Row"] & {
  projects: Pick<Project, "id" | "name"> | null;
};

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — BlueChain Registry" },
      {
        name: "description",
        content: "Unresolved erosion, water-quality and biodiversity alerts across restoration sites.",
      },
      { property: "og:title", content: "Alerts — BlueChain Registry" },
      {
        property: "og:description",
        content: "Unresolved erosion, water-quality and biodiversity alerts across restoration sites.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { isAdmin, isVerifier } = useRoles();
  const canManage = isAdmin || isVerifier;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["all-alerts"],
    queryFn: async (): Promise<AlertRow[]> => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*, projects(id, name)")
        .eq("resolved", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as AlertRow[]).sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
      );
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alerts").update({ resolved: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert marked as resolved.");
      queryClient.invalidateQueries({ queryKey: ["all-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["project-alerts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const alerts = query.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <BellRing className="size-6 text-primary" />
            Alerts
          </h1>
          <p className="text-sm text-muted-foreground">
            All unresolved site-integrity alerts across projects, most severe first.
          </p>
        </div>
        {canManage && <AlertLogDialog />}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unresolved alerts</CardTitle>
          <CardDescription>
            {query.isLoading ? "Loading…" : `${alerts.length} open alert(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {query.isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading alerts…
            </p>
          )}
          {!query.isLoading && alerts.length === 0 && (
            <p className="text-sm text-muted-foreground">No unresolved alerts. All sites look calm.</p>
          )}
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/25 p-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={severityBadgeClass(alert.severity)}>
                    {alert.severity}
                  </Badge>
                  <p className="text-sm font-medium">{alertTypeLabel(alert.alert_type)}</p>
                  {alert.projects && (
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: alert.project_id }}
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      {alert.projects.name}
                    </Link>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
                <p className="text-xs text-muted-foreground">
                  Raised {new Date(alert.created_at).toLocaleString()}
                </p>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  disabled={resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate(alert.id)}
                >
                  <CheckCircle2 className="size-4" />
                  Resolve
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
