/** Références d'études : ADQ-001, ADQ-002… (unique par projet, index partiel en base). */

export const PREFIXE_REFERENCE = "ADQ";

/** Prochaine référence libre : plus grand suffixe numérique existant + 1 (jamais de réutilisation). */
export function prochaineReference(existantes: readonly (string | null)[], prefixe = PREFIXE_REFERENCE): string {
  const motif = new RegExp(`^${prefixe}-(\\d+)$`);
  let max = 0;
  for (const r of existantes) {
    const m = r ? motif.exec(r) : null;
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefixe}-${String(max + 1).padStart(3, "0")}`;
}
