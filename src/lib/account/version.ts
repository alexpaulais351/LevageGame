/**
 * Correspondance état du store ↔ ligne `study_versions` (data / result jsonb).
 * Fonctions pures : aucun accès réseau ni React.
 */
import { computeStudy, type StudyResult } from "@/lib/study/compute";
import { createInitialData, fusionnerAvecDefauts } from "@/lib/study/defaults";
import type { StudyData } from "@/lib/study/types";

import { indiceDepuisNumero } from "./indice";

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** Rend un objet sûr pour jsonb : NaN / Infinity → null, undefined supprimé. */
export function versJson<T>(valeur: T): Json {
  return JSON.parse(JSON.stringify(valeur)) as Json;
}

export interface VersionPayload {
  data: Json;
  result: Json;
}

/** État du store (+ résultat du moteur calculé à partir de lui) → colonnes data / result. */
export function payloadVersion(data: StudyData, result: StudyResult = computeStudy(data)): VersionPayload {
  return { data: versJson(data), result: versJson(result) };
}

/** Colonne `data` d'une version → état du store (sections absentes complétées par les défauts). */
export function donneesDepuisVersion(json: unknown): StudyData {
  if (!json || typeof json !== "object" || Array.isArray(json)) return createInitialData();
  return fusionnerAvecDefauts(json as Partial<StudyData>);
}

/** Code de l'ancienne réserve « abaque à vérifier », retirée du moteur (D29) mais présente dans des versions stockées. */
export const RESERVE_OBSOLETE_ABAQUE = "ABAQUE_A_VERIFIER";

/**
 * Verdict (code moteur) stocké dans `result`, s'il est lisible.
 * Les versions sont immuables (D11) : une version enregistrée avant D29 dont la SEULE raison de réserve était
 * l'abaque « à vérifier » (aucun bloquant, aucune autre réserve) est affichée ADEQUAT, comme le donnerait un recalcul.
 */
export function verdictDepuisResultat(result: unknown): "ADEQUAT" | "ADEQUAT_AVEC_RESERVES" | "NON_ADEQUAT" | null {
  const val = (result as { verdict?: { value?: { verdict?: unknown; reserves?: unknown; bloquants?: unknown } } } | null)?.verdict?.value;
  const v = val?.verdict;
  if (v === "ADEQUAT_AVEC_RESERVES" && Array.isArray(val?.reserves) && val.reserves.length > 0) {
    const bloquants = Array.isArray(val.bloquants) ? val.bloquants : [];
    const seulementObsolete = val.reserves.every((r) => (r as { code?: unknown } | null)?.code === RESERVE_OBSOLETE_ABAQUE);
    if (seulementObsolete && bloquants.length === 0) return "ADEQUAT";
  }
  return v === "ADEQUAT" || v === "ADEQUAT_AVEC_RESERVES" || v === "NON_ADEQUAT" ? v : null;
}

/** Sérialisation stable (clés triées) : comparaison indépendante de l'ordre des clés jsonb. */
export function jsonStable(valeur: unknown): string {
  const tri = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(tri);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .filter(([, x]) => x !== undefined)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, x]) => [k, tri(x)]),
      );
    }
    return typeof v === "number" && !Number.isFinite(v) ? null : v;
  };
  return JSON.stringify(tri(valeur));
}

/** Seuils par défaut du moteur (80 / 100 %). */
export const SEUILS_DEFAUT = { vertPct: 80, orangePct: 100 } as const;

/** Applique les seuils utilisateur si l'étude a encore les seuils par défaut. */
export function appliquerSeuilsUtilisateur(data: StudyData, seuils: { vert: number; orange: number }): StudyData {
  const parDefaut = data.seuils.vertPct === SEUILS_DEFAUT.vertPct && data.seuils.orangePct === SEUILS_DEFAUT.orangePct;
  return parDefaut ? { ...data, seuils: { vertPct: seuils.vert, orangePct: seuils.orange } } : data;
}

/** Données d'une étude toute neuve, pré-remplies depuis le projet et le profil. */
export function donneesInitiales(args: {
  projet: string;
  lieu?: string | null;
  redacteur?: string | null;
  seuils?: { vert: number; orange: number };
}): StudyData {
  const d = createInitialData();
  d.operation.projet = args.projet;
  d.operation.lieu = args.lieu ?? "";
  d.operation.redacteur = args.redacteur ?? "";
  return args.seuils ? appliquerSeuilsUtilisateur(d, args.seuils) : d;
}

/** Libellé « Version B ». */
export function libelleVersion(index: number): string {
  return `Version ${indiceDepuisNumero(index)}`;
}
