// Edge Function `notifier-inscription` : e-mail à l'administrateur à chaque nouvelle demande de compte.
// Appelée uniquement par le trigger `profiles_notifier_inscription` (pg_net), avec l'en-tête
// `x-webhook-secret` = secret Vault `notifier_inscription_secret` = variable WEBHOOK_SECRET.
// Variables : RESEND_API_KEY, ADMIN_EMAIL, APP_URL, EMAIL_FROM, WEBHOOK_SECRET.
// Sans RESEND_API_KEY : journalise et répond 200 sans rien envoyer.
// Déploiement : `supabase functions deploy notifier-inscription --no-verify-jwt` (voir docs/DEPLOIEMENT-EMAILS.md).
import { construireEmail, lireDemande, secretsEgaux } from "./email.ts";

const json = (status: number, corps: Record<string, unknown>) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { erreur: "méthode non autorisée" });

  const attendu = Deno.env.get("WEBHOOK_SECRET") ?? "";
  const recu = req.headers.get("x-webhook-secret") ?? "";
  if (!attendu || !secretsEgaux(recu, attendu)) return json(401, { erreur: "non autorisé" });

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return json(400, { erreur: "corps invalide" });
  }
  const demande = lireDemande(corps);
  if (!demande) return json(200, { ignore: true });

  const cle = Deno.env.get("RESEND_API_KEY");
  const admin = Deno.env.get("ADMIN_EMAIL");
  const appUrl = Deno.env.get("APP_URL");
  const from = Deno.env.get("EMAIL_FROM");
  if (!cle) {
    console.log(`notifier-inscription : RESEND_API_KEY absente, aucun e-mail envoyé (demande ${demande.id}).`);
    return json(200, { envoye: false, raison: "RESEND_API_KEY absente" });
  }
  if (!admin || !appUrl || !from) {
    console.error("notifier-inscription : ADMIN_EMAIL, APP_URL ou EMAIL_FROM manquant.");
    return json(500, { erreur: "configuration incomplète" });
  }

  const { sujet, html, texte } = construireEmail(demande, appUrl);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [admin], subject: sujet, html, text: texte }),
  });
  if (!r.ok) {
    console.error(`notifier-inscription : échec Resend ${r.status} ${await r.text()}`);
    return json(502, { erreur: "envoi impossible" });
  }
  return json(200, { envoye: true });
});
