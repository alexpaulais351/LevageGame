"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { cheminInterne, type EtatForm } from "@/lib/account/result";
import { connexionSchema, inscriptionSchema, lienMagiqueSchema, premiereErreur } from "@/lib/account/schemas";
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

function lienCallback(site: string, next: string): string {
  return `${site}/auth/callback?next=${encodeURIComponent(next)}`;
}

function messageAuth(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Un compte existe déjà avec cette adresse e-mail.";
  if (m.includes("email not confirmed")) return "Adresse e-mail non confirmée : consultez le lien reçu par e-mail.";
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
  redirect(cheminInterne(formData.get("next")));
}

export async function inscription(_prev: EtatForm, formData: FormData): Promise<EtatForm> {
  if (!supabaseConfigure()) return NON_CONFIGURE;
  const p = inscriptionSchema.safeParse({
    nom: formData.get("nom"),
    email: formData.get("email"),
    motDePasse: formData.get("motDePasse"),
  });
  if (!p.success) return { error: premiereErreur(p.error) };
  const next = cheminInterne(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: p.data.email,
    password: p.data.motDePasse,
    options: { data: { full_name: p.data.nom }, emailRedirectTo: lienCallback(await urlSite(), next) },
  });
  if (error) return { error: messageAuth(error.message) };
  // Adresse déjà inscrite : GoTrue renvoie un utilisateur sans identité (anti-énumération).
  if (data.user && data.user.identities?.length === 0) return { error: "Un compte existe déjà avec cette adresse e-mail." };
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }
  return { message: "Compte créé. Un e-mail de confirmation vient d'être envoyé : cliquez sur le lien pour activer votre compte." };
}

export async function lienMagique(_prev: EtatForm, formData: FormData): Promise<EtatForm> {
  if (!supabaseConfigure()) return NON_CONFIGURE;
  const p = lienMagiqueSchema.safeParse({ email: formData.get("email") });
  if (!p.success) return { error: premiereErreur(p.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: p.data.email,
    options: { emailRedirectTo: lienCallback(await urlSite(), cheminInterne(formData.get("next"))) },
  });
  if (error) return { error: messageAuth(error.message) };
  return { message: "Si cette adresse est valide, un lien de connexion vient de vous être envoyé." };
}

export async function deconnexion(): Promise<void> {
  if (supabaseConfigure()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/");
}
