import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { supabaseConfigure } from "./env";
import { createClient } from "./server";

export interface Contexte {
  supabase: SupabaseClient;
  user: User;
}

/** Client serveur (JWT de l'utilisateur → RLS) et utilisateur vérifié ; `null` si non connecté. */
export async function contexteUtilisateur(): Promise<Contexte | null> {
  if (!supabaseConfigure()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

/** Pour les pages privées : redirige vers /login si non connecté. */
export async function exigerUtilisateur(retour?: string): Promise<Contexte> {
  const ctx = await contexteUtilisateur();
  if (!ctx) redirect(`/login${retour ? `?next=${encodeURIComponent(retour)}` : ""}`);
  return ctx;
}

export interface Utilisateur {
  id: string;
  email: string;
  nom: string;
}

/** Utilisateur affichable (barre latérale, topbar) ; `null` en mode invité. */
export async function utilisateurCourant(): Promise<Utilisateur | null> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return null;
  const { data } = await ctx.supabase.from("profiles").select("full_name").eq("id", ctx.user.id).maybeSingle();
  const email = ctx.user.email ?? "";
  return { id: ctx.user.id, email, nom: data?.full_name?.trim() || email.split("@")[0] || "Utilisateur" };
}
