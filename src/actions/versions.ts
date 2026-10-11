"use server";

import { revalidatePath } from "next/cache";

import { indiceDepuisNumero } from "@/lib/account/indice";
import { echec, ok, type ActionResult } from "@/lib/account/result";
import { etudeRefSchema, premiereErreur, versionEnregistrerSchema, versionRefSchema } from "@/lib/account/schemas";
import { donneesDepuisVersion, verdictDepuisResultat } from "@/lib/account/version";
import { etudeAutorisee, insererVersion } from "@/lib/supabase/domain";
import { ACCES_REFUSE, contexteApprouve } from "@/lib/supabase/session";
import type { StudyData } from "@/lib/study/types";

export interface VersionResume {
  index: number;
  indice: string;
  creeeLe: string;
  verdict: ReturnType<typeof verdictDepuisResultat>;
  courante: boolean;
  auteurMoi: boolean;
}

const CONNEXION = ACCES_REFUSE;
const INTROUVABLE = "Étude introuvable.";

function revalider(projetId: string, etudeId: string) {
  revalidatePath(`/projets/${projetId}`);
  revalidatePath(`/projets/${projetId}/etudes/${etudeId}`);
}

/** Enregistre l'état du store comme nouvelle version immuable (indice A, B, C…) et la rend courante. */
export async function enregistrerVersion(input: unknown): Promise<ActionResult<{ index: number; indice: string }>> {
  const ctx = await contexteApprouve();
  if (!ctx) return echec(CONNEXION);
  const p = versionEnregistrerSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const etude = await etudeAutorisee(ctx.supabase, ctx.user.id, p.data.etudeId);
  if (!etude) return echec(INTROUVABLE);
  const v = await insererVersion(ctx.supabase, ctx.user.id, etude.id, donneesDepuisVersion(p.data.data));
  if ("erreur" in v) return echec(v.erreur);
  revalider(etude.project_id, etude.id);
  return ok({ index: v.index, indice: indiceDepuisNumero(v.index) });
}

/** Historique des versions, de la plus récente à la plus ancienne. */
export async function listerVersions(input: unknown): Promise<ActionResult<VersionResume[]>> {
  const ctx = await contexteApprouve();
  if (!ctx) return echec(CONNEXION);
  const p = etudeRefSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const etude = await etudeAutorisee(ctx.supabase, ctx.user.id, p.data.etudeId);
  if (!etude) return echec(INTROUVABLE);
  const { data, error } = await ctx.supabase
    .from("study_versions")
    .select("id,index,created_at,author_id,verdict:result->verdict->value->>verdict")
    .eq("study_id", etude.id)
    .order("index", { ascending: false });
  if (error) return echec("Impossible de charger l'historique.");
  return ok(
    (data ?? []).map((v) => {
      const verdict = (v as unknown as { verdict: unknown }).verdict;
      return {
        index: v.index as number,
        indice: indiceDepuisNumero(v.index as number),
        creeeLe: v.created_at as string,
        verdict: verdictDepuisResultat({ verdict: { value: { verdict } } }),
        courante: v.id === etude.current_version_id,
        auteurMoi: v.author_id === ctx.user.id,
      };
    }),
  );
}

/** Données d'une version, prêtes à être chargées dans le store (lecture seule : rien n'est modifié). */
export async function ouvrirVersion(input: unknown): Promise<ActionResult<{ index: number; indice: string; data: StudyData }>> {
  const ctx = await contexteApprouve();
  if (!ctx) return echec(CONNEXION);
  const p = versionRefSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const etude = await etudeAutorisee(ctx.supabase, ctx.user.id, p.data.etudeId);
  if (!etude) return echec(INTROUVABLE);
  const { data } = await ctx.supabase
    .from("study_versions")
    .select("index,data")
    .eq("study_id", etude.id)
    .eq("index", p.data.index)
    .maybeSingle();
  if (!data) return echec("Version introuvable.");
  return ok({ index: data.index as number, indice: indiceDepuisNumero(data.index as number), data: donneesDepuisVersion(data.data) });
}

/** Restaurer = nouvelle version (copie des données de l'ancienne) ; l'historique n'est jamais réécrit. */
export async function restaurerVersion(input: unknown): Promise<ActionResult<{ index: number; indice: string }>> {
  const ouverte = await ouvrirVersion(input);
  if (!ouverte.ok) return ouverte;
  const ctx = await contexteApprouve();
  if (!ctx) return echec(CONNEXION);
  const { etudeId } = versionRefSchema.parse(input);
  const etude = await etudeAutorisee(ctx.supabase, ctx.user.id, etudeId);
  if (!etude) return echec(INTROUVABLE);
  const v = await insererVersion(ctx.supabase, ctx.user.id, etude.id, ouverte.data.data);
  if ("erreur" in v) return echec(v.erreur);
  revalider(etude.project_id, etude.id);
  return ok({ index: v.index, indice: indiceDepuisNumero(v.index) });
}
