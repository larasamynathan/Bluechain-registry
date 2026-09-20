import { Trees, Waves, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Database } from "@/integrations/supabase/types";

export type Ecosystem = Database["public"]["Enums"]["ecosystem_type"];
export type ProjectStatus = Database["public"]["Enums"]["project_status"];
export type AlertSeverity = Database["public"]["Enums"]["alert_severity"];
export type EvidenceStatus = Database["public"]["Enums"]["evidence_status"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];

export const ECOSYSTEMS: { value: Ecosystem; label: string; icon: LucideIcon }[] = [
  { value: "mangrove", label: "Mangrove", icon: Trees },
  { value: "seagrass", label: "Seagrass", icon: Waves },
  { value: "salt_marsh", label: "Salt marsh", icon: Sprout },
];

export function ecosystemMeta(value: Ecosystem): { value: Ecosystem; label: string; icon: LucideIcon } {
  return ECOSYSTEMS.find((e) => e.value === value) ?? { value: "mangrove", label: "Mangrove", icon: Trees };
}

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "monitoring", label: "Monitoring" },
  { value: "verified", label: "Verified" },
  { value: "archived", label: "Archived" },
];

export function statusLabel(status: ProjectStatus) {
  return PROJECT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function statusBadgeClass(status: ProjectStatus) {
  switch (status) {
    case "verified":
      return "badge-stamp border-success/40 bg-success/15 text-success";
    case "active":
      return "badge-stamp border-primary/40 bg-primary/15 text-primary";
    case "monitoring":
      return "badge-stamp border-warning/40 bg-warning/15 text-warning";
    case "archived":
      return "badge-stamp border-border bg-muted text-muted-foreground";
    default:
      return "border-border bg-secondary text-secondary-foreground";
  }
}

export type RiskLevel = "healthy" | "watch" | "at_risk";

export function riskFromHealth(health: number): {
  level: RiskLevel;
  label: string;
  className: string;
  barClassName: string;
} {
  if (health >= 75) {
    return {
      level: "healthy",
      label: "Healthy",
      className: "text-success",
      barClassName: "bg-success",
    };
  }
  if (health >= 50) {
    return {
      level: "watch",
      label: "Watch",
      className: "text-warning",
      barClassName: "bg-warning",
    };
  }
  return {
    level: "at_risk",
    label: "At risk",
    className: "text-destructive",
    barClassName: "bg-destructive",
  };
}

export function severityBadgeClass(severity: AlertSeverity) {
  switch (severity) {
    case "critical":
      return "badge-stamp border-destructive/50 bg-destructive/15 text-destructive";
    case "high":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    case "medium":
      return "badge-stamp border-warning/40 bg-warning/15 text-warning";
    default:
      return "badge-stamp border-border bg-muted text-muted-foreground";
  }
}

export function evidenceBadgeClass(status: EvidenceStatus) {
  switch (status) {
    case "approved":
    case "verified":
      return "badge-stamp border-success/40 bg-success/15 text-success";
    case "rejected":
      return "badge-stamp border-destructive/40 bg-destructive/15 text-destructive";
    case "flagged":
      return "badge-stamp border-destructive/50 bg-destructive/15 text-destructive";
    default:
      return "badge-stamp border-warning/40 bg-warning/15 text-warning";
  }
}

export function evidenceStatusLabel(status: EvidenceStatus) {
  return status === "flagged" ? "flagged for review" : status;
}

/** Color-coded AI confidence badge: green >= 80, yellow 60-79, red < 60. */
export function aiScoreBadgeClass(score: number) {
  if (score >= 80) return "badge-stamp border-success/40 bg-success/15 text-success";
  if (score >= 60) return "badge-stamp border-warning/40 bg-warning/15 text-warning";
  return "badge-stamp border-destructive/40 bg-destructive/15 text-destructive";
}

export function formatCoords(lat: number, lng: number) {
  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
}
