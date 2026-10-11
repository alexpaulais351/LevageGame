import type { SupabaseClient, User } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { supabaseConfigure } from "./env";
import { createClient } from "./server";

export type StatutCompte = "en_attente" | "approuve" | "refuse" | "suspendu";

export interface Contexte {
  supabase: SupabaseClient;
  user: User;
}

export interface EtatCompte {
  statut: StatutCompte;
  estAdmin: boolean;
  nom: string | null;
}

/** Client serveur (JWT de l'utilisateur → RLS) et utilisateur vérifié ; `null` si non connecté. Mémoïsé par requête. */
export const contexteUtilisateur = cache(async (): Promise<Contexte | null> => {
  if (!supabaseConfigure()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
});

/** Statut du compte connecté (le propriétaire lit toujours son profil, même en attente). */
export const etatCompte = cache(async (): Promise<EtatCompte | null> => {
  const ctx = await contexteUtilisateur();
  if (!ctx) return null;
  const { data } = await ctx.supabase.from("profiles").select("statut,est_admin,full_name").eq("id", ctx.user.id).maybeSingle();
  if (!data) return null;
  return {
    statut: data.statut as StatutCompte,
    estAdmin: Boolean(data.est_admin) && data.statut === "approuve",
    nom: (data.full_name as string | null) ?? null,
  };
});

/**
 * Contexte d'un compte APPROUVÉ par l'administrateur ; `null` sinon (non connecté, en attente, refusé, suspendu).
 * Toute Server Action d'accès aux données passe par ce helper, en plus de la RLS (défense en profondeur).
 */
export async function contexteApprouve(): Promise<Contexte | null> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return null;
  const etat = await etatCompte();
  return etat?.statut === "approuve" ? ctx : null;
}

/** Contexte d'un administrateur (approuvé + est_admin) ; `null` sinon. */
export async function contexteAdmin(): Promise<Contexte | null> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return null;
  const etat = await etatCompte();
  return etat?.estAdmin ? ctx : null;
}

/** Message d'erreur uniforme des Server Actions refusées faute de compte approuvé. */
export const ACCES_REFUSE = "Accès réservé aux comptes validés par l'administrateur.";

function versLogin(retour?: string): never {
  redirect(`/login${retour ? `?suivant=${encodeURIComponent(retour)}` : ""}`);
}

/** Pour les pages privées : /login si non connecté, /compte-en-attente si le compte n'est pas approuvé. */
export async function exigerUtilisateur(retour?: string): Promise<Contexte> {
  const ctx = await contexteUtilisateur();
  if (!ctx) versLogin(retour);
  const etat = await etatCompte();
  if (etat?.statut !== "approuve") redirect("/compte-en-attente");
  return ctx;
}

/** Pour les pages d'administration : connexion exigée (retour sur la page), puis est_admin, sinon 404. */
export async function exigerAdmin(retour?: string): Promise<Contexte> {
  const ctx = await exigerUtilisateur(retour);
  const etat = await etatCompte();
  if (!etat?.estAdmin) notFound();
  return ctx;
}

export interface Utilisateur {
  id: string;
  email: string;
  nom: string;
  statut: StatutCompte;
  estAdmin: boolean;
  /** Nombre de demandes en attente (administrateur uniquement). */
  demandesEnAttente: number;
}

/** Utilisateur affichable (barre latérale, topbar) ; `null` si non connecté. */
export async function utilisateurCourant(): Promise<Utilisateur | null> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return null;
  const etat = await etatCompte();
  const email = ctx.user.email ?? "";
  let demandesEnAttente = 0;
  if (etat?.estAdmin) {
    const { data } = await ctx.supabase.rpc("admin_lister_comptes");
    demandesEnAttente = ((data ?? []) as { statut: string }[]).filter((c) => c.statut === "en_attente").length;
  }
  return {
    id: ctx.user.id,
    email,
    nom: etat?.nom?.trim() || email.split("@")[0] || "Utilisateur",
    statut: etat?.statut ?? "en_attente",
    estAdmin: Boolean(etat?.estAdmin),
    demandesEnAttente,
  };
}
