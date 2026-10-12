/**
 * Élingage — effort par brin et vérification des CMU.
 *
 * Formule (statique, brins symétriques) :
 *   T = W / (n_p × cos β)
 *   W   : masse totale suspendue sous le crochet (kg) — charge + accessoires sous crochet
 *   n_p : nombre de brins porteurs
 *   β   : angle de chaque brin par rapport à la verticale (°)
 *   T   : effort par brin exprimé en kg (masse équivalente ; × g / 1000 pour des kN)
 *
 * Brins porteurs (règle de l'art, EN 13414 / brochure INRS ED 6178) : pour 3 ou 4 brins,
 * on ne considère que 2 brins porteurs, sauf palonnier / dispositif d'équilibrage déclaré.
 *
 * Angle : β ≤ 45° conforme ; 45° < β ≤ 60° réserve ; β > 60° bloquant.
 *
 * CMU : chaque accessoire porte la CMU saisie par l'utilisateur, lue sur l'étiquette / la notice
 * POUR LE MODE D'ÉLINGAGE UTILISÉ (direct, étranglé, panier, multibrins…). Aucun facteur de mode
 * n'est appliqué par le moteur (D32).
 *  - sollicitation 'brin'     : comparée à l'effort par brin T (élingue simple, manille sur un brin…)
 *  - sollicitation 'ensemble' : comparée à la masse totale W (palonnier, crochet, manille de tête,
 *                               élingue multibrins dont la CMU marquée inclut déjà l'angle).
 */
import type { CalcInput, Check, Issue } from "./types";
import { degToRad, gt, isFiniteNumber, lt } from "./util";

export const ANGLE_RESERVE_DEG = 45;
export const ANGLE_MAX_DEG = 60;

export type AccessoireType = "elingue" | "manille" | "palonnier" | "crochet" | "autre";

export interface Accessoire {
  id: string;
  label: string;
  type: AccessoireType;
  /** CMU (kg) marquée pour le mode d'élingage utilisé. */
  cmuKg: number;
  sollicitation: "brin" | "ensemble";
}

export interface RiggingInput {
  /** Masse totale suspendue sous le crochet (kg). */
  masseSousCrochetKg: number;
  nbBrins: number;
  /** Angle de chaque brin par rapport à la verticale (°). */
  angleBetaDeg: number;
  /** Palonnier ou dispositif d'équilibrage garantissant la répartition sur tous les brins. */
  equilibrageDeclare?: boolean;
  accessoires: Accessoire[];
}

export interface AccessoireCheck {
  id: string;
  label: string;
  cmuUtileKg: number | null;
  effortKg: number | null;
  /** effort / CMU */
  taux: number | null;
  conforme: boolean;
}

export interface RiggingResult {
  nbBrinsPorteurs: number | null;
  effortParBrinKg: number | null;
  accessoires: AccessoireCheck[];
}

/** Nombre de brins porteurs retenu. */
export function brinsPorteurs(nbBrins: number, equilibrageDeclare = false): number {
  if (nbBrins >= 3 && !equilibrageDeclare) return 2;
  return nbBrins;
}

export function checkRigging(input: RiggingInput): Check<RiggingResult> {
  const issues: Issue[] = [];
  const warnings: string[] = [];
  const inputs: Record<string, CalcInput> = {};
  const manque = (m: string) => issues.push({ code: "DONNEE_MANQUANTE", severity: "bloquant", message: `Donnée manquante : ${m}.` });

  const W = input.masseSousCrochetKg;
  const n = input.nbBrins;
  const beta = input.angleBetaDeg;
  const eq = input.equilibrageDeclare === true;

  const wOk = isFiniteNumber(W) && W >= 0;
  const nOk = isFiniteNumber(n) && Number.isInteger(n) && n >= 1;
  const bOk = isFiniteNumber(beta) && beta >= 0 && beta < 90;
  if (!wOk) manque("masse suspendue sous crochet");
  if (!nOk) manque("nombre de brins (entier ≥ 1)");
  if (!bOk) manque("angle d'élingage β (0 ≤ β < 90°)");

  inputs.W = { value: wOk ? W : String(W), unit: "kg", label: "Masse suspendue sous crochet" };
  inputs.n = { value: nOk ? n : String(n), unit: "", label: "Nombre de brins" };
  inputs.beta = { value: bOk ? beta : String(beta), unit: "°", label: "Angle β / verticale" };
  inputs.equilibrage = { value: eq ? "oui" : "non", unit: "", label: "Palonnier / équilibrage déclaré" };

  let np: number | null = null;
  let T: number | null = null;
  if (nOk) {
    np = brinsPorteurs(n, eq);
    inputs.np = { value: np, unit: "", label: "Brins porteurs retenus" };
    if (n >= 3 && !eq) {
      warnings.push(`${n} brins sans équilibrage déclaré : seuls 2 brins sont considérés porteurs (règle de l'art).`);
    }
  }
  if (bOk) {
    if (gt(beta, ANGLE_MAX_DEG)) {
      issues.push({ code: "ANGLE_ELINGAGE", severity: "bloquant", message: `Angle d'élingage β = ${beta}° > ${ANGLE_MAX_DEG}° : interdit.` });
    } else if (gt(beta, ANGLE_RESERVE_DEG)) {
      issues.push({
        code: "ANGLE_ELINGAGE",
        severity: "reserve",
        message: `Angle d'élingage β = ${beta}° entre ${ANGLE_RESERVE_DEG}° et ${ANGLE_MAX_DEG}° : à limiter / justifier.`,
      });
    }
  }
  if (wOk && np !== null && bOk) T = W / (np * Math.cos(degToRad(beta)));

  const accessoires: AccessoireCheck[] = [];
  if (!Array.isArray(input.accessoires) || input.accessoires.length === 0) {
    manque("accessoires de levage et leur CMU");
  } else {
    for (const a of input.accessoires) {
      const cmuOk = isFiniteNumber(a.cmuKg) && a.cmuKg > 0;
      if (!cmuOk) manque(`CMU de « ${a.label} »`);
      const cmuUtile = cmuOk ? a.cmuKg : null;
      const effort = a.sollicitation === "brin" ? T : wOk ? W : null;
      const taux = cmuUtile !== null && effort !== null ? effort / cmuUtile : null;
      const conforme = cmuUtile !== null && effort !== null && !lt(cmuUtile, effort);
      if (cmuUtile !== null && effort !== null && !conforme) {
        issues.push({
          code: "CMU_INSUFFISANTE",
          severity: "bloquant",
          message: `CMU insuffisante pour « ${a.label} » : CMU ${cmuUtile} kg < effort ${effort} kg.`,
        });
      }
      inputs[`cmu_${a.id}`] = {
        value: cmuUtile ?? "invalide",
        unit: "kg",
        label: `CMU ${a.label} — sollicitation ${a.sollicitation}`,
      };
      accessoires.push({ id: a.id, label: a.label, cmuUtileKg: cmuUtile, effortKg: effort, taux, conforme });
    }
  }

  return {
    value: { nbBrinsPorteurs: np, effortParBrinKg: T, accessoires },
    formula:
      "Effort par brin T = W / (n_p × cos β) ; " +
      "contrôle : CMU ≥ T (sollicitation brin) ou ≥ W (sollicitation ensemble)",
    inputs,
    source: "Règle de l'art EN 13414 / INRS ED 6178 — CMU (mode d'élingage utilisé) saisies par l'utilisateur",
    warnings,
    issues,
  };
}
