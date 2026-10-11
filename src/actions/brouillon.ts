"use server";

import { revalidatePath } from "next/cache";

import { echec, ok, type ActionResult } from "@/lib/account/result";
import { brouillonSchema, premiereErreur } from "@/lib/account/schemas";
import { appliquerSeuilsUtilisateur, donneesDepuisVersion } from "@/lib/account/version";
import { insererVersion, projetAutorise, reglagesUtilisateur } from "@/lib/supabase/domain";
import { contexteUtilisateur } from "@/lib/supabase/session";
import { prochaineReference } from "@/lib/account/reference";

/**
 * Reprise du brouillon invité : crée (ou réutilise) un projet, une étude et sa version A
 * à partir de l'adéquation en cours. Le client vide ensuite le brouillon IndexedDB.
 */
export async function importerBrouillon(input: unknown): Promise<ActionResult<{ projetId: string; etudeId: string }>> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return echec("Connexion requise.");
  const { supabase, user } = ctx;
  const p = brouillonSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));

  let projetId: string;
  let nouveauProjetId: string | null = null;
  if (p.data.projetId) {
    if (!(await projetAutorise(supabase, user.id, p.data.projetId))) return echec("Projet introuvable.");
    projetId = p.data.projetId;
  } else {
    const { data, error } = await supabase
      .from("projects")
      .insert({ owner_id: user.id, name: p.data.nouveauProjet })
      .select("id")
      .single();
    if (error || !data) return echec("La création du projet a échoué.");
    projetId = nouveauProjetId = data.id as string;
  }

  const reglages = await reglagesUtilisateur(supabase, user.id);
  let data = appliquerSeuilsUtilisateur(donneesDepuisVersion(p.data.data), reglages.seuils);
  if (!data.operation.redacteur.trim()) data = { ...data, operation: { ...data.operation, redacteur: reglages.nom } };

  const annuler = async () => {
    if (nouveauProjetId) await supabase.from("projects").delete().eq("id", nouveauProjetId).eq("owner_id", user.id);
  };
  const { data: refs } = await supabase.from("lifting_studies").select("reference").eq("project_id", projetId);
  const { data: etude, error } = await supabase
    .from("lifting_studies")
    .insert({
      project_id: projetId,
      title: p.data.titre,
      reference: prochaineReference((refs ?? []).map((r) => r.reference as string | null)),
    })
    .select("id")
    .single();
  if (error || !etude) {
    await annuler();
    return echec("La création de l'étude a échoué.");
  }
  const v = await insererVersion(supabase, user.id, etude.id as string, data);
  if ("erreur" in v) {
    await supabase.from("lifting_studies").delete().eq("id", etude.id);
    await annuler();
    return echec(v.erreur);
  }
  revalidatePath("/projets");
  revalidatePath(`/projets/${projetId}`);
  return ok({ projetId, etudeId: etude.id as string });
}
