import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileStack, ImageOff, Loader2, MapPin, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { downloadCsv } from "@/lib/export";
import {
  aiScoreBadgeClass,
  ecosystemMeta,
  evidenceBadgeClass,
  evidenceStatusLabel,
  formatCoords,
  type EvidenceStatus,
  type Project,
} from "@/lib/projects";

export const Route = createFileRoute("/_authenticated/evidence")({
  head: () => ({
    meta: [
      { title: "Evidence — BlueChain Registry" },
      {
        name: "description",
        content: "Field photos, sensor readings and survey documents supporting each MRV claim.",
      },
      { property: "og:title", content: "Evidence — BlueChain Registry" },
      {
        property: "og:description",
        content: "Field photos, sensor readings and survey documents supporting each MRV claim.",
      },
    ],
  }),
  component: EvidencePage,
});

type Evidence = Database["public"]["Tables"]["evidence_submissions"]["Row"];
type Row = Evidence & { projects: Project | null };

const STATUS_FILTERS: { value: EvidenceStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "flagged", label: "Flagged" },
  { value: "verified", label: "Verified" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function Thumb({ path }: { path: string | null }) {
  const { data } = useQuery({
    queryKey: ["evidence-explorer-thumb", path],
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
  if (!path || !data) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted text-muted-foreground">
        <ImageOff className="size-4" />
      </div>
    );
  }
  return (
    <img
      src={data}
      alt="Evidence thumbnail"
      loading="lazy"
      className="size-14 shrink-0 rounded-lg border border-border/60 object-cover"
    />
  );
}

function EvidencePage() {
  const { isAdmin, isVerifier, isLoading: rolesLoading } = useRoles();
  const canSeeAll = isAdmin || isVerifier;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EvidenceStatus | "all">("all");

  const query = useQuery({
    queryKey: ["evidence-explorer", canSeeAll],
    enabled: !rolesLoading,
    queryFn: async (): Promise<Row[]> => {
      let builder = supabase
        .from("evidence_submissions")
        .select("*, projects(*)")
        .order("created_at", { ascending: false });
      if (!canSeeAll) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (userId) builder = builder.eq("submitter_id", userId);
      }
      const { data, error } = await builder;
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = query.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return (
        (r.projects?.name ?? "").toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, status]);

  if (rolesLoading || query.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading evidence…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <FileStack className="size-6 text-primary" />
            Evidence
          </h1>
          <p className="text-sm text-muted-foreground">
            {canSeeAll
              ? "Every MRV evidence bundle submitted across the registry."
              : "Field imagery and survey documentation you have submitted."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={filtered.length === 0}
          onClick={() =>
            downloadCsv(
              "evidence",
              filtered.map((r) => ({
                id: r.id,
                project: r.projects?.name ?? "",
                ecosystem: r.projects ? ecosystemMeta(r.projects.ecosystem).label : "",
                status: r.status,
                captured_at: r.captured_at,
                ai_confidence_score: r.ai_confidence_score ?? "",
                latitude: r.latitude ?? "",
                longitude: r.longitude ?? "",
                notes: r.notes ?? "",
              })),
            )
          }
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </header>

      <Card>
        <CardHeader className="flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {filtered.length} submission{filtered.length === 1 ? "" : "s"}
            </CardTitle>
            <CardDescription>Filter by project keyword, note text or status.</CardDescription>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search project or notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as EvidenceStatus | "all")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No evidence matches your filters.</p>
          )}
          {filtered.map((item) => (
            <Link
              key={item.id}
              to="/projects/$projectId"
              params={{ projectId: item.project_id }}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/40"
            >
              <Thumb path={item.photo_path} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {item.projects?.name ?? "Unknown project"}
                  </p>
                  <Badge variant="outline" className={evidenceBadgeClass(item.status)}>
                    {evidenceStatusLabel(item.status)}
                  </Badge>
                  {item.ai_confidence_score !== null && (
                    <Badge variant="outline" className={aiScoreBadgeClass(item.ai_confidence_score)}>
                      AI {item.ai_confidence_score}%
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {new Date(item.captured_at).toLocaleString()}
                  {item.notes ? ` · ${item.notes}` : ""}
                </p>
                {item.latitude !== null && item.longitude !== null && (
                  <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    {formatCoords(item.latitude, item.longitude)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
