import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export function NotificationBell() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const items = data ?? [];
  const unread = items.filter((n) => !n.read).length;

  async function markAllRead() {
    if (unread === 0) return;
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <Popover onOpenChange={(open) => open && void markAllRead()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border/70 px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Nothing here yet.</p>
          )}
          {items.map((n) => (
            <div key={n.id} className="space-y-1 border-b border-border/50 p-3 last:border-b-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{n.title}</p>
                {!n.read && (
                  <Badge variant="outline" className="border-primary/40 bg-primary/15 text-primary">
                    new
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{n.message}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
