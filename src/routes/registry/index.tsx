import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, BadgeCheck, Globe2, Loader2, Search, ShieldCheck, Waves } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { searchPublicProjects } from "@/lib/registry.functions";
import { ecosystemMeta, formatCoords, riskFromHealth, statusBadgeClass, statusLabel } from "@/lib/projects";

export const Route = createFileRoute("/registry/")({
  head: () => ({
    meta: [
      { title: "Public Blue Carbon Registry — BlueChain" },
      {
        name: "description",
        content:
          "Search verified mangrove, seagrass and salt marsh restoration projects, their evidence and issued carbon credits.",
      },
      { property: "og:title", content: "Public Blue Carbon Registry — BlueChain" },
      {
        property: "og:description",
        content:
          "Search verified mangrove, seagrass and salt marsh restoration projects, their evidence and issued carbon credits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicRegistryPage,
});

function PublicRegistryPage() {
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const search = useServerFn(searchPublicProjects);

  const projectsQuery = useQuery({
    queryKey: ["public-registry", query],
    queryFn: () => search({ data: { q: query } }),
  });

  const projects = projectsQuery.data ?? [];

  return (
    <div className="min-h-screen surface-ocean">
      <header className="border-b border-border/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Waves className="size-5" />
            </span>
            <span className="font-display font-semibold">BlueChain Registry</span>
          </Link>
          <ThemeToggle className="ml-auto" />
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/">
              <ArrowLeft className="size-4" />
              Home
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <section className="rounded-2xl border border-border/60 bg-card/70 p-8 shadow-depth">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
            <ShieldCheck className="size-4" />
            Open transparency
          </div>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold sm:text-4xl">
            Every blue carbon project, verified in the open
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Search any registered restoration site to inspect its verification trail, field evidence and
            issued carbon credits. No account required.
          </p>

          <form
            className="mt-6 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(term.trim());
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search by project name or project ID"
                className="h-11 pl-9"
                aria-label="Search projects by name or ID"
              />
            </div>
            <Button type="submit" size="lg" className="sm:w-40">
              Search
            </Button>
          </form>
        </section>

        <div className="mt-10 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Globe2 className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">
              {query ? `Results for "${query}"` : "All registered projects"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {projectsQuery.isPending ? "Loading…" : `${projects.length} project(s) publicly listed`}
            </p>
          </div>
        </div>

        {projectsQuery.isPending ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Fetching registry…
          </div>
        ) : projects.length === 0 ? (
          <Card className="mt-6 border-dashed bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">No public projects found</CardTitle>
              <CardDescription>
                Try a different name, or paste an exact project ID from a site placard.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const eco = ecosystemMeta(project.ecosystem);
              const risk = riskFromHealth(project.health_score);
              const EcoIcon = eco.icon;
              return (
                <Link
                  key={project.id}
                  to="/registry/$projectId"
                  params={{ projectId: project.id }}
                  className="group"
                >
                  <Card className="h-full border-border/60 bg-card/70 transition group-hover:border-primary/50 group-hover:shadow-depth">
                    <CardHeader className="gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                          <EcoIcon className="size-4" />
                        </span>
                        <Badge variant="outline" className={statusBadgeClass(project.status)}>
                          {statusLabel(project.status)}
                        </Badge>
                      </div>
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <CardDescription>
                        {eco.label} · {project.area_hectares} ha
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Health</span>
                        <span className={risk.className}>
                          {project.health_score}% · {risk.label}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${risk.barClassName}`}
                          style={{ width: `${project.health_score}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCoords(project.latitude, project.longitude)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <p className="mt-12 flex items-center gap-2 text-xs text-muted-foreground">
          <BadgeCheck className="size-4 text-success" />
          Records shown here are published straight from the verification database — evidence appears only
          after independent review.
        </p>
      </main>
    </div>
  );
}
