import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  BadgeCheck,
  Brain,
  CheckCircle2,
  Coins,
  FileImage,
  Loader2,
  MapPin,
  Ruler,
  ShieldCheck,
  Upload,
  Waves,
} from "lucide-react";

import { ProjectMap } from "@/components/project-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicProject } from "@/lib/registry.functions";
import {
  aiScoreBadgeClass,
  ecosystemMeta,
  evidenceBadgeClass,
  formatCoords,
  riskFromHealth,
  statusBadgeClass,
  statusLabel,
} from "@/lib/projects";

export const Route = createFileRoute("/registry/$projectId")({
  head: () => ({
    meta: [
      { title: "Project Verification Trail — BlueChain Registry" },
      {
        name: "description",
        content:
          "Public verification trail for a blue carbon restoration site: field evidence, AI scoring, independent review and issued credits.",
      },
      { property: "og:title", content: "Project Verification Trail — BlueChain Registry" },
      {
        property: "og:description",
        content:
          "Public verification trail for a blue carbon restoration site: field evidence, AI scoring, independent review and issued credits.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicProjectPage,
});

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PublicProjectPage() {
  const { projectId } = Route.useParams();
  const fetchProject = useServerFn(getPublicProject);

  const query = useQuery({
    queryKey: ["public-project", projectId],
    queryFn: () => fetchProject({ data: { id: projectId } }),
  });

  const data = query.data;

  return (
    <div className="min-h-screen surface-ocean">
      <header className="border-b border-border/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <Link to="/registry" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Waves className="size-5" />
            </span>
            <span className="font-display font-semibold">BlueChain Registry</span>
          </Link>
          <ThemeToggle className="ml-auto" />
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/registry">
              <ArrowLeft className="size-4" />
              Registry
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {query.isPending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading verification record…
          </div>
        ) : !data ? (
          <Card className="border-dashed bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">Project not found</CardTitle>
              <CardDescription>
                This project is not published in the public registry, or the ID is incorrect.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <PublicProjectBody data={data} />
        )}
      </main>
    </div>
  );
}

type PublicData = NonNullable<Awaited<ReturnType<typeof getPublicProject>>>;

function PublicProjectBody({ data }: { data: PublicData }) {
  const { project, evidence, credits, photos, totals } = data;
  const eco = ecosystemMeta(project.ecosystem);
  const risk = riskFromHealth(project.health_score);
  const EcoIcon = eco.icon;

  const scored = evidence.filter((e) => e.ai_confidence_score != null);
  const verified = evidence.filter((e) => e.status === "verified" || e.status === "approved");
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, e) => s + (e.ai_confidence_score ?? 0), 0) / scored.length)
    : null;

  const steps = [
    {
      label: "Evidence submitted",
      icon: Upload,
      done: evidence.length > 0,
      detail: `${totals.evidenceCount} public submission(s)`,
    },
    {
      label: "AI scored",
      icon: Brain,
      done: scored.length > 0,
      detail: avgScore != null ? `Average confidence ${avgScore}%` : "Awaiting analysis",
    },
    {
      label: "Independently verified",
      icon: ShieldCheck,
      done: verified.length > 0,
      detail: `${verified.length} approved by a verifier`,
    },
    {
      label: "Credits issued",
      icon: Coins,
      done: credits.length > 0,
      detail: credits.length ? `${totals.tco2e.toFixed(1)} tCO₂e logged` : "No credits issued yet",
    },
  ];

  return (
    <>
      <section className="rounded-2xl border border-border/60 bg-card/70 p-8 shadow-depth">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <EcoIcon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-semibold">{project.name}</h1>
              <Badge variant="outline" className={statusBadgeClass(project.status)}>
                {statusLabel(project.status)}
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {project.description || `${eco.label} restoration site registered on BlueChain.`}
            </p>
            <p className="mt-3 font-mono text-xs text-muted-foreground">ID {project.id}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Ruler} label="Area" value={`${project.area_hectares} ha`} />
          <Stat icon={MapPin} label="Location" value={formatCoords(project.latitude, project.longitude)} />
          <Stat
            icon={BadgeCheck}
            label="Health score"
            value={`${project.health_score}% · ${risk.label}`}
            valueClass={risk.className}
          />
          <Stat icon={Coins} label="Credits issued" value={`${totals.tco2e.toFixed(1)} tCO₂e`} />
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border/60 bg-card/70 p-6">
        <h2 className="text-lg font-semibold">Verification trail</h2>
        <p className="text-sm text-muted-foreground">
          Each restoration claim moves through these four independent checkpoints.
        </p>

        <ol className="mt-6 grid gap-6 md:grid-cols-4">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <li key={step.label} className="relative">
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden
                    className={`absolute left-11 top-5 hidden h-0.5 w-[calc(100%-1.5rem)] md:block ${
                      steps[index + 1]?.done ? "bg-success/60" : "bg-border"
                    }`}
                  />
                ) : null}
                <div className="flex items-center gap-3">
                  <span
                    className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border ${
                      step.done
                        ? "border-success/50 bg-success/15 text-success"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.done ? <CheckCircle2 className="size-5" /> : <StepIcon className="size-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.detail}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/70 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Approved field evidence</CardTitle>
            <CardDescription>
              Photos published only after independent verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approved evidence published yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {evidence.map((item) => (
                  <figure
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-border/60 bg-background/40"
                  >
                    {photos[item.id] ? (
                      <img
                        src={photos[item.id]}
                        alt={`Field evidence captured on ${formatDate(item.captured_at)} at ${project.name}`}
                        loading="lazy"
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-44 w-full items-center justify-center text-muted-foreground">
                        <FileImage className="size-6" />
                      </div>
                    )}
                    <figcaption className="space-y-2 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={evidenceBadgeClass(item.status)}>
                          {item.status}
                        </Badge>
                        {item.ai_confidence_score != null ? (
                          <Badge
                            variant="outline"
                            className={aiScoreBadgeClass(item.ai_confidence_score)}
                          >
                            AI {item.ai_confidence_score}%
                          </Badge>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.captured_at)}
                        </span>
                      </div>
                      {item.ai_summary ? (
                        <p className="text-xs text-muted-foreground">{item.ai_summary}</p>
                      ) : null}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle className="text-base">Site location</CardTitle>
              <CardDescription>{formatCoords(project.latitude, project.longitude)}</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectMap
                latitude={project.latitude}
                longitude={project.longitude}
                title={`${project.name} location map`}
              />
            </CardContent>
          </Card>

          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle className="text-base">Issued carbon credits</CardTitle>
              <CardDescription>{totals.tco2e.toFixed(1)} tCO₂e total</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {credits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No credits issued yet.</p>
              ) : (
                credits.map((credit) => (
                  <div
                    key={credit.id}
                    className="rounded-lg border border-border/60 bg-background/40 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{Number(credit.tco2e).toFixed(1)} tCO₂e</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(credit.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {credit.methodology} · {credit.growth_stage} · {credit.area_hectares} ha ·{" "}
                      {credit.years} yr
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-success" />
        Last updated {formatDate(project.updated_at)} — records are published directly from the
        verification database.
      </p>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  valueClass = "",
}: {
  icon: typeof Ruler;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <p className={`mt-2 text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
