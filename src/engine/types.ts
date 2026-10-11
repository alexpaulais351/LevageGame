/**
 * Types du moteur de calcul d'adéquation de levage.
 * Module PUR : aucune dépendance UI / BDD / réseau.
 *
 * Unités internes : kg (masses), m (longueurs), kN (efforts), kPa (pressions),
 * degrés (angles), m/s (vitesses de vent). g = 9,81 m/s².
 * Aucun arrondi n'est fait dans le moteur : l'arrondi est réservé à l'affichage.
 */

/** Une entrée détaillée d'un calcul, pour l'affichage « formule, valeurs, source ». */
export interface CalcInput {
  value: number | string;
  unit: string;
  label: string;
}

/**
 * Résultat détaillé de toute fonction publique du moteur.
 * - `formula` : formule lisible en français (symbolique, sans arrondi).
 * - `inputs` : valeurs utilisées, avec unité et libellé.
 * - `source` : origine des données (abaque constructeur, saisie…).
 * - `warnings` : messages à afficher (hors abaque, donnée invalide…).
 */
export interface Calc<T> {
  value: T;
  formula: string;
  inputs: Record<string, CalcInput>;
  source?: string;
  warnings: string[];
}

export type Severity = "bloquant" | "reserve";

export type IssueCode =
  | "HORS_ABAQUE"
  | "ABAQUE_INVALIDE"
  | "ABAQUE_A_VERIFIER"
  | "TAUX_DEPASSE"
  | "ZONE_ORANGE"
  | "SEUILS_INVALIDES"
  | "DONNEE_MANQUANTE"
  | "ANGLE_ELINGAGE"
  | "CMU_INSUFFISANTE"
  | "SOL_INSUFFISANT"
  | "VENT_DEPASSE"
  | "DISTANCE_ELECTRIQUE";

/** Point bloquant ou réserve remonté par un contrôle, agrégé par le verdict. */
export interface Issue {
  code: IssueCode;
  severity: Severity;
  message: string;
}

/** Résultat d'un contrôle : un calcul détaillé + les points bloquants / réserves qu'il génère. */
export interface Check<T> extends Calc<T> {
  issues: Issue[];
}

// ---------------------------------------------------------------------------
// Abaques
// ---------------------------------------------------------------------------

export type ChartAxisY = "boom_length_m" | "height_m" | "none";

/**
 * Un nœud de la grille. `capacityKg: null` = cellule vide (le constructeur ne donne
 * pas de valeur) ⇒ toute lecture qui en dépend est « hors abaque ».
 * Pour `axisY: 'none'`, `y` est ignoré (une seule ligne).
 */
export interface ChartPoint {
  x: number;
  y: number | null;
  capacityKg: number | null;
}

export interface ChartSource {
  title: string;
  reference: string;
  edition: string;
  url: string;
}

export interface LoadChart {
  id: string;
  axisX: "radius_m";
  axisY: ChartAxisY;
  points: ChartPoint[];
  /** Interpolation linéaire sur la portée autorisée explicitement par la doc constructeur. */
  interpolationAllowed: boolean;
  status: "a_verifier" | "verifie";
  /** Norme de calcul de l'abaque (ex. EN 13000). */
  standard: string;
  source: ChartSource;
  /** Les capacités sont-elles déjà nettes des déductions (moufle, crochet…) ? */
  deductionsIncluded: boolean;
}

export interface ChartValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
