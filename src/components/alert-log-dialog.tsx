import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { AlertSeverity } from "@/lib/projects";

export const ALERT_TYPES = [
  { value: "erosion", label: "Erosion" },
  { value: "water_quality", label: "Water quality" },
  { value: "biodiversity_loss", label: "Biodiversity loss" },
  { value: "deforestation", label: "Deforestation / clearing" },
  { value: "anomaly", label: "Submission anomaly" },
] as const;

export const ALERT_SEVERITIES: { value: AlertSeverity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function alertTypeLabel(value: string) {
  return ALERT_TYPES.find((t) => t.value === value)?.label ?? value.replace(/_/g, " ");
}

export function AlertLogDialog({
  projectId,
  defaultType,
  defaultMessage,
  triggerLabel = "Log alert",
  triggerVariant = "secondary",
  triggerSize = "default",
}: {
  projectId?: string;
  defaultType?: string;
  defaultMessage?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "secondary" | "outline" | "ghost";
  triggerSize?: "default" | "sm";
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [project, setProject] = useState(projectId ?? "");
  const [type, setType] = useState<string>(defaultType ?? "erosion");
  const [severity, setSeverity] = useState<AlertSeverity>("medium");
  const [message, setMessage] = useState(defaultMessage ?? "");

  const projectsQuery = useQuery({
    queryKey: ["alert-project-options"],
    enabled: open && !projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const targetProject = projectId ?? project;
      if (!targetProject) throw new Error("Select a project for this alert.");
      const trimmed = message.trim().slice(0, 1000);
      if (trimmed.length < 5) throw new Error("Describe the issue (at least 5 characters).");

      const { error } = await supabase.from("alerts").insert({
        project_id: targetProject,
        alert_type: type,
        severity,
        message: trimmed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert logged against the project.");
      setOpen(false);
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["project-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["all-alerts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className="gap-2">
          <TriangleAlert className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log an alert</DialogTitle>
          <DialogDescription>
            Raise a site-integrity issue against a restoration project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!projectId && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {(projectsQuery.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Alert type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={severity}
                onValueChange={(v) => setSeverity(v as AlertSeverity)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_SEVERITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert-message">What did you observe?</Label>
            <Textarea
              id="alert-message"
              rows={4}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Shoreline retreat of ~4 m observed on the northern edge…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="gap-2"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Log alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
