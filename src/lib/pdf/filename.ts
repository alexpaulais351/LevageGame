/** Nom de fichier de la fiche : adequation_<reference|projet>_<AAAA-MM-JJ>.pdf (ASCII, sans espaces). */

/** Retire accents, espaces et caractères spéciaux ; les séparateurs deviennent des tirets. */
export function slugFichier(texte: string, max = 40): string {
  const s = texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[œŒ]/g, "oe")
    .replace(/[æÆ]/g, "ae")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.slice(0, max).replace(/-+$/, "");
}

/** Date locale AAAA-MM-JJ. */
export function dateIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function nomFichierPdf(args: { reference?: string | null; projet?: string | null; date: Date }): string {
  const base = slugFichier(args.reference ?? "") || slugFichier(args.projet ?? "") || "etude";
  return `adequation_${base}_${dateIso(args.date)}.pdf`;
}
