/**
 * Indices de révision d'une étude : A, B, C… Z, AA, AB… (numérotation bijective base 26).
 * L'indice est dérivé du numéro de version (`study_versions.index`, entier ≥ 1) : 1 → A, 2 → B…
 */

/** Numéro de version (≥ 1) → indice lettré. */
export function indiceDepuisNumero(n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new RangeError("Le numéro de version doit être un entier ≥ 1.");
  let reste = n;
  let out = "";
  while (reste > 0) {
    const r = (reste - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    reste = Math.floor((reste - 1) / 26);
  }
  return out;
}

/** Indice lettré → numéro de version ; `null` si le texte n'est pas un indice valide. */
export function numeroDepuisIndice(indice: string): number | null {
  if (!/^[A-Z]+$/.test(indice)) return null;
  let n = 0;
  for (const c of indice) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

/** Indice suivant (`null` = aucune version encore → A). */
export function indiceSuivant(indice: string | null): string {
  if (indice === null) return "A";
  const n = numeroDepuisIndice(indice);
  if (n === null) throw new RangeError(`Indice invalide : « ${indice} ».`);
  return indiceDepuisNumero(n + 1);
}
