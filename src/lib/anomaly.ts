import type { Database } from "@/integrations/supabase/types";
import type { Project } from "@/lib/projects";

export type Evidence = Database["public"]["Tables"]["evidence_submissions"]["Row"];
export type EvidenceWithProject = Evidence & { projects: Project | null };

/** Distance in metres between two WGS84 coordinates (haversine). */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export const DUPLICATE_RADIUS_M = 50;
export const DUPLICATE_WINDOW_HOURS = 24;

/**
 * Reasonable working radius around a project's registered point: the radius of
 * a circle with the project's area, tripled, with a 2 km floor for small sites.
 */
export function projectRadiusMeters(areaHectares: number): number {
  const areaM2 = Math.max(0, Number(areaHectares) || 0) * 10_000;
  const equivalentRadius = Math.sqrt(areaM2 / Math.PI);
  return Math.max(2_000, equivalentRadius * 3);
}

export type AnomalyReason = {
  kind: "duplicate" | "out_of_bounds";
  label: string;
  detail: string;
};

export type AnomalyFinding = {
  evidence: EvidenceWithProject;
  reasons: AnomalyReason[];
};

function hasGps(e: EvidenceWithProject): e is EvidenceWithProject & {
  latitude: number;
  longitude: number;
} {
  return e.latitude !== null && e.longitude !== null;
}

export function detectAnomalies(items: EvidenceWithProject[]): AnomalyFinding[] {
  const withGps = items.filter(hasGps);
  const reasonsById = new Map<string, AnomalyReason[]>();

  const add = (id: string, reason: AnomalyReason) => {
    const list = reasonsById.get(id) ?? [];
    if (!list.some((r) => r.kind === reason.kind && r.detail === reason.detail)) {
      list.push(reason);
    }
    reasonsById.set(id, list);
  };

  // 1. Near-duplicate submissions: within 50 m and 24 hours of each other.
  for (let i = 0; i < withGps.length; i += 1) {
    for (let j = i + 1; j < withGps.length; j += 1) {
      const a = withGps[i]!;
      const b = withGps[j]!;
      const meters = distanceMeters(a.latitude, a.longitude, b.latitude, b.longitude);
      if (meters > DUPLICATE_RADIUS_M) continue;
      const hours =
        Math.abs(new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()) /
        3_600_000;
      if (hours > DUPLICATE_WINDOW_HOURS) continue;

      const detailFor = (other: EvidenceWithProject) =>
        `${meters.toFixed(0)} m and ${hours.toFixed(1)} h apart from a submission on ${
          other.projects?.name ?? "another project"
        } (${new Date(other.captured_at).toLocaleString()})`;

      add(a.id, {
        kind: "duplicate",
        label: "Possible duplicate submission",
        detail: detailFor(b),
      });
      add(b.id, {
        kind: "duplicate",
        label: "Possible duplicate submission",
        detail: detailFor(a),
      });
    }
  }

  // 2. GPS far outside the project's registered location.
  for (const item of withGps) {
    const project = item.projects;
    if (!project) continue;
    const meters = distanceMeters(
      item.latitude,
      item.longitude,
      project.latitude,
      project.longitude,
    );
    const allowed = projectRadiusMeters(Number(project.area_hectares));
    if (meters > allowed) {
      add(item.id, {
        kind: "out_of_bounds",
        label: "GPS outside project boundary",
        detail: `${(meters / 1000).toFixed(1)} km from the registered site location (expected within ${(
          allowed / 1000
        ).toFixed(1)} km)`,
      });
    }
  }

  return withGps
    .filter((item) => reasonsById.has(item.id))
    .map((evidence) => ({ evidence, reasons: reasonsById.get(evidence.id) ?? [] }))
    .sort((a, b) => b.reasons.length - a.reasons.length);
}
