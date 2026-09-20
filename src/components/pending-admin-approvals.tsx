import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, ShieldQuestion, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";

type PendingAdmin = {
  id: string;
  userId: string;
  fullName: string;
  organization: string | null;
  email: string | null;
};

export function PendingAdminApprovals() {
  const queryClient = useQueryClient();
  const { isAdmin } = useRoles();

  const { data = [], isLoading } = useQuery({
    queryKey: ["pending-admins"],
    enabled: isAdmin,
    queryFn: async (): Promise<PendingAdmin[]> => {
      const { data: rows, error } = await supabase
        .from("user_roles")
        .select("id, user_id")
        .eq("role", "pending_admin" as never);
      if (error) throw error;
      const ids = (rows ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, organization, email")
        .in("id", ids);
      return (rows ?? []).map((r) => {
        const p = profiles?.find((x) => x.id === r.user_id);
        return {
          id: r.id,
          userId: r.user_id,
          fullName: p?.full_name ?? "Unnamed user",
          organization: p?.organization ?? null,
          email: p?.email ?? null,
        };
      });
    },
  });

  const decide = useMutation({
    mutationFn: async ({ row, approve }: { row: PendingAdmin; approve: boolean }) => {
      if (approve) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: "admin" })
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("id", row.id);
        if (error) throw error;
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: row.userId, role: "field_submitter" });
        if (insertError) throw insertError;
      }
      await supabase.from("notifications").insert({
        user_id: row.userId,
        title: approve ? "Admin access approved" : "Admin request declined",
        message: approve
          ? "Your admin account has been approved. You now have full registry access."
          : "Your admin request was declined. You have field submitter access instead.",
      });
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.approve ? "Admin approved." : "Request declined.");
      queryClient.invalidateQueries({ queryKey: ["pending-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin || isLoading || data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldQuestion className="size-4 text-warning" />
          Admin approvals
        </CardTitle>
        <CardDescription>
          These users requested admin access at sign-up and are waiting for approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.organization ?? "No organization"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {row.email ?? "No email on file"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ row, approve: true })}
              >
                {decide.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ row, approve: false })}
              >
                <X className="size-4" />
                Decline
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
