import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export function useRoles() {
  const query = useQuery({
    queryKey: ["my-roles"],
    queryFn: async (): Promise<AppRole[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.role);
    },
    staleTime: 60_000,
  });

  const roles = query.data ?? [];
  const isAdmin = roles.includes("admin");
  return {
    roles,
    isLoading: query.isLoading,
    isAdmin,
    isPendingAdmin: roles.includes("pending_admin") && !isAdmin,
    isVerifier: roles.includes("verifier"),
    canCreateProjects: isAdmin || roles.includes("field_submitter"),
  };
}
