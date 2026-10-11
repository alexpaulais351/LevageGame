/**
 * Validation partagée d'un abaque saisi (import CSV, grille éditable, scripts d'import du catalogue).
 * Pure : aucune dépendance React/Supabase. Une seule définition des règles bloquantes et des avertissements.
 */
import { validateChart } from "../../engine/chart";
import type { ChartAxisY, ChartPoint, LoadChart } from "../../engine/types";

export interface EntreeAbaque {
  id: string;
  points: ChartPoint[];
  axisY: ChartAxisY;
  interpolationAllowed: boolean;
  standard: string | null;
  deductionsIncluded: boolean;
  source: { title: string; reference: string | null; edition: string | null; url: string | null };
}

export interface RapportAbaque {
  chart: LoadChart;
  /** Erreurs bloquantes : l'abaque ne peut pas être enregistré. */
  errors: string[];
  /** Avertissements (capacité croissante, cellules vides, source incomplète…) : à contrôler. */
  warnings: string[];
}

const decimals = (v: number) => (Number.isInteger(v) ? 0 : (String(v).split(".")[1] ?? "").length);

/** Construit l'abaque du moteur (statut `a_verifier`) et lui applique `validateChart` + précision stockable en base. */
export function analyserAbaque(e: EntreeAbaque, erreursAmont: string[] = []): RapportAbaque {
  const chart: LoadChart = {
    id: e.id,
    axisX: "radius_m",
    axisY: e.axisY,
    points: e.points,
    interpolationAllowed: e.interpolationAllowed,
    status: "a_verifier",
    standard: e.standard ?? "",
    deductionsIncluded: e.deductionsIncluded,
    source: {
      title: e.source.title,
      reference: e.source.reference ?? "",
      edition: e.source.edition ?? "",
      url: e.source.url ?? "",
    },
  };
  const errors = [...erreursAmont];
  const v = validateChart(chart);
  errors.push(...v.errors);
  const warnings = [...v.warnings];
  // Précision acceptée par la BDD : x,y numeric(_,2) ; capacity_kg numeric(_,1).
  if (e.points.some((p) => decimals(p.x) > 2 || (p.y !== null && decimals(p.y) > 2))) errors.push("portée/y : plus de 2 décimales (non stockable)");
  if (e.points.some((p) => p.capacityKg !== null && decimals(p.capacityKg) > 1))
    errors.push("capacité (kg) : plus de 1 décimale après conversion (non stockable)");
  return { chart, errors, warnings };
}
