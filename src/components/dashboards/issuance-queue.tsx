import { useQuery } from "@tanstack/react-query";
import { Coins, Loader2 } from "lucide-react";

import { CarbonCreditDialog } from "@/components/carbon-credit-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/lib/projects";

export function IssuanceQueue() {
  const { data, isLoading } = useQuery({
    queryKey: ["issuance-queue"],
    queryFn: async () => {
      const [evidence, credits] = await Promise.all([
        supabase
          .from("evidence_submissions")
          .select("id, project_id, created_at, reviewed_at")
          .eq("status", "verified")
          .order("reviewed_at", { ascending: false }),
        supabase.from("carbon_credits").select("evidence_id"),
      ]);
      if (evidence.error) throw evidence.error;
      if (credits.error) throw credits.error;
      const issued = new Set((credits.data ?? []).map((c) => c.evidence_id));
      const pending = (evidence.data ?? []).filter((e) => !issued.has(e.id));
      const projectIds = [...new Set(pending.map((e) => e.project_id))];
      if (projectIds.length === 0) return [];
      const { data: projects } = await supabase.from("projects").select("*").in("id", projectIds);
      return pending
        .map((e) => ({
          evidenceId: e.id,
          reviewedAt: e.reviewed_at,
          project: (projects ?? []).find((p) => p.id === e.project_id) as Project | undefined,
        }))
        .filter((row) => Boolean(row.project));
    },
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="size-4 text-primary" />
          Ready to issue
        </CardTitle>
        <CardDescription>
          Verified evidence with no carbon credits issued yet. Issuance is admin-only and follows
          the two-person rule.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading issuance queue…
          </p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing awaiting issuance — every verified submission has been credited.
          </p>
        ) : (
          data.slice(0, 6).map((row) => (
            <div
              key={row.evidenceId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.project!.name}</p>
                <p className="text-xs text-muted-foreground">
                  Verified{" "}
                  {row.reviewedAt ? new Date(row.reviewedAt).toLocaleDateString() : "recently"} ·
                  evidence {row.evidenceId.slice(0, 8)}…
                </p>
              </div>
              <CarbonCreditDialog project={row.project!} evidenceId={row.evidenceId} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
