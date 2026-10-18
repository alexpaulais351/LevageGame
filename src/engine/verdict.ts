/**
 * Verdict d'adéquation.
 *
 * Par position (prise, rotation, pose…) : capacité lue à l'abaque, taux = charge totale / capacité.
 * Position la plus défavorable = taux maximal (capacité nulle/hors abaque = la pire).
 *
 * Convention de bornes (tolérance EPS = 1e-9) :
 *   vert   : taux < greenMax
 *   orange : greenMax ≤ taux ≤ orangeMax   (taux = 90 % ⇒ orange ; taux = 100 % ⇒ orange)
 *   rouge  : taux > orangeMax
 * Indépendamment des seuils, taux > 100 % ⇒ bloquant. Contrainte : 0 < greenMax ≤ orangeMax ≤ 1.
 *
 * Verdict global : au moins un bloquant ⇒ NON_ADEQUAT ; sinon au moins une réserve
 * ⇒ ADEQUAT_AVEC_RESERVES ; sinon ADEQUAT.
 */
import { chartSourceLabel, readCapacity, validateChart } from "./chart";
import type { Calc, CalcInput, Issue, LoadChart } from "./types";
import { gt, isFiniteNumber, lt, pourcentFR } from "./util";

export interface Thresholds {
  greenMax: number;
  orangeMax: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { greenMax: 0.9, orangeMax: 1.0 };

export type Zone = "vert" | "orange" | "rouge";
export type VerdictGlobal = "ADEQUAT" | "ADEQUAT_AVEC_RESERVES" | "NON_ADEQUAT";

export interface LiftPosition {
  id: string;
  /** ex. « Prise », « Rotation », « Pose » */
  label: string;
  rayonM: number;
  /** Longueur de flèche ou hauteur selon l'axe Y de l'abaque. */
  y?: number | null;
}

export interface PositionResult {
  id: string;
  label: string;
  capacite: Calc<number | null>;
  taux: number | null;
  zone: Zone | null;
}

export interface VerdictInput {
  chart: LoadChart | null;
  positions: LiftPosition[];
  /** Charge totale (kg), typiquement `totalLoad(...).value`. */
  chargeTotaleKg: number | null;
  thresholds?: Thresholds;
  /** Résultats des autres contrôles (élingage, sol, vent, lignes…). */
  controles?: { issues: Issue[] }[];
  /** Champs obligatoires du dossier : valeur absente ⇒ bloquant « donnée manquante ». */
  champsObligatoires?: { label: string; value: unknown }[];
}

export interface VerdictResult {
  verdict: VerdictGlobal;
  positions: PositionResult[];
  positionDefavorable: PositionResult | null;
  tauxMax: number | null;
  zone: Zone | null;
  bloquants: Issue[];
  reserves: Issue[];
}

export function validateThresholds(t: Thresholds): string[] {
  const errors: string[] = [];
  if (!t || !isFiniteNumber(t.greenMax) || !isFiniteNumber(t.orangeMax)) {
    return ["Seuils non numériques."];
  }
  if (t.greenMax <= 0) errors.push("Le seuil vert doit être > 0.");
  if (gt(t.greenMax, t.orangeMax)) errors.push("Le seuil vert doit être ≤ au seuil orange.");
  if (gt(t.orangeMax, 1)) errors.push("Le seuil orange ne peut pas dépasser 100 %.");
  return errors;
}

export function zoneOf(taux: number, t: Thresholds = DEFAULT_THRESHOLDS): Zone {
  if (lt(taux, t.greenMax)) return "vert";
  if (gt(taux, t.orangeMax)) return "rouge";
  return "orange";
}

function isMissing(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (typeof v === "number") return !Number.isFinite(v);
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function computeVerdict(input: VerdictInput): Calc<VerdictResult> {
  const issues: Issue[] = [];
  const warnings: string[] = [];
  const bloque = (code: Issue["code"], message: string) => issues.push({ code, severity: "bloquant", message });
  const reserve = (code: Issue["code"], message: string) => issues.push({ code, severity: "reserve", message });

  const t = input.thresholds ?? DEFAULT_THRESHOLDS;
  const tErr = validateThresholds(t);
  tErr.forEach((e) => bloque("SEUILS_INVALIDES", `Seuils invalides : ${e}`));
  const tUse = tErr.length === 0 ? t : DEFAULT_THRESHOLDS;

  for (const c of input.champsObligatoires ?? []) {
    if (isMissing(c.value)) bloque("DONNEE_MANQUANTE", `Donnée manquante : ${c.label}.`);
  }

  const Q = input.chargeTotaleKg;
  const qOk = isFiniteNumber(Q) && Q >= 0;
  if (!qOk) bloque("DONNEE_MANQUANTE", "Donnée manquante : charge totale.");

  const chart = input.chart;
  if (!chart) {
    bloque("DONNEE_MANQUANTE", "Donnée manquante : abaque de la machine.");
  } else {
    const v = validateChart(chart);
    v.errors.forEach((e) => bloque("ABAQUE_INVALIDE", `Abaque incohérent : ${e}`));
    warnings.push(...v.warnings);
  }

  const positions: PositionResult[] = [];
  if (!Array.isArray(input.positions) || input.positions.length === 0) {
    bloque("DONNEE_MANQUANTE", "Donnée manquante : au moins une position de levage (portée).");
  } else if (chart) {
    for (const p of input.positions) {
      const cap = readCapacity(chart, p.rayonM, p.y);
      let taux: number | null = null;
      let zone: Zone | null = null;
      if (cap.value === null) {
        bloque("HORS_ABAQUE", `Position « ${p.label} » : capacité hors abaque (${cap.warnings.filter((w) => w.startsWith("hors")).join(" ; ")}).`);
      } else if (qOk) {
        if (cap.value <= 0) {
          bloque("TAUX_DEPASSE", `Position « ${p.label} » : capacité nulle.`);
          taux = Number.POSITIVE_INFINITY;
          zone = "rouge";
        } else {
          taux = Q / cap.value;
          zone = zoneOf(taux, tUse);
          if (gt(taux, 1)) {
            bloque("TAUX_DEPASSE", `Position « ${p.label} » : taux d'utilisation ${pourcentFR(taux)} > 100 %.`);
          } else if (zone === "orange") {
            reserve("ZONE_ORANGE", `Position « ${p.label} » : taux d'utilisation ${pourcentFR(taux)} en zone orange.`);
          }
        }
      }
      positions.push({ id: p.id, label: p.label, capacite: cap, taux, zone });
    }
  }

  for (const c of input.controles ?? []) issues.push(...c.issues);

  // Position la plus défavorable : hors abaque d'abord, sinon taux maximal.
  let worst: PositionResult | null = null;
  for (const p of positions) {
    if (worst === null) worst = p;
    else if (worst.capacite.value === null) continue;
    else if (p.capacite.value === null) worst = p;
    else if ((p.taux ?? -1) > (worst.taux ?? -1)) worst = p;
  }

  const bloquants = issues.filter((i) => i.severity === "bloquant");
  const reserves = issues.filter((i) => i.severity === "reserve");
  const verdict: VerdictGlobal = bloquants.length > 0 ? "NON_ADEQUAT" : reserves.length > 0 ? "ADEQUAT_AVEC_RESERVES" : "ADEQUAT";

  const inputs: Record<string, CalcInput> = {
    Q: { value: qOk ? Q : "non renseignée", unit: "kg", label: "Charge totale" },
    seuil_vert: { value: tUse.greenMax, unit: "", label: "Seuil vert (taux <)" },
    seuil_orange: { value: tUse.orangeMax, unit: "", label: "Seuil orange (taux ≤)" },
  };
  for (const p of positions) {
    inputs[`capacite_${p.id}`] = { value: p.capacite.value ?? "hors abaque", unit: p.capacite.value === null ? "" : "kg", label: `Capacité — ${p.label}` };
  }

  return {
    value: {
      verdict,
      positions,
      positionDefavorable: worst,
      tauxMax: worst?.capacite.value === null ? null : (worst?.taux ?? null),
      zone: worst?.capacite.value === null ? "rouge" : (worst?.zone ?? null),
      bloquants,
      reserves,
    },
    formula:
      "Taux = charge totale / capacité lue, pour chaque position ; position la plus défavorable = taux maximal ; " +
      "vert si taux < seuil vert, orange si seuil vert ≤ taux ≤ seuil orange, rouge sinon ; taux > 100 % ou hors abaque ⇒ NON ADÉQUAT",
    inputs,
    source: chart ? chartSourceLabel(chart) : undefined,
    warnings,
  };
}
