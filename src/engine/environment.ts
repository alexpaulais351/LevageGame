/**
 * Environnement : vent et lignes électriques.
 *
 * Vent (m/s) : la vitesse prévue est comparée à la limite applicable
 *   limite = min(limite machine, limite réduite charge à forte prise au vent si applicable).
 *   Les limites sont des ENTRÉES (notice / abaque de la machine, calcul de prise au vent).
 *   vent > limite ⇒ bloquant ; vent = limite ⇒ accepté (borne incluse).
 *
 * Lignes électriques : la distance seuil est une ENTRÉE ; le moteur n'encode aucune valeur.
 *   Pour information, l'UI pourra proposer les distances de l'art. R.4534-108 du Code du
 *   travail (travaux au voisinage de lignes en conducteurs nus) : 3 m si U < 50 kV,
 *   5 m si U ≥ 50 kV. Valeurs confirmées par sources secondaires (2026-10-11) — à vérifier
 *   par une personne compétente sur Légifrance (version en vigueur) et la NF C 18-510
 *   avant usage ; s'y ajoutent les mouvements de la charge, du câble et le ballant.
 *   distance prévue < seuil ⇒ bloquant ; distance = seuil ⇒ acceptée.
 */
import type { CalcInput, Check, Issue } from "./types";
import { gt, isFiniteNumber, lt } from "./util";

/** km/h → m/s */
export function kmhToMs(kmh: number): number {
  return kmh / 3.6;
}

export interface WindInput {
  ventPrevuMs: number;
  limiteMachineMs: number;
  /** Charge à forte prise au vent (surface importante) : limite réduite exigée. */
  chargeFortePriseAuVent?: boolean;
  limiteChargeMs?: number;
}

export interface WindResult {
  limiteAppliqueeMs: number | null;
  /** limite − vent prévu (m/s) */
  margeMs: number | null;
}

export function checkWind(input: WindInput): Check<WindResult> {
  const issues: Issue[] = [];
  const inputs: Record<string, CalcInput> = {};
  const manque = (m: string) => issues.push({ code: "DONNEE_MANQUANTE", severity: "bloquant", message: `Donnée manquante : ${m}.` });
  const v = input.ventPrevuMs;
  const lm = input.limiteMachineMs;
  const vOk = isFiniteNumber(v) && v >= 0;
  const lmOk = isFiniteNumber(lm) && lm > 0;
  if (!vOk) manque("vitesse de vent prévue");
  if (!lmOk) manque("vitesse de vent limite de la machine");
  inputs.v = { value: vOk ? v : String(v), unit: "m/s", label: "Vent prévu" };
  inputs.v_machine = { value: lmOk ? lm : String(lm), unit: "m/s", label: "Limite machine" };

  let limite: number | null = lmOk ? lm : null;
  if (input.chargeFortePriseAuVent) {
    const lc = input.limiteChargeMs;
    const lcOk = isFiniteNumber(lc) && lc > 0;
    inputs.v_charge = { value: lcOk ? lc : String(lc), unit: "m/s", label: "Limite réduite (charge à forte prise au vent)" };
    if (!lcOk) {
      manque("vitesse limite réduite pour la charge à forte prise au vent");
      limite = null;
    } else if (limite !== null) {
      limite = Math.min(limite, lc);
    }
  }

  if (vOk && limite !== null && gt(v, limite)) {
    issues.push({ code: "VENT_DEPASSE", severity: "bloquant", message: `Vent prévu ${v} m/s > limite applicable ${limite} m/s.` });
  }
  return {
    value: { limiteAppliqueeMs: limite, margeMs: vOk && limite !== null ? limite - v : null },
    formula: input.chargeFortePriseAuVent
      ? "Contrôle : v_prévu ≤ min(v_limite machine ; v_limite charge)"
      : "Contrôle : v_prévu ≤ v_limite machine",
    inputs,
    source: "Limites : notice constructeur / saisie utilisateur ; vent prévu : saisie",
    warnings: [],
    issues,
  };
}

export interface PowerLineInput {
  /** Distance minimale prévue entre toute partie de l'engin/charge/élingues et la ligne (m). */
  distancePrevueM: number;
  /** Distance minimale d'approche à respecter (m) — entrée, aucune valeur par défaut. */
  distanceSeuilM: number;
  /** Tension de la ligne (kV), informative. */
  tensionKV?: number;
  label?: string;
}

export interface PowerLineResult {
  margeM: number | null;
}

export function checkPowerLine(input: PowerLineInput): Check<PowerLineResult> {
  const issues: Issue[] = [];
  const inputs: Record<string, CalcInput> = {};
  const nom = input.label ?? "ligne électrique";
  const d = input.distancePrevueM;
  const s = input.distanceSeuilM;
  const dOk = isFiniteNumber(d) && d >= 0;
  const sOk = isFiniteNumber(s) && s > 0;
  if (!dOk) issues.push({ code: "DONNEE_MANQUANTE", severity: "bloquant", message: `Donnée manquante : distance prévue à ${nom}.` });
  if (!sOk) issues.push({ code: "DONNEE_MANQUANTE", severity: "bloquant", message: `Donnée manquante : distance minimale d'approche (${nom}).` });
  inputs.d = { value: dOk ? d : String(d), unit: "m", label: "Distance minimale prévue" };
  inputs.d_min = { value: sOk ? s : String(s), unit: "m", label: "Distance minimale d'approche (saisie)" };
  if (isFiniteNumber(input.tensionKV)) inputs.U = { value: input.tensionKV, unit: "kV", label: "Tension" };
  if (dOk && sOk && lt(d, s)) {
    issues.push({ code: "DISTANCE_ELECTRIQUE", severity: "bloquant", message: `Distance à ${nom} ${d} m < distance minimale ${s} m.` });
  }
  return {
    value: { margeM: dOk && sOk ? d - s : null },
    formula: "Contrôle : distance prévue ≥ distance minimale d'approche",
    inputs,
    source: "Distance minimale : saisie utilisateur (réf. possible : C. trav. art. R.4534-108, à confirmer)",
    warnings: [],
    issues,
  };
}
