import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import {
  annualRate,
  calculateTco2e,
  GROWTH_STAGES,
  IPCC_TIER1_RATES,
  type GrowthStage,
} from "@/lib/carbon";
import { ECOSYSTEMS, type Ecosystem, type Project } from "@/lib/projects";

type EvidenceGuard = {
  status: string;
  reviewedBy: string | null;
  verifierName: string;
};

export function CarbonCreditDialog({
  project,
  evidenceId,
}: {
  project: Project;
  evidenceId: string;
}) {
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: rolesLoading } = useRoles();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [ecosystem, setEcosystem] = useState<Ecosystem>(project.ecosystem);
  const [area, setArea] = useState(String(project.area_hectares ?? 0));
  const [stage, setStage] = useState<GrowthStage>("growing");
  const [years, setYears] = useState("1");
  const [notes, setNotes] = useState("");

  const areaNum = Number(area) || 0;
  const yearsNum = Number(years) || 0;
  const rate = annualRate(ecosystem, stage);
  const tco2e = calculateTco2e(ecosystem, areaNum, stage, yearsNum);

  const { data: guard } = useQuery({
    queryKey: ["evidence-issuance-guard", evidenceId],
    enabled: open && isAdmin,
    queryFn: async (): Promise<EvidenceGuard> => {
      const { data, error } = await supabase
        .from("evidence_submissions")
        .select("status, reviewed_by")
        .eq("id", evidenceId)
        .maybeSingle();
      if (error) throw error;
      let verifierName = "Unknown verifier";
      if (data?.reviewed_by) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", data.reviewed_by)
          .maybeSingle();
        verifierName = profile?.full_name || profile?.email || "Unknown verifier";
      }
      return {
        status: data?.status ?? "unknown",
        reviewedBy: data?.reviewed_by ?? null,
        verifierName,
      };
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (areaNum <= 0) throw new Error("Area must be greater than zero.");
      if (yearsNum <= 0) throw new Error("Crediting period must be at least one year.");
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("You must be signed in.");
      if (guard && guard.status !== "verified") {
        throw new Error("Credits can only be issued for evidence with status 'verified'.");
      }
      if (guard?.reviewedBy && guard.reviewedBy === userId) {
        throw new Error(
          "Two-person rule: you verified this submission, so a different admin must issue its credits.",
        );
      }

      const { error } = await supabase.from("carbon_credits").insert({
        project_id: project.id,
        evidence_id: evidenceId,
        ecosystem,
        area_hectares: areaNum,
        growth_stage: stage,
        annual_rate_tco2e_ha: rate,
        years: yearsNum,
        tco2e,
        methodology: "IPCC Tier 1",
        notes: notes.trim().slice(0, 1000) || null,
        calculated_by: userId,
        issued_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Issued ${tco2e.toLocaleString()} tCO2e to the credit ledger.`);
      queryClient.invalidateQueries({ queryKey: ["carbon-credits"] });
      queryClient.invalidateQueries({ queryKey: ["issuance-audit-log"] });
      setOpen(false);
      setConfirming(false);
      setConfirmed(false);
      setNotes("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Admin-only action. Verifiers and field submitters never see this button.
  if (rolesLoading || !isAdmin) return null;




  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setConfirming(false);
          setConfirmed(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <Calculator className="size-4" />
          Issue carbon credits
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {confirming ? (
          <>
            <DialogHeader>
              <DialogTitle>Confirm carbon credit issuance</DialogTitle>
              <DialogDescription>
                This action is final and permanently recorded in the immutable issuance audit log.
              </DialogDescription>
            </DialogHeader>

            <dl className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Project</dt>
                <dd className="text-right font-medium">{project.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Evidence</dt>
                <dd className="text-right font-mono text-xs">{evidenceId.slice(0, 8)}…</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Evidence status</dt>
                <dd className="text-right font-medium capitalize">{guard?.status ?? "…"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Approved by verifier</dt>
                <dd className="text-right font-medium">{guard?.verifierName ?? "…"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Methodology</dt>
                <dd className="text-right">IPCC Tier 1 · {stage}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-3">
                <dt className="text-muted-foreground">Amount to issue</dt>
                <dd className="text-right font-display text-lg font-semibold text-primary">
                  {tco2e.toLocaleString()} tCO2e
                </dd>
              </div>
            </dl>

            {guard?.status !== "verified" && (
              <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                Issuance is blocked: evidence must be in the &quot;verified&quot; state.
              </p>
            )}

            <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="mt-0.5"
              />
              <span>I confirm this issuance is accurate and final.</span>
            </label>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Back
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={
                  !confirmed || mutation.isPending || !guard || guard.status !== "verified"
                }
                className="gap-2"
              >
                {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Issue credits
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Carbon credit calculation</DialogTitle>
              <DialogDescription>
                IPCC Tier 1 default accumulation rates for coastal wetlands, adjusted by growth
                stage. Admin-only, and subject to the two-person rule.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cc-ecosystem">Ecosystem type</Label>
                <Select value={ecosystem} onValueChange={(v) => setEcosystem(v as Ecosystem)}>
                  <SelectTrigger id="cc-ecosystem">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ECOSYSTEMS.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        {e.label} — {IPCC_TIER1_RATES[e.value]} tCO2e/ha/yr
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cc-area">Area (hectares)</Label>
                  <Input
                    id="cc-area"
                    type="number"
                    min="0"
                    step="0.01"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cc-years">Crediting period (years)</Label>
                  <Input
                    id="cc-years"
                    type="number"
                    min="0"
                    step="0.5"
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cc-stage">Growth stage</Label>
                <Select value={stage} onValueChange={(v) => setStage(v as GrowthStage)}>
                  <SelectTrigger id="cc-stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROWTH_STAGES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label} — x{s.factor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cc-notes">Notes (optional)</Label>
                <Textarea
                  id="cc-notes"
                  rows={2}
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Assumptions, deductions or buffer pool considerations…"
                />
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Estimated sequestration
                </p>
                <p className="font-display text-2xl font-semibold text-primary">
                  {tco2e.toLocaleString()} tCO2e
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rate} tCO2e/ha/yr × {areaNum.toLocaleString()} ha × {yearsNum} yr
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setConfirming(true)} disabled={tco2e <= 0}>
                Review &amp; confirm
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
