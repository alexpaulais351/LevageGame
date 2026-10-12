/**
 * Liens (URL signées, 1 h) vers le PDF source d'un abaque.
 *  - catalogue public : bucket privé `chart-sources` (lecture réservée aux comptes approuvés, D25) ;
 *  - machine personnelle : bucket `user-files` (chemin `<uid>/…`, propriétaire uniquement).
 * Un fichier absent du bucket ne produit aucun lien (jamais d'erreur bloquante).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET_CATALOGUE = "chart-sources";
export const BUCKET_PERSO = "user-files";
const DUREE_S = 3600;

export interface LiensPdf {
  /** Ouverture dans le navigateur. */
  voir: string;
  /** Téléchargement (Content-Disposition: attachment). */
  telecharger: string;
}

export function bucketPdf(perso: boolean): string {
  return perso ? BUCKET_PERSO : BUCKET_CATALOGUE;
}

/** Nom de fichier proposé au téléchargement : « Abaque <constructeur> <modèle>.pdf ». */
export function nomFichierPdf(constructeur: string, modele: string): string {
  const base = `Abaque ${constructeur} ${modele}`.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  return `${base}.pdf`;
}

/** Liens pour une liste de chemins d'un même bucket (chemins en double tolérés). */
export async function liensPdf(
  supabase: SupabaseClient,
  perso: boolean,
  fichiers: { chemin: string; nom: string }[],
): Promise<Map<string, LiensPdf>> {
  const out = new Map<string, LiensPdf>();
  const uniques = [...new Map(fichiers.map((f) => [f.chemin, f])).values()];
  if (uniques.length === 0) return out;
  const stockage = supabase.storage.from(bucketPdf(perso));
  const { data: voir } = await stockage.createSignedUrls(
    uniques.map((f) => f.chemin),
    DUREE_S,
  );
  const urlsVoir = new Map((voir ?? []).filter((s) => s.path && s.signedUrl && !s.error).map((s) => [s.path as string, s.signedUrl]));
  await Promise.all(
    uniques
      .filter((f) => urlsVoir.has(f.chemin))
      .map(async (f) => {
        const { data } = await stockage.createSignedUrl(f.chemin, DUREE_S, { download: f.nom });
        out.set(f.chemin, { voir: urlsVoir.get(f.chemin)!, telecharger: data?.signedUrl ?? urlsVoir.get(f.chemin)! });
      }),
  );
  return out;
}
