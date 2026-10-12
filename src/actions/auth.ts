"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { cheminInterne, type EtatForm } from "@/lib/account/result";
import { connexionSchema, inscriptionSchema, premiereErreur } from "@/lib/account/schemas";
import { supabaseConfigure } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const NON_CONFIGURE: EtatForm = { error: "Les comptes ne sont pas configurés sur cet environnement." };

/** URL publique du site (callback des e-mails). */
async function urlSite(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https")}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function lienCallback(site: string, suivant: string): string {
  return `${site}/auth/callback?suivant=${encodeURIComponent(suivant)}`;
}

/** Page d'attente affichée tant que l'administrateur n'a pas validé le compte. */
const PAGE_ATTENTE = "/compte-en-attente";

function messageAuth(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Un compte existe déjà avec cette adresse e-mail.";
  if (m.includes("email not confirmed")) return "Adresse e-mail non confirmée : consultez le lien reçu par e-mail.";
  // Limite d'envoi d'e-mails du service Supabase (et non une faute de l'utilisateur).
  if (m.includes("email rate limit")) return "Le service d'envoi d'e-mails est momentanément saturé : réessayez dans une heure ou prévenez l'administrateur.";
  if (m.includes("rate limit") || m.includes("too many")) return "Trop de tentatives : patientez quelques minutes.";
  if (m.includes("password")) return "Mot de passe refusé (8 caractères minimum).";
  return "L'opération a échoué. Réessayez.";
}

export async function connexion(_prev: EtatForm, formData: FormData): Promise<EtatForm> {
  if (!supabaseConfigure()) return NON_CONFIGURE;
  const p = connexionSchema.safeParse({ email: formData.get("email"), motDePasse: formData.get("motDePasse") });
  if (!p.success) return { error: premiereErreur(p.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: p.data.email, password: p.data.motDePasse });
  if (error) return { error: messageAuth(error.message) };
  revalidatePath("/", "layout");
  // Le middleware renvoie vers /compte-en-attente si le compte n'est pas (encore) approuvé.
  redirect(cheminInterne(formData.get("suivant")));
}

/**
 * Création de compte : le compte naît `en_attente` (base) et n'accède à rien tant que
 * l'administrateur ne l'a pas accepté.
 */
export async function inscription(_prev: EtatForm, formData: FormData): Promise<EtatForm> {
  if (!supabaseConfigure()) return NON_CONFIGURE;
  const p = inscriptionSchema.safeParse({
    nom: formData.get("nom"),
    entreprise: formData.get("entreprise"),
    email: formData.get("email"),
    motDePasse: formData.get("motDePasse"),
    confirmation: formData.get("confirmation"),
  });
  if (!p.success) return { error: premiereErreur(p.error) };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: p.data.email,
    password: p.data.motDePasse,
    options: {
      data: { full_name: p.data.nom, entreprise: p.data.entreprise },
      emailRedirectTo: lienCallback(await urlSite(), PAGE_ATTENTE),
    },
  });
  if (error) return { error: messageAuth(error.message) };
  // Adresse déjà inscrite : GoTrue renvoie un utilisateur sans identité (anti-énumération).
  if (data.user && data.user.identities?.length === 0) return { error: "Un compte existe déjà avec cette adresse e-mail." };
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(`${PAGE_ATTENTE}?nouveau=1`);
  }
  return {
    message:
      "Votre demande a été transmise à l'administrateur. Confirmez d'abord votre adresse e-mail via le lien reçu ; l'accès sera ouvert après validation.",
  };
}

export async function deconnexion(): Promise<void> {
  if (supabaseConfigure()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
