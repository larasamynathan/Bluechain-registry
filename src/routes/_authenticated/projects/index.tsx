import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FolderKanban, Loader2, MapPin, Plus, Ruler } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import {
  ecosystemMeta,
  formatCoords,
  riskFromHealth,
  statusBadgeClass,
  statusLabel,
  type Project,
} from "@/lib/projects";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "My Projects — BlueChain Registry" },
      {
        name: "description",
        content:
          "Browse your mangrove, seagrass and salt marsh restoration projects with status and health indicators.",
      },
      { property: "og:title", content: "My Projects — BlueChain Registry" },
      {
        property: "og:description",
        content:
          "Browse your mangrove, seagrass and salt marsh restoration projects with status and health indicators.",
      },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { canCreateProjects } = useRoles();

  const { data, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">My Projects</h1>
          <p className="text-sm text-muted-foreground">
            Registered restoration sites across mangrove, seagrass and salt marsh ecosystems.
          </p>
        </div>
        {canCreateProjects && (
          <Button asChild className="gap-2">
            <Link to="/projects/new">
              <Plus className="size-4" />
              New project
            </Link>
          </Button>
        )}
      </header>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading projects…
        </div>
      )}

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center gap-2 py-6 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            Could not load projects.
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (data?.length ?? 0) === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <FolderKanban className="size-6" />
            </span>
            <div>
              <p className="font-medium">No projects yet</p>
              <p className="text-sm text-muted-foreground">
                {canCreateProjects
                  ? "Register your first restoration site to start collecting MRV evidence."
                  : "Only field submitters and admins can register projects."}
              </p>
            </div>
            {canCreateProjects && (
              <Button asChild variant="secondary" className="gap-2">
                <Link to="/projects/new">
                  <Plus className="size-4" />
                  New project
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((project) => {
          const eco = ecosystemMeta(project.ecosystem);
          const risk = riskFromHealth(project.health_score);
          const EcoIcon = eco.icon;

          return (
            <Link
              key={project.id}
              to="/projects/$projectId"
              params={{ projectId: project.id }}
              className="group"
            >
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <EcoIcon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{project.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{eco.label}</p>
                  </div>
                  <Badge variant="outline" className={statusBadgeClass(project.status)}>
                    {statusLabel(project.status)}
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Ruler className="size-3.5" />
                      {Number(project.area_hectares).toLocaleString()} ha
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      {formatCoords(project.latitude, project.longitude)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Health / risk</span>
                      <span className={`font-medium ${risk.className}`}>
                        {risk.label} · {project.health_score}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${risk.barClassName}`}
                        style={{ width: `${Math.min(100, Math.max(0, project.health_score))}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
