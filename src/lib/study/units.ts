/** Conversions d'unités et lecture de nombres saisis (pures, testables). */
import { kgToKN, kmhToMs } from "@/engine";

export const KG_PAR_TONNE = 1000;
/** kN par tonne-force : 1 t × g (g = 9,81 du moteur). */
export const KN_PAR_TONNE = kgToKN(KG_PAR_TONNE);

/** Évite les artefacts flottants (12,299999…) après une conversion. */
export function arrondir(n: number, decimales = 6): number {
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
}

export const tToKg = (t: number): number => arrondir(t * KG_PAR_TONNE);
export const kgToT = (kg: number): number => arrondir(kg / KG_PAR_TONNE);
export const tToKN = (t: number): number => arrondir(t * KN_PAR_TONNE);
export const kNToT = (kn: number): number => arrondir(kn / KN_PAR_TONNE);

/** Vitesse de vent saisie → m/s (unité du moteur). */
export function ventEnMs(valeur: number, unite: "ms" | "kmh"): number {
  return unite === "kmh" ? kmhToMs(valeur) : valeur;
}

export function msToKmh(ms: number): number {
  return ms * 3.6;
}

/**
 * Lit un nombre saisi à la française ("12,5", "1 200", "1.5").
 * Retourne `null` si vide, `NaN` si invalide.
 */
export function parseNombreFR(texte: string): number | null {
  const t = texte.replace(/[\s  ]/g, "").replace(",", ".");
  if (t === "") return null;
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(t)) return Number.NaN;
  return Number(t);
}

/** Texte affiché dans un champ de saisie : "12,5" (sans séparateur de milliers). */
export function nombreVersTexte(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "";
  return String(arrondir(n, 9)).replace(".", ",");
}
