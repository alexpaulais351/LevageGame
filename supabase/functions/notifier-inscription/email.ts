// Contenu de l'e-mail « nouvelle demande de compte » (pur : aucune API Deno, testé par Vitest).

export interface Demande {
  id: string;
  nom: string | null;
  entreprise: string | null;
  email: string | null;
  creeLe: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extrait la demande du corps du webhook (INSERT sur public.profiles) ; `null` si non pertinent. */
export function lireDemande(corps: unknown): Demande | null {
  if (!corps || typeof corps !== "object") return null;
  const c = corps as { type?: unknown; table?: unknown; record?: Record<string, unknown> };
  if (c.type !== "INSERT" || c.table !== "profiles" || !c.record) return null;
  const r = c.record;
  if (typeof r.id !== "string" || !UUID.test(r.id)) return null;
  if (r.statut !== undefined && r.statut !== "en_attente") return null;
  const texte = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null);
  return { id: r.id, nom: texte(r.full_name), entreprise: texte(r.entreprise_declaree), email: texte(r.email), creeLe: texte(r.created_at) };
}

export function echapperHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Lien de validation : page d'administration (aucune action sur simple ouverture). */
export function lienValidation(appUrl: string, id: string): string {
  return `${appUrl.replace(/\/+$/, "")}/admin/comptes/${encodeURIComponent(id)}`;
}

export function construireEmail(d: Demande, appUrl: string): { sujet: string; html: string; texte: string } {
  const nom = d.nom ?? "(nom non renseigné)";
  const entreprise = d.entreprise ?? "(entreprise non renseignée)";
  const email = d.email ?? "(e-mail inconnu)";
  const lien = lienValidation(appUrl, d.id);
  const sujet = `Nouvelle demande de compte : ${nom}`.slice(0, 150);
  const texte = [
    "Une nouvelle demande de compte attend votre validation sur l'outil Adéquation de levage.",
    "",
    `Nom : ${nom}`,
    `Entreprise : ${entreprise}`,
    `E-mail : ${email}`,
    "",
    `Valider la demande : ${lien}`,
    "",
    "Aucune décision n'est prise à l'ouverture du lien : connectez-vous, puis cliquez sur Accepter ou Refuser.",
  ].join("\n");
  const h = echapperHtml;
  const html = `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;color:#003370;margin:0;padding:0">
<div style="background:#004489;color:#ffffff;padding:16px 24px;font-weight:bold">ADÉQUATION LEVAGE</div>
<div style="padding:24px">
<p>Une nouvelle demande de compte attend votre validation.</p>
<table style="border-collapse:collapse;margin:16px 0">
<tr><td style="padding:4px 12px 4px 0;font-weight:bold">Nom</td><td>${h(nom)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-weight:bold">Entreprise</td><td>${h(entreprise)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;font-weight:bold">E-mail</td><td>${h(email)}</td></tr>
</table>
<p><a href="${h(lien)}" style="display:inline-block;background:#004489;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Valider la demande</a></p>
<p style="font-size:12px;color:#B5ABA1">Aucune décision n'est prise à l'ouverture du lien : connectez-vous, puis cliquez sur Accepter ou Refuser.</p>
</div>
<div style="background:#003370;color:#ffffff;padding:8px 24px;font-size:11px">Outil d'aide à la rédaction des adéquations de levage.</div>
</body></html>`;
  return { sujet, html, texte };
}

/** Comparaison à temps constant (secret partagé du webhook). */
export function secretsEgaux(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}
