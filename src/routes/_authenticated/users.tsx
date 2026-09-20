import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, ShieldX, Trash2, UserCog, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";

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

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "Team & Roles — BlueChain Registry" },
      {
        name: "description",
        content: "Manage registry members and their admin, verifier and field submitter roles.",
      },
    ],
  }),
  component: UsersPage,
});

type AppRole = Database["public"]["Enums"]["app_role"];

const ASSIGNABLE_ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "verifier", label: "Verifier" },
  { value: "field_submitter", label: "Field submitter" },
  { value: "developer", label: "Developer" },
];

function roleBadgeClass(role: AppRole) {
  switch (role) {
    case "admin":
      return "border-primary/40 bg-primary/15 text-primary";
    case "verifier":
      return "border-success/40 bg-success/15 text-success";
    case "pending_admin":
      return "border-warning/40 bg-warning/15 text-warning";
    case "developer":
      return "border-chart-5/40 bg-chart-5/15 text-foreground";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

type MemberRow = {
  id: string;
  fullName: string;
  email: string | null;
  organization: string | null;
  roles: { id: string; role: AppRole }[];
};

function useMembers() {
  return useQuery({
    queryKey: ["registry-members"],
    queryFn: async (): Promise<MemberRow[]> => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, organization"),
        supabase.from("user_roles").select("id, user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      return (profiles ?? []).map((p) => ({
        id: p.id,
        fullName: p.full_name ?? "Unnamed user",
        email: p.email,
        organization: p.organization,
        roles: (roles ?? [])
          .filter((r) => r.user_id === p.id)
          .map((r) => ({ id: r.id, role: r.role })),
      }));
    },
    staleTime: 20_000,
  });
}

function UsersPage() {
  const { isAdmin, isLoading: rolesLoading } = useRoles();

  if (rolesLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking your permissions…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldX className="size-4 text-destructive" />
            Admin access required
          </CardTitle>
          <CardDescription>
            Only administrators can view and manage registry members.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <UsersManager />;
}

function UsersManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useMembers();
  const [search, setSearch] = useState("");
  const [pendingRoleByUser, setPendingRoleByUser] = useState<Record<string, AppRole>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useMemo(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const grant = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Role granted",
        message: `You were granted the ${role.replace("_", " ")} role.`,
      });
    },
    onSuccess: () => {
      toast.success("Role granted.");
      queryClient.invalidateQueries({ queryKey: ["registry-members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async ({ roleRowId }: { roleRowId: string; userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleRowId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(`${vars.role.replace("_", " ")} role removed.`);
      queryClient.invalidateQueries({ queryKey: ["registry-members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const members = (data ?? []).filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.fullName.toLowerCase().includes(q) ||
      (m.email ?? "").toLowerCase().includes(q) ||
      (m.organization ?? "").toLowerCase().includes(q)
    );
  });

  const counts = ASSIGNABLE_ROLES.map((r) => ({
    ...r,
    count: (data ?? []).filter((m) => m.roles.some((role) => role.role === r.value)).length,
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <UserCog className="size-6 text-primary" />
          Team &amp; roles
        </h1>
        <p className="text-sm text-muted-foreground">
          Grant or revoke admin, verifier and field-submitter access for registry members.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map((c) => (
          <Card key={c.value}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{c.label}s</CardDescription>
              <UsersIcon className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{c.count}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">All members</CardTitle>
            <CardDescription>
              {isLoading ? "Loading…" : `${members.length} of ${data?.length ?? 0} member(s)`}
            </CardDescription>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, org…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">Could not load members.</p>}
          {!isLoading && members.length === 0 && (
            <p className="text-sm text-muted-foreground">No members match your search.</p>
          )}
          {members.map((m) => {
            const isSelf = m.id === currentUserId;
            const activeRoleValues = new Set(m.roles.map((r) => r.role));
            const assignable = ASSIGNABLE_ROLES.filter((r) => !activeRoleValues.has(r.value));
            const chosen = pendingRoleByUser[m.id] ?? assignable[0]?.value;

            return (
              <div
                key={m.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {m.fullName} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.email ?? "No email"} · {m.organization ?? "No organization"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.roles.length === 0 && (
                      <Badge variant="outline" className="text-muted-foreground">
                        no role
                      </Badge>
                    )}
                    {m.roles.map((r) => (
                      <Badge
                        key={r.id}
                        variant="outline"
                        className={`gap-1 pr-1 ${roleBadgeClass(r.role)}`}
                      >
                        {r.role.replace("_", " ")}
                        <button
                          type="button"
                          aria-label={`Remove ${r.role} role`}
                          className="rounded-full p-0.5 hover:bg-destructive/20"
                          disabled={revoke.isPending || (isSelf && r.role === "admin")}
                          onClick={() =>
                            revoke.mutate({ roleRowId: r.id, userId: m.id, role: r.role })
                          }
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {assignable.length > 0 && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Select
                      value={chosen ?? ""}
                      onValueChange={(v) =>
                        setPendingRoleByUser((s) => ({ ...s, [m.id]: v as AppRole }))
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Choose role" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignable.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1"
                      disabled={!chosen || grant.isPending}
                      onClick={() => chosen && grant.mutate({ userId: m.id, role: chosen })}
                    >
                      <Plus className="size-3.5" />
                      Grant
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
