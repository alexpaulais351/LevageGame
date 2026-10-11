/**
 * Charge totale (CLAUDE.md règle 4) :
 * Q_tot = Q_charge + Σ Q_accessoires + Q_moufle/crochet (+ Q_fléchette repliée) (+ Q_autres)
 */
import type { Calc, CalcInput } from "./types";
import { G, isFiniteNumber } from "./util";

export interface TotalLoadInput {
  chargeKg: number;
  accessoiresKg: number[];
  moufleCrochetKg: number;
  /** Fléchette repliée (si l'abaque l'impose). */
  flechetteReplieeKg?: number;
  autresKg?: number;
}

/** Convertit une masse (kg) en effort (kN) : F = m × g / 1000. */
export function kgToKN(kg: number): number {
  return (kg * G) / 1000;
}

/** Convertit un effort (kN) en masse équivalente (kg) : m = F × 1000 / g. */
export function kNToKg(kN: number): number {
  return (kN * 1000) / G;
}

export function totalLoad(input: TotalLoadInput): Calc<number | null> {
  const inputs: Record<string, CalcInput> = {};
  const warnings: string[] = [];
  let total = 0;
  let invalide = false;

  const add = (key: string, label: string, v: unknown, required: boolean) => {
    if (v === undefined || v === null) {
      if (required) {
        warnings.push(`Donnée manquante : ${label}.`);
        invalide = true;
      }
      return;
    }
    if (!isFiniteNumber(v) || v < 0) {
      warnings.push(`Valeur invalide pour ${label} (${String(v)}) : nombre positif ou nul attendu.`);
      invalide = true;
      inputs[key] = { value: String(v), unit: "kg", label };
      return;
    }
    inputs[key] = { value: v, unit: "kg", label };
    total += v;
  };

  add("charge", "Masse de la charge", input.chargeKg, true);
  if (!Array.isArray(input.accessoiresKg)) {
    warnings.push("Donnée manquante : liste des accessoires (vide si aucun).");
    invalide = true;
  } else {
    input.accessoiresKg.forEach((a, i) => add(`accessoire_${i + 1}`, `Accessoire ${i + 1}`, a, true));
  }
  add("moufle_crochet", "Moufle / crochet", input.moufleCrochetKg, true);
  add("flechette_repliee", "Fléchette repliée", input.flechetteReplieeKg, false);
  add("autres", "Autres masses", input.autresKg, false);

  const formula =
    "Charge totale = masse de la charge + Σ accessoires + moufle/crochet" +
    (input.flechetteReplieeKg !== undefined ? " + fléchette repliée" : "") +
    (input.autresKg !== undefined ? " + autres masses" : "");

  return { value: invalide ? null : total, formula, inputs, source: "Saisie utilisateur", warnings };
}
