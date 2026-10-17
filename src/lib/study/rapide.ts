/**
 * Adéquation rapide (D43) : vérification d'UNE pose de charge à l'abaque, sans dossier.
 * Seuls la charge totale (charge × coef. de marge + accessoires + moufle / crochet), la capacité lue
 * et le taux sont calculés : élingage, sol, vent, lignes et personnel ne sont pas contrôlés.
 */
import { computeVerdict, maxRadius, totalLoad, type Calc, type VerdictResult } from "@/engine";

import { createInitialData } from "./defaults";
import { liftPositions, thresholds, totalLoadInput } from "./mapping";
import type { StudyData } from "./types";

export const ID_POSE_RAPIDE = "pose";

export function donneesRapides(): StudyData {
  const d = createInitialData();
  return { ...d, geometrie: { ...d.geometrie, positions: [{ id: ID_POSE_RAPIDE, nom: "Pose", porteeM: null, yM: null, angleDeg: null }] } };
}

export interface ResultatRapide {
  chargeTotale: Calc<number | null>;
  verdict: Calc<VerdictResult>;
  porteeMax: Calc<number | null> | null;
}

export function calculRapide(d: StudyData): ResultatRapide {
  const chargeTotale = totalLoad(totalLoadInput(d));
  const chart = d.machine.selection?.chart ?? null;
  const verdict = computeVerdict({ chart, positions: liftPositions(d), chargeTotaleKg: chargeTotale.value, thresholds: thresholds(d) });
  const y = d.geometrie.positions[0]?.yM ?? null;
  const porteeMax = chart && chargeTotale.value !== null ? maxRadius(chart, chargeTotale.value, chart.axisY === "none" ? null : y) : null;
  return { chargeTotale, verdict, porteeMax };
}
