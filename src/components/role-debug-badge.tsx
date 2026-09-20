import { Badge } from "@/components/ui/badge";
import { useRoles } from "@/hooks/use-roles";

const LABELS: Record<string, string> = {
  admin: "Admin",
  verifier: "Verifier",
  field_submitter: "Field submitter",
  pending_admin: "Pending admin",
  developer: "Developer",
};

/** Shows the role(s) actually read from the database for the signed-in user. */
export function RoleDebugBadge() {
  const { roles, isLoading } = useRoles();

  if (isLoading) {
    return (
      <Badge variant="outline" className="text-xs font-normal">
        role: loading…
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-primary/40 bg-primary/10 text-xs font-normal text-primary"
      title="Role read from the database for the current session"
    >
      role: {roles.length ? roles.map((r) => LABELS[r] ?? r).join(", ") : "none assigned"}
    </Badge>
  );
}
