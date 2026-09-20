import type { Ecosystem } from "@/lib/projects";

export type GrowthStage = "establishing" | "growing" | "mature";

export const GROWTH_STAGES: { value: GrowthStage; label: string; factor: number }[] = [
  { value: "establishing", label: "Establishing (0–3 yrs)", factor: 0.5 },
  { value: "growing", label: "Growing (3–10 yrs)", factor: 1 },
  { value: "mature", label: "Mature (10+ yrs)", factor: 1.35 },
];

/**
 * IPCC Tier 1 default annual soil + biomass carbon accumulation rates for
 * coastal wetlands, expressed as tCO2e per hectare per year.
 */
export const IPCC_TIER1_RATES: Record<Ecosystem, number> = {
  mangrove: 6.9,
  seagrass: 4.3,
  salt_marsh: 6.2,
};

export function growthFactor(stage: GrowthStage) {
  return GROWTH_STAGES.find((s) => s.value === stage)?.factor ?? 1;
}

export function growthStageLabel(stage: string) {
  return GROWTH_STAGES.find((s) => s.value === stage)?.label ?? stage;
}

/** Annual rate (tCO2e/ha/yr) adjusted for growth stage. */
export function annualRate(ecosystem: Ecosystem, stage: GrowthStage) {
  return Number((IPCC_TIER1_RATES[ecosystem] * growthFactor(stage)).toFixed(3));
}

/** IPCC Tier 1 estimate: area (ha) x adjusted annual rate x years. */
export function calculateTco2e(
  ecosystem: Ecosystem,
  areaHectares: number,
  stage: GrowthStage,
  years: number,
) {
  const rate = annualRate(ecosystem, stage);
  return Number((rate * Math.max(0, areaHectares) * Math.max(0, years)).toFixed(2));
}
