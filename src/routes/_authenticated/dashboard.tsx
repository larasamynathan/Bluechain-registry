import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BellRing,
  CheckCircle2,
  Clock,
  Camera,
  Download,
  Leaf,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SubmitterDashboard } from "@/components/dashboards/submitter-dashboard";
import { VerifierDashboard } from "@/components/dashboards/verifier-dashboard";
import { IssuanceQueue } from "@/components/dashboards/issuance-queue";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoles } from "@/hooks/use-roles";
import { PendingAdminApprovals } from "@/components/pending-admin-approvals";
import { IssuanceHistory } from "@/components/issuance-history";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { downloadCsv } from "@/lib/export";
import { ecosystemMeta, severityBadgeClass, type AlertSeverity, type Ecosystem } from "@/lib/projects";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Analytics Dashboard — BlueChain Registry" },
      {
        name: "description",
        content:
          "Admin analytics for blue carbon restoration: credits issued, verification throughput and site alerts.",
      },
      { property: "og:title", content: "Analytics Dashboard — BlueChain Registry" },
      {
        property: "og:description",
        content:
          "Admin analytics for blue carbon restoration: credits issued, verification throughput and site alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

type ProjectLite = {
  id: string;
  name: string;
  ecosystem: Ecosystem;
  status: Database["public"]["Enums"]["project_status"];
  created_at: string;
};
type EvidenceLite = {
  id: string;
  project_id: string;
  status: Database["public"]["Enums"]["evidence_status"];
  created_at: string;
  reviewed_at: string | null;
  ai_confidence_score: number | null;
  reviewed_by: string | null;

};
type CreditLite = { id: string; project_id: string; tco2e: number; created_at: string };
type AlertLite = {
  id: string;
  project_id: string;
  severity: AlertSeverity;
  alert_type: string;
  message: string;
  created_at: string;
};

const ECOSYSTEM_COLORS: Record<Ecosystem, string> = {
  mangrove: "var(--primary)",
  seagrass: "var(--success)",
  salt_marsh: "var(--warning)",
};

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function weekKey(iso: string) {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

function formatHours(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} d`;
}

function useAnalytics() {
  return useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [projects, evidence, credits, alerts, pending, reviewers] = await Promise.all([
        supabase.from("projects").select("id, name, ecosystem, status, created_at"),
        supabase
          .from("evidence_submissions")
          .select("id, project_id, status, created_at, reviewed_at, ai_confidence_score, reviewed_by")
          .order("created_at", { ascending: false }),
        supabase.from("carbon_credits").select("id, project_id, tco2e, created_at").order("created_at"),
        supabase
          .from("alerts")
          .select("id, project_id, severity, alert_type, message, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("user_roles").select("id").eq("role", "pending_admin" as never),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      const err = projects.error || evidence.error || credits.error || alerts.error;
      if (err) throw err;
      return {
        projects: (projects.data ?? []) as ProjectLite[],
        evidence: (evidence.data ?? []) as EvidenceLite[],
        credits: (credits.data ?? []) as CreditLite[],
        alerts: (alerts.data ?? []) as AlertLite[],
        pendingAdmins: (pending.data ?? []).length,
        people: (reviewers.data ?? []) as { id: string; full_name: string | null; email: string | null }[],
      };

    },
    staleTime: 30_000,
  });
}

function DashboardPage() {
  const { roles, isAdmin, isVerifier, isLoading: rolesLoading } = useRoles();

  if (rolesLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading your dashboard…
      </div>
    );
  }
  if (roles.length === 0) {
    return (
      <Card className="mx-auto max-w-lg border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">No role assigned</CardTitle>
          <CardDescription>
            Your account has no role assigned — contact an administrator. Until a role is granted we
            cannot show you a dashboard.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  if (isAdmin) return <AdminDashboard />;
  if (isVerifier) return <VerifierDashboard />;
  return <SubmitterDashboard />;
}


function AdminDashboard() {
  const { data, isLoading, error } = useAnalytics();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading analytics…
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-destructive">Could not load analytics data.</p>;
  }

  const { projects, evidence, credits, alerts, pendingAdmins, people } = data;

  const STATUS_META: { key: string; label: string; color: string }[] = [
    { key: "pending", label: "Pending", color: "var(--muted-foreground)" },
    { key: "flagged", label: "Flagged", color: "var(--warning)" },
    { key: "verified", label: "Verified", color: "var(--success)" },
    { key: "approved", label: "Approved", color: "var(--primary)" },
    { key: "rejected", label: "Rejected", color: "var(--destructive)" },
  ];
  const statusSeries = STATUS_META.map((s) => ({
    ...s,
    count: evidence.filter((e) => e.status === s.key).length,
  }));

  const personLabel = (id: string) => {
    const p = people.find((x) => x.id === id);
    return p?.full_name || p?.email || `${id.slice(0, 8)}…`;
  };
  const verifierCounts = new Map<string, number>();
  for (const e of evidence) {
    if (!e.reviewed_by) continue;
    verifierCounts.set(e.reviewed_by, (verifierCounts.get(e.reviewed_by) ?? 0) + 1);
  }
  const verifierSeries = [...verifierCounts.entries()]
    .map(([id, count]) => ({ name: personLabel(id), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);


  const totalTco2e = credits.reduce((sum, c) => sum + Number(c.tco2e ?? 0), 0);
  const reviewed = evidence.filter((e) => ["verified", "approved", "rejected"].includes(e.status));
  const passed = reviewed.filter((e) => e.status !== "rejected");
  const successRate = reviewed.length ? (passed.length / reviewed.length) * 100 : 0;

  const turnarounds = evidence
    .filter((e) => e.reviewed_at)
    .map((e) => (new Date(e.reviewed_at!).getTime() - new Date(e.created_at).getTime()) / 3_600_000)
    .filter((h) => h >= 0);
  const avgHours = turnarounds.length
    ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length
    : 0;

  // Credits over time (cumulative by month)
  const byMonth = new Map<string, number>();
  for (const c of credits) {
    const k = monthKey(c.created_at);
    byMonth.set(k, (byMonth.get(k) ?? 0) + Number(c.tco2e ?? 0));
  }
  let running = 0;
  const creditSeries = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => {
      running += value;
      return { month, issued: Number(value.toFixed(2)), cumulative: Number(running.toFixed(2)) };
    });

  // Ecosystem breakdown
  const ecoCounts = new Map<Ecosystem, number>();
  for (const p of projects) ecoCounts.set(p.ecosystem, (ecoCounts.get(p.ecosystem) ?? 0) + 1);
  const ecoSeries = [...ecoCounts.entries()].map(([eco, count]) => ({
    name: ecosystemMeta(eco).label,
    value: count,
    color: ECOSYSTEM_COLORS[eco],
  }));

  // Weekly submissions vs verifications
  const weeks = new Map<string, { week: string; submissions: number; verifications: number }>();
  const touch = (k: string) =>
    weeks.get(k) ?? weeks.set(k, { week: k, submissions: 0, verifications: 0 }).get(k)!;
  for (const e of evidence) touch(weekKey(e.created_at)).submissions += 1;
  for (const e of evidence) if (e.reviewed_at) touch(weekKey(e.reviewed_at)).verifications += 1;
  const weekSeries = [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week)).slice(-12);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "Unknown project";

  type Feed = {
    id: string;
    kind: "submission" | "verification" | "alert";
    at: string;
    title: string;
    detail: string;
    projectId: string;
    severity?: AlertSeverity;
  };
  const feed: Feed[] = [
    ...evidence.slice(0, 15).map<Feed>((e) => ({
      id: `s-${e.id}`,
      kind: "submission",
      at: e.created_at,
      title: "Evidence submitted",
      detail: `${projectName(e.project_id)}${
        e.ai_confidence_score != null ? ` · AI ${e.ai_confidence_score}%` : ""
      }`,
      projectId: e.project_id,
    })),
    ...evidence
      .filter((e) => e.reviewed_at)
      .slice(0, 15)
      .map<Feed>((e) => ({
        id: `v-${e.id}`,
        kind: "verification",
        at: e.reviewed_at!,
        title: e.status === "rejected" ? "Evidence rejected" : "Evidence verified",
        detail: projectName(e.project_id),
        projectId: e.project_id,
      })),
    ...alerts.map<Feed>((a) => ({
      id: `a-${a.id}`,
      kind: "alert",
      at: a.created_at,
      title: `Alert: ${a.alert_type.replace(/_/g, " ")}`,
      detail: `${projectName(a.project_id)} · ${a.message}`,
      projectId: a.project_id,
      severity: a.severity,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 12);

  const kpis = [
    {
      label: "Total projects",
      value: projects.length.toLocaleString(),
      hint: `${projects.filter((p) => p.status === "verified").length} verified`,
      icon: Leaf,
    },
    {
      label: "Evidence submissions",
      value: evidence.length.toLocaleString(),
      hint: `${statusSeries.find((s) => s.key === "pending")?.count ?? 0} awaiting review`,
      icon: Camera,
    },
    {
      label: "Credits issued",
      value: `${totalTco2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} tCO₂e`,
      hint: `${credits.length} issuance${credits.length === 1 ? "" : "s"}`,
      icon: ShieldCheck,
    },
    {
      label: "Verification success",
      value: `${successRate.toFixed(1)}%`,
      hint: `${passed.length}/${reviewed.length} reviewed`,
      icon: CheckCircle2,
    },
    {
      label: "Pending admin approvals",
      value: pendingAdmins.toLocaleString(),
      hint: `avg. review ${formatHours(avgHours)}`,
      icon: Clock,
    },
  ];


  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Analytics dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Portfolio-wide MRV performance across every restoration site.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              downloadCsv(
                "evidence-submissions",
                evidence.map((e) => ({
                  id: e.id,
                  project: projectName(e.project_id),
                  status: e.status,
                  created_at: e.created_at,
                  reviewed_at: e.reviewed_at ?? "",
                  ai_confidence_score: e.ai_confidence_score ?? "",
                })),
              )
            }
          >
            <Download className="size-4" />
            Export evidence CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              downloadCsv(
                "carbon-credits",
                credits.map((c) => ({
                  id: c.id,
                  project: projectName(c.project_id),
                  tco2e: c.tco2e,
                  created_at: c.created_at,
                })),
              )
            }
          >
            <Download className="size-4" />
            Export credits CSV
          </Button>
        </div>
      </header>

      <PendingAdminApprovals />

      <IssuanceQueue />



      <section className="dashboard-kpis grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((k, index) => (
          <Card key={k.label} className={index === 2 ? "kpi-focus sm:col-span-2 xl:col-span-2" : "xl:col-span-1"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{k.label}</CardDescription>
              <k.icon className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className={index === 2 ? "text-4xl font-medium" : "text-2xl font-medium"}>{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Carbon credits issued over time</CardTitle>
            <CardDescription>Monthly issuance and cumulative total (tCO₂e)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {creditSeries.length === 0 ? (
              <EmptyChart label="No credits issued yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={creditSeries} margin={{ left: -16, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="currentColor" />
                  <YAxis tick={{ fontSize: 12 }} stroke="currentColor" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    name="Cumulative"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="issued"
                    name="Issued"
                    stroke="var(--success)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projects by ecosystem</CardTitle>
            <CardDescription>Portfolio composition</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {ecoSeries.length === 0 ? (
              <EmptyChart label="No projects yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ecoSeries}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {ecoSeries.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evidence by status</CardTitle>
            <CardDescription>All submissions platform-wide</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusSeries} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="currentColor" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Bar dataKey="count" name="Submissions" radius={[4, 4, 0, 0]}>
                  {statusSeries.map((s) => (
                    <Cell key={s.key} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verifier activity</CardTitle>
            <CardDescription>Reviews completed per verifier</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {verifierSeries.length === 0 ? (
              <EmptyChart label="No reviews completed yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={verifierSeries}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 12 }}
                    stroke="currentColor"
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                  <Bar dataKey="count" name="Reviews" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>


      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Verification queue trend</CardTitle>
            <CardDescription>Submissions vs verifications per week (last 12 weeks)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {weekSeries.length === 0 ? (
              <EmptyChart label="No submissions yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekSeries} margin={{ left: -16, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="currentColor" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="submissions" name="Submissions" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="verifications" name="Verifications" fill="var(--success)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>Submissions, verifications and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {feed.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
            {feed.map((item) => {
              const Icon =
                item.kind === "alert" ? BellRing : item.kind === "verification" ? CheckCircle2 : Camera;
              return (
                <Link
                  key={item.id}
                  to="/projects/$projectId"
                  params={{ projectId: item.projectId }}
                  className="flex gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/50"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      {item.severity && (
                        <Badge variant="outline" className={severityBadgeClass(item.severity)}>
                          {item.severity}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                    <p className="text-xs text-muted-foreground/80">
                      {new Date(item.at).toLocaleString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <IssuanceHistory />
    </div>
  );
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
      <Activity className="size-4" /> {label}
    </div>
  );
}
