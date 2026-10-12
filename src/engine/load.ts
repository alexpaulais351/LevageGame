/**
 * Charge totale (CLAUDE.md règle 4) :
 * Q_tot = Q_charge × k + Σ Q_accessoires + Q_moufle/crochet (+ Q_fléchette repliée) (+ Q_autres)
 * k : coefficient de marge sur la masse de la charge, défini par l'utilisateur (k ≥ 1 ; 1 = sans marge).
 */
import type { Calc, CalcInput } from "./types";
import { G, isFiniteNumber } from "./util";

export interface TotalLoadInput {
  chargeKg: number;
  /** Coefficient de marge appliqué à la masse de la charge (≥ 1). Absent ⇒ 1 (sans marge). */
  coefMarge?: number;
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

  const coef = input.coefMarge ?? 1;
  const coefOk = isFiniteNumber(coef) && coef >= 1;
  if (!coefOk) {
    warnings.push(`Valeur invalide pour le coefficient de marge (${String(coef)}) : nombre ≥ 1 attendu.`);
    invalide = true;
  }
  inputs.coef_marge = { value: coefOk ? coef : String(coef), unit: "", label: "Coefficient de marge sur la charge" };
  const charge = input.chargeKg;
  if (isFiniteNumber(charge) && charge >= 0 && coefOk) {
    inputs.charge_brute = { value: charge, unit: "kg", label: "Masse de la charge (saisie)" };
    add("charge", "Masse de la charge majorée", charge * coef, true);
  } else {
    add("charge", "Masse de la charge", charge, true);
  }
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
    "Charge totale = masse de la charge × coef. de marge + Σ accessoires + moufle/crochet" +
    (input.flechetteReplieeKg !== undefined ? " + fléchette repliée" : "") +
    (input.autresKg !== undefined ? " + autres masses" : "");

  return { value: invalide ? null : total, formula, inputs, source: "Saisie utilisateur", warnings };
}
