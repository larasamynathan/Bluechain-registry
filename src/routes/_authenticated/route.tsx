import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { RoleDebugBadge } from "@/components/role-debug-badge";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Admin accounts stay in 'pending_admin' until an active admin approves them.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const list = (roles ?? []).map((r) => r.role as string);
    if (list.includes("pending_admin") && !list.includes("admin")) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }

    return { user: data.user };
  },

  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-transparent">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <header className="workspace-header sticky top-0 z-20 flex h-14 items-center gap-3 px-3">
            <SidebarTrigger />
            <span className="truncate text-sm text-muted-foreground">{user.email}</span>
            <RoleDebugBadge />
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </header>

          <main className="page-enter flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
