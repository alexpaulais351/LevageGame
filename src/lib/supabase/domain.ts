/**
 * Accès aux données métier côté serveur. Chaque fonction vérifie explicitement la propriété
 * (owner_id = utilisateur) EN PLUS de la RLS : défense en profondeur.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { computeStudy } from "@/lib/study/compute";
import type { StudyData } from "@/lib/study/types";
import { payloadVersion } from "@/lib/account/version";

export interface ProjetLigne {
  id: string;
  name: string;
  site_address: string | null;
  client: string | null;
  owner_id: string;
}

export interface EtudeLigne {
  id: string;
  project_id: string;
  reference: string | null;
  title: string;
  current_version_id: string | null;
}

/** Projet appartenant à l'utilisateur, ou `null`. */
export async function projetAutorise(supabase: SupabaseClient, userId: string, projetId: string): Promise<ProjetLigne | null> {
  const { data } = await supabase
    .from("projects")
    .select("id,name,site_address,client,owner_id")
    .eq("id", projetId)
    .eq("owner_id", userId)
    .maybeSingle();
  return data && data.owner_id === userId ? (data as ProjetLigne) : null;
}

/** Étude dont le projet appartient à l'utilisateur, ou `null`. */
export async function etudeAutorisee(
  supabase: SupabaseClient,
  userId: string,
  etudeId: string,
): Promise<(EtudeLigne & { projet: ProjetLigne }) | null> {
  const { data } = await supabase
    .from("lifting_studies")
    .select("id,project_id,reference,title,current_version_id")
    .eq("id", etudeId)
    .maybeSingle();
  if (!data) return null;
  const projet = await projetAutorise(supabase, userId, data.project_id);
  return projet ? { ...(data as EtudeLigne), projet } : null;
}

/**
 * Insère une version immuable (numéro attribué par le trigger de la base), calcule le résultat
 * du moteur côté serveur et fait pointer l'étude dessus.
 */
export async function insererVersion(
  supabase: SupabaseClient,
  userId: string,
  etudeId: string,
  data: StudyData,
): Promise<{ id: string; index: number } | { erreur: string }> {
  const payload = payloadVersion(data, computeStudy(data));
  const { data: v, error } = await supabase
    .from("study_versions")
    .insert({ study_id: etudeId, data: payload.data, result: payload.result, author_id: userId })
    .select("id,index")
    .single();
  if (error || !v) return { erreur: "L'enregistrement de la version a échoué." };
  const { error: errMaj } = await supabase.from("lifting_studies").update({ current_version_id: v.id }).eq("id", etudeId);
  if (errMaj) return { erreur: "La version est enregistrée mais n'a pas pu devenir la version courante." };
  return { id: v.id as string, index: v.index as number };
}

/** Données de la version courante d'une étude (ou `null`). */
export async function donneesVersionCourante(supabase: SupabaseClient, etude: EtudeLigne): Promise<unknown | null> {
  if (!etude.current_version_id) return null;
  const { data } = await supabase.from("study_versions").select("data").eq("id", etude.current_version_id).maybeSingle();
  return data?.data ?? null;
}

export interface Reglages {
  nom: string;
  seuils: { vert: number; orange: number };
}

/** Nom du rédacteur et seuils de l'utilisateur. */
export async function reglagesUtilisateur(supabase: SupabaseClient, userId: string): Promise<Reglages> {
  const [{ data: p }, { data: s }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase.from("user_settings").select("threshold_green,threshold_orange").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    nom: p?.full_name?.trim() ?? "",
    seuils: { vert: Number(s?.threshold_green ?? 90), orange: Number(s?.threshold_orange ?? 100) },
  };
}
