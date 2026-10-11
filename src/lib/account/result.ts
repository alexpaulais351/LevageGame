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

/**
 * Chemin interne sûr pour une redirection (`suivant`) : relatif à l'application, jamais vers un autre
 * domaine (pas de `//`, de `\\`, de schéma, ni de caractère de contrôle ou d'espace que le navigateur
 * supprimerait pour reformer `//hôte`).
 */
export function cheminInterne(valeur: unknown, defaut = "/projets"): string {
  if (typeof valeur !== "string" || valeur.length > 2000) return defaut;
  if (!valeur.startsWith("/") || valeur.startsWith("//") || valeur.includes("\\")) return defaut;
  if (/[\u0000-\u0020\u007f]/.test(valeur)) return defaut;
  const base = "http://interne.invalid";
  try {
    const u = new URL(valeur, base);
    if (u.origin !== base) return defaut;
    return u.pathname + u.search + u.hash;
  } catch {
    return defaut;
  }
}
