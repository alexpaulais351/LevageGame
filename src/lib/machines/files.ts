/** Contrôle des fichiers joints aux machines personnelles (pur : testable sans stockage). */

export const PHOTO_TAILLE_MAX = 2 * 1024 * 1024; // 2 Mo
export const PDF_TAILLE_MAX = 15 * 1024 * 1024; // 15 Mo

export const PHOTO_TYPES = { "image/png": "png", "image/jpeg": "jpg" } as const;

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

const commence = (b: Uint8Array, sig: number[]) => sig.every((v, i) => b[i] === v);

export interface FichierEntree {
  type: string;
  size: number;
  /** Premiers octets du fichier (signature « magic bytes »). */
  entete: Uint8Array;
}

export type ResultatFichier = { ok: true; ext: "png" | "jpg" | "pdf"; mime: string } | { ok: false; error: string };

/** Photo : PNG/JPEG, ≤ 2 Mo, signature cohérente avec le type déclaré. */
export function validerPhoto(f: FichierEntree): ResultatFichier {
  const ext = PHOTO_TYPES[f.type as keyof typeof PHOTO_TYPES];
  if (!ext) return { ok: false, error: "Photo : format PNG ou JPEG uniquement." };
  if (f.size <= 0) return { ok: false, error: "Photo : fichier vide." };
  if (f.size > PHOTO_TAILLE_MAX) return { ok: false, error: "Photo : 2 Mo maximum." };
  const sig = ext === "png" ? PNG : JPEG;
  if (!commence(f.entete, sig)) return { ok: false, error: "Photo : le contenu ne correspond pas au format annoncé." };
  return { ok: true, ext, mime: f.type };
}

/** PDF constructeur : application/pdf, ≤ 15 Mo, signature %PDF-. */
export function validerPdf(f: FichierEntree): ResultatFichier {
  if (f.type !== "application/pdf") return { ok: false, error: "Document constructeur : PDF uniquement." };
  if (f.size <= 0) return { ok: false, error: "Document constructeur : fichier vide." };
  if (f.size > PDF_TAILLE_MAX) return { ok: false, error: "Document constructeur : 15 Mo maximum." };
  if (!commence(f.entete, PDF)) return { ok: false, error: "Document constructeur : ce fichier n'est pas un PDF valide." };
  return { ok: true, ext: "pdf", mime: "application/pdf" };
}

export const cheminPhoto = (uid: string, machineId: string, ext: string) => `${uid}/machines/${machineId}/photo.${ext}`;
export const cheminSourcePdf = (uid: string, machineId: string) => `${uid}/machines/${machineId}/source.pdf`;
