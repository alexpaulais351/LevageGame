/**
 * Appuis et sol.
 *   Pression sous appui p = F / S   (kN / m² = kPa)
 *   F : effort maximal sous appui (kN) — donnée constructeur ou saisie
 *   S : surface de répartition (m²) — plaque L × l ou surface de patin
 *   Chenilles (approche simple) : p_moy = F / (2 × L_appui × b_tuile)
 * Comparaison à la portance admissible SAISIE (aucune valeur par défaut) :
 *   taux sol = p / q_adm ; marge = q_adm − p ; p > q_adm ⇒ bloquant.
 */
import type { CalcInput, Check, Issue } from "./types";
import { gt, isFiniteNumber } from "./util";

export type SurfaceAppui =
  | { type: "plaque"; longueurM: number; largeurM: number }
  | { type: "patin"; surfaceM2: number };

export interface GroundResult {
  surfaceM2: number | null;
  pressionKPa: number | null;
  portanceKPa: number | null;
  /** q_adm − p (kPa) */
  margeKPa: number | null;
  /** p / q_adm */
  taux: number | null;
}

export interface OutriggerInput {
  effortMaxKN: number;
  surface: SurfaceAppui;
  portanceAdmissibleKPa: number;
}

export interface CrawlerInput {
  /** Effort total transmis par les deux chenilles (kN). */
  effortKN: number;
  longueurAppuiM: number;
  largeurTuileM: number;
  portanceAdmissibleKPa: number;
}

function compare(
  F: number,
  S: number | null,
  q: number,
  inputs: Record<string, CalcInput>,
  issues: Issue[],
  formula: string,
  libelle: string,
): Check<GroundResult> {
  const manque = (m: string) => issues.push({ code: "DONNEE_MANQUANTE", severity: "bloquant", message: `Donnée manquante : ${m}.` });
  const fOk = isFiniteNumber(F) && F >= 0;
  const qOk = isFiniteNumber(q) && q > 0;
  if (!fOk) manque(`effort sous ${libelle} (kN)`);
  if (S === null) manque(`surface d'appui (${libelle})`);
  if (!qOk) manque("portance admissible du sol (kPa)");
  inputs.F = { value: fOk ? F : String(F), unit: "kN", label: `Effort maximal sous ${libelle}` };
  inputs.q_adm = { value: qOk ? q : String(q), unit: "kPa", label: "Portance admissible du sol (saisie)" };

  const p = fOk && S !== null ? F / S : null;
  const value: GroundResult = {
    surfaceM2: S,
    pressionKPa: p,
    portanceKPa: qOk ? q : null,
    margeKPa: p !== null && qOk ? q - p : null,
    taux: p !== null && qOk ? p / q : null,
  };
  if (p !== null && qOk && gt(p, q)) {
    issues.push({
      code: "SOL_INSUFFISANT",
      severity: "bloquant",
      message: `Pression sous ${libelle} ${p} kPa > portance admissible ${q} kPa.`,
    });
  }
  return { value, formula, inputs, source: "Effort : donnée constructeur ou saisie ; portance : saisie utilisateur", warnings: [], issues };
}

/** Pression sous un appui (stabilisateur) avec plaque de répartition ou patin. */
export function checkOutriggerPressure(input: OutriggerInput): Check<GroundResult> {
  const issues: Issue[] = [];
  const inputs: Record<string, CalcInput> = {};
  let S: number | null = null;
  const s = input.surface;
  if (s && s.type === "plaque") {
    const ok = isFiniteNumber(s.longueurM) && s.longueurM > 0 && isFiniteNumber(s.largeurM) && s.largeurM > 0;
    inputs.L = { value: ok ? s.longueurM : String(s.longueurM), unit: "m", label: "Longueur de plaque" };
    inputs.l = { value: ok ? s.largeurM : String(s.largeurM), unit: "m", label: "Largeur de plaque" };
    if (ok) S = s.longueurM * s.largeurM;
  } else if (s && s.type === "patin") {
    const ok = isFiniteNumber(s.surfaceM2) && s.surfaceM2 > 0;
    inputs.S_patin = { value: ok ? s.surfaceM2 : String(s.surfaceM2), unit: "m²", label: "Surface du patin" };
    if (ok) S = s.surfaceM2;
  }
  if (S !== null) inputs.S = { value: S, unit: "m²", label: "Surface de répartition" };
  const formula =
    s?.type === "plaque" ? "p = F / (L × l) ; taux = p / q_adm ; marge = q_adm − p" : "p = F / S_patin ; taux = p / q_adm ; marge = q_adm − p";
  return compare(input.effortMaxKN, S, input.portanceAdmissibleKPa, inputs, issues, formula, "appui");
}

/** Pression moyenne sous chenilles (approche simple, répartition uniforme). */
export function checkCrawlerPressure(input: CrawlerInput): Check<GroundResult> {
  const issues: Issue[] = [];
  const inputs: Record<string, CalcInput> = {};
  const ok =
    isFiniteNumber(input.longueurAppuiM) && input.longueurAppuiM > 0 && isFiniteNumber(input.largeurTuileM) && input.largeurTuileM > 0;
  inputs.L = { value: ok ? input.longueurAppuiM : String(input.longueurAppuiM), unit: "m", label: "Longueur d'appui de chenille" };
  inputs.b = { value: ok ? input.largeurTuileM : String(input.largeurTuileM), unit: "m", label: "Largeur de tuile" };
  const S = ok ? 2 * input.longueurAppuiM * input.largeurTuileM : null;
  if (S !== null) inputs.S = { value: S, unit: "m²", label: "Surface d'appui des 2 chenilles" };
  const res = compare(
    input.effortKN,
    S,
    input.portanceAdmissibleKPa,
    inputs,
    issues,
    "p_moy = F / (2 × L × b) ; taux = p / q_adm ; marge = q_adm − p",
    "chenilles",
  );
  res.warnings.push("Pression moyenne uniforme : ne tient pas compte de l'excentrement de charge (pression de pointe supérieure).");
  return res;
}
