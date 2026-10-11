"use server";

import { revalidatePath } from "next/cache";

import { echec, ok, type ActionResult } from "@/lib/account/result";
import { idEntiteSchema, premiereErreur, projetCreationSchema, projetRenommerSchema } from "@/lib/account/schemas";
import { projetAutorise } from "@/lib/supabase/domain";
import { contexteUtilisateur } from "@/lib/supabase/session";

export interface ProjetResume {
  id: string;
  nom: string;
  adresse: string | null;
  client: string | null;
  nbEtudes: number;
  majLe: string;
}

const CONNEXION = "Connexion requise.";

export async function listerProjets(): Promise<ActionResult<ProjetResume[]>> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return echec(CONNEXION);
  const { data, error } = await ctx.supabase
    .from("projects")
    .select("id,name,site_address,client,updated_at,lifting_studies(count)")
    .eq("owner_id", ctx.user.id)
    .order("updated_at", { ascending: false });
  if (error) return echec("Impossible de charger les projets.");
  return ok(
    (data ?? []).map((p) => ({
      id: p.id as string,
      nom: p.name as string,
      adresse: p.site_address as string | null,
      client: p.client as string | null,
      nbEtudes: (p.lifting_studies as unknown as { count: number }[])[0]?.count ?? 0,
      majLe: p.updated_at as string,
    })),
  );
}

export async function creerProjet(input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return echec(CONNEXION);
  const p = projetCreationSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const { data, error } = await ctx.supabase
    .from("projects")
    .insert({ owner_id: ctx.user.id, name: p.data.nom, site_address: p.data.adresse, client: p.data.client })
    .select("id")
    .single();
  if (error || !data) return echec("La création du projet a échoué.");
  revalidatePath("/projets");
  return ok({ id: data.id as string });
}

export async function renommerProjet(input: unknown): Promise<ActionResult> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return echec(CONNEXION);
  const p = projetRenommerSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  if (!(await projetAutorise(ctx.supabase, ctx.user.id, p.data.id))) return echec("Projet introuvable.");
  const { error } = await ctx.supabase.from("projects").update({ name: p.data.nom }).eq("id", p.data.id).eq("owner_id", ctx.user.id);
  if (error) return echec("Le renommage a échoué.");
  revalidatePath("/projets");
  revalidatePath(`/projets/${p.data.id}`);
  return ok();
}

/** Supprime le projet, ses études et leurs versions (cascade en base). */
export async function supprimerProjet(input: unknown): Promise<ActionResult> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return echec(CONNEXION);
  const p = idEntiteSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  if (!(await projetAutorise(ctx.supabase, ctx.user.id, p.data.id))) return echec("Projet introuvable.");
  const { error } = await ctx.supabase.from("projects").delete().eq("id", p.data.id).eq("owner_id", ctx.user.id);
  if (error) return echec("La suppression a échoué.");
  revalidatePath("/projets");
  return ok();
}
