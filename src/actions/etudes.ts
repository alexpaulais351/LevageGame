"use server";

import { revalidatePath } from "next/cache";

import { echec, ok, type ActionResult } from "@/lib/account/result";
import { prochaineReference } from "@/lib/account/reference";
import {
  etudeCreationSchema,
  etudeRenommerSchema,
  idEntiteSchema,
  premiereErreur,
  projetRefSchema,
} from "@/lib/account/schemas";
import { donneesDepuisVersion, donneesInitiales, verdictDepuisResultat } from "@/lib/account/version";
import { indiceDepuisNumero } from "@/lib/account/indice";
import {
  donneesVersionCourante,
  etudeAutorisee,
  insererVersion,
  projetAutorise,
  reglagesUtilisateur,
} from "@/lib/supabase/domain";
import { contexteUtilisateur, type Contexte } from "@/lib/supabase/session";
import type { StudyData } from "@/lib/study/types";

export interface EtudeResume {
  id: string;
  reference: string | null;
  titre: string;
  indice: string | null;
  verdict: ReturnType<typeof verdictDepuisResultat>;
  majLe: string;
}

const CONNEXION = "Connexion requise.";
const INTROUVABLE = "Étude introuvable.";

export async function listerEtudes(input: unknown): Promise<ActionResult<EtudeResume[]>> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return echec(CONNEXION);
  const p = projetRefSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  if (!(await projetAutorise(ctx.supabase, ctx.user.id, p.data.projetId))) return echec("Projet introuvable.");
  const { data, error } = await ctx.supabase
    .from("lifting_studies")
    .select("id,reference,title,current_version_id,updated_at")
    .eq("project_id", p.data.projetId)
    .order("created_at", { ascending: true });
  if (error) return echec("Impossible de charger les études.");
  const ids = (data ?? []).map((e) => e.current_version_id).filter((x): x is string => Boolean(x));
  const versions = new Map<string, { index: number; result: unknown }>();
  if (ids.length) {
    const { data: vs } = await ctx.supabase.from("study_versions").select("id,index,result").in("id", ids);
    for (const v of vs ?? []) versions.set(v.id as string, { index: v.index as number, result: v.result });
  }
  return ok(
    (data ?? []).map((e) => {
      const v = e.current_version_id ? versions.get(e.current_version_id as string) : undefined;
      return {
        id: e.id as string,
        reference: e.reference as string | null,
        titre: e.title as string,
        indice: v ? indiceDepuisNumero(v.index) : null,
        verdict: v ? verdictDepuisResultat(v.result) : null,
        majLe: e.updated_at as string,
      };
    }),
  );
}

/** Crée l'étude + sa version A (données initiales) ; la référence est unique dans le projet (nouvelle tentative si collision). */
async function creerEtudeAvecVersion(
  ctx: Contexte,
  projetId: string,
  titre: string,
  data: StudyData,
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = ctx;
  for (let essai = 0; essai < 3; essai++) {
    const { data: refs } = await supabase.from("lifting_studies").select("reference").eq("project_id", projetId);
    const reference = prochaineReference((refs ?? []).map((r) => r.reference as string | null));
    const { data: etude, error } = await supabase
      .from("lifting_studies")
      .insert({ project_id: projetId, title: titre, reference })
      .select("id")
      .single();
    if (error?.code === "23505") continue; // référence prise entre-temps
    if (error || !etude) return echec("La création de l'étude a échoué.");
    const v = await insererVersion(supabase, user.id, etude.id as string, data);
    if ("erreur" in v) {
      await supabase.from("lifting_studies").delete().eq("id", etude.id);
      return echec(v.erreur);
    }
    revalidatePath("/projets");
    revalidatePath(`/projets/${projetId}`);
    return ok({ id: etude.id as string });
  }
  return echec("La création de l'étude a échoué (référence).");
}

export async function creerEtude(input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return echec(CONNEXION);
  const p = etudeCreationSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const projet = await projetAutorise(ctx.supabase, ctx.user.id, p.data.projetId);
  if (!projet) return echec("Projet introuvable.");
  const reglages = await reglagesUtilisateur(ctx.supabase, ctx.user.id);
  const data = donneesInitiales({ projet: projet.name, lieu: projet.site_address, redacteur: reglages.nom, seuils: reglages.seuils });
  return creerEtudeAvecVersion(ctx, projet.id, p.data.titre, data);
}

export async function renommerEtude(input: unknown): Promise<ActionResult> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return echec(CONNEXION);
  const p = etudeRenommerSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const etude = await etudeAutorisee(ctx.supabase, ctx.user.id, p.data.id);
  if (!etude) return echec(INTROUVABLE);
  const { error } = await ctx.supabase.from("lifting_studies").update({ title: p.data.titre }).eq("id", etude.id);
  if (error) return echec("Le renommage a échoué.");
  revalidatePath(`/projets/${etude.project_id}`);
  revalidatePath(`/projets/${etude.project_id}/etudes/${etude.id}`);
  return ok();
}

/** Duplique l'étude dans le même projet : nouvelle référence, version A = copie de la version courante. */
export async function dupliquerEtude(input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return echec(CONNEXION);
  const p = idEntiteSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const etude = await etudeAutorisee(ctx.supabase, ctx.user.id, p.data.id);
  if (!etude) return echec(INTROUVABLE);
  const json = await donneesVersionCourante(ctx.supabase, etude);
  if (json === null) return echec("Cette étude n'a pas encore de version à dupliquer.");
  return creerEtudeAvecVersion(ctx, etude.project_id, `${etude.title} (copie)`.slice(0, 200), donneesDepuisVersion(json));
}

export async function supprimerEtude(input: unknown): Promise<ActionResult> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return echec(CONNEXION);
  const p = idEntiteSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const etude = await etudeAutorisee(ctx.supabase, ctx.user.id, p.data.id);
  if (!etude) return echec(INTROUVABLE);
  const { error } = await ctx.supabase.from("lifting_studies").delete().eq("id", etude.id);
  if (error) return echec("La suppression a échoué.");
  revalidatePath("/projets");
  revalidatePath(`/projets/${etude.project_id}`);
  return ok();
}
