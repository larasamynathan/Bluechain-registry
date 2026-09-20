import { useQuery } from "@tanstack/react-query";
import { Download, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadCsv } from "@/lib/export";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  created_at: string;
  admin_id: string;
  evidence_id: string | null;
  project_id: string;
  tco2e_amount: number;
  record_hash: string;
  prev_hash: string | null;
};

export function IssuanceHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ["issuance-audit-log"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("issuance_audit_log")
        .select("id, created_at, admin_id, evidence_id, project_id, tco2e_amount, record_hash, prev_hash")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const list = (rows ?? []) as Row[];
      const adminIds = [...new Set(list.map((r) => r.admin_id))];
      const projectIds = [...new Set(list.map((r) => r.project_id))];
      const [{ data: profiles }, { data: projects }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", adminIds),
        supabase.from("projects").select("id, name").in("id", projectIds),
      ]);
      return list.map((r) => {
        const p = profiles?.find((x) => x.id === r.admin_id);
        return {
          ...r,
          adminName: p?.full_name || p?.email || r.admin_id.slice(0, 8),
          projectName: projects?.find((x) => x.id === r.project_id)?.name ?? "Unknown project",
        };
      });
    },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="size-4 text-primary" />
            Issuance history
          </CardTitle>
          <CardDescription>
            Immutable, hash-chained record of every carbon credit issuance. Read-only — no one,
            including admins, can edit or delete these entries.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-2"
          disabled={!data || data.length === 0}
          onClick={() =>
            downloadCsv(
              "issuance-history",
              (data ?? []).map((r) => ({
                timestamp: r.created_at,
                issued_by: r.adminName,
                project: r.projectName,
                evidence_id: r.evidence_id ?? "",
                tco2e: r.tco2e_amount,
                record_hash: r.record_hash,
                prev_hash: r.prev_hash ?? "",
              })),
            )
          }
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading issuance log…</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No carbon credits have been issued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Issued by</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead className="text-right">tCO2e</TableHead>
                  <TableHead>Record hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">{r.adminName}</TableCell>
                    <TableCell className="text-sm">{r.projectName}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.evidence_id ? `${r.evidence_id.slice(0, 8)}…` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {Number(r.tco2e_amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {r.record_hash.slice(0, 12)}…
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
