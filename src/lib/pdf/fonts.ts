/**
 * Polices de la fiche.
 *
 * Constat (génération réelle + rendu pdftoppm) : @react-pdf/renderer v4 ACCEPTE les fichiers .woff2 de
 * VINCI Sans (Font.register sans erreur, texte extractible) mais ne dessine AUCUN glyphe (fontkit ne sait
 * pas reconstruire les contours des woff2 « glyf transformé »). On utilise donc Helvetica (intégrée au
 * PDF, aucune ressource à charger) tant que des fichiers .ttf / .otf de VINCI Sans ne sont pas fournis
 * dans /public/fonts : renseigner alors `POLICES_TTF` (même mécanique, sans autre changement).
 */
import { Font } from "@react-pdf/renderer";

export const FAMILLE_VINCI = "VINCI Sans";
export const FAMILLE_REPLI = "Helvetica";

/** Fichiers TTF/OTF de VINCI Sans (relatifs à la base des polices) ; vide = Helvetica. */
export const POLICES_TTF: { fichier: string; fontWeight: 400 | 700; fontStyle: "normal" | "italic" }[] = [];

let enregistre = false;

/** Retourne la famille à utiliser. `base` : "/fonts" dans le navigateur, chemin disque dans Node. */
export function enregistrerPolices(base = "/fonts"): string {
  if (POLICES_TTF.length === 0) return FAMILLE_REPLI;
  if (!enregistre) {
    const b = base.replace(/\/$/, "");
    Font.register({
      family: FAMILLE_VINCI,
      fonts: POLICES_TTF.map((f) => ({ src: `${b}/${f.fichier}`, fontWeight: f.fontWeight, fontStyle: f.fontStyle })),
    });
    enregistre = true;
  }
  return FAMILLE_VINCI;
}

// Pas de césure automatique : les mots trop longs (URL, références) sont découpés par blocs.
Font.registerHyphenationCallback((mot) => (mot.length <= 22 ? [mot] : (mot.match(/.{1,16}/g) ?? [mot])));
