/** Résultat uniforme des Server Actions (jamais d'exception vers le client pour une erreur métier). */
export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export function ok(): { ok: true };
export function ok<T>(data: T): { ok: true; data: T };
export function ok<T>(data?: T) {
  return data === undefined ? { ok: true as const } : { ok: true as const, data };
}

export function echec(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** État d'un formulaire piloté par `useActionState`. */
export interface EtatForm {
  error?: string;
  message?: string;
}

/** Chemin interne sûr pour une redirection (`next`) : relatif, sans `//` ni schéma. */
export function cheminInterne(valeur: unknown, defaut = "/projets"): string {
  if (typeof valeur !== "string") return defaut;
  if (!valeur.startsWith("/") || valeur.startsWith("//") || valeur.includes("\\")) return defaut;
  return valeur;
}
