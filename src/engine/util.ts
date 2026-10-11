/** Utilitaires internes du moteur (non exportés publiquement sauf constantes). */

/** Tolérance de comparaison des flottants. */
export const EPS = 1e-9;

/** Accélération de la pesanteur (m/s²). */
export const G = 9.81;

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** |a − b| ≤ EPS */
export function approxEq(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPS;
}

/** a > b au-delà de la tolérance. */
export function gt(a: number, b: number): boolean {
  return a - b > EPS;
}

/** a < b au-delà de la tolérance. */
export function lt(a: number, b: number): boolean {
  return b - a > EPS;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
