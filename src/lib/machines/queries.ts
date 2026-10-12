/**
 * Lecture des machines (catalogue public ou machines de l'utilisateur) côté serveur.
 * Le client Supabase porte la session : la RLS filtre déjà (public + machines personnelles du propriétaire) ;
 * le filtre `owner_id` explicite sépare les deux onglets.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { LoadChart } from "@/engine";
import { mapChartRow, type ChartRow } from "@/lib/catalog/supabase-provider";

import { specsDepuisJson, type SpecsSaisies } from "./schemas";

export interface SourceResume {
  titre: string;
  reference: string | null;
  edition: string | null;
  url: string | null;
  editeur: string | null;
  /** PDF source : bucket `chart-sources` (catalogue public) ou `user-files` (machine personnelle). */
  pdfPath: string | null;
}

export interface AbaqueResume {
  id: string;
  status: "a_verifier" | "verifie";
  axisY: "boom_length_m" | "height_m" | "none";
  standard: string | null;
  nbPoints: number;
  verifieLe: string | null;
  source: SourceResume | null;
}

export interface ConfigResume {
  id: string;
  label: string;
  params: Record<string, unknown>;
  moufleKg: number | null;
  notes: string | null;
  abaque: AbaqueResume | null;
}

export interface MachineResume {
  id: string;
  typeId: string;
  typeCode: string;
  typeLabel: string;
  manufacturerId: string;
  manufacturerName: string;
  model: string;
  specs: SpecsSaisies;
  perso: boolean;
  photoPath: string | null;
  photoUrl: string | null;
  configurations: ConfigResume[];
}

type Un<T> = T | T[] | null;
const un = <T>(v: Un<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

interface LigneChart {
  id: string;
  status: "a_verifier" | "verifie";
  axis_y: AbaqueResume["axisY"];
  standard: string | null;
  verified_at: string | null;
  source: Un<{ document_title: string; reference: string | null; edition: string | null; url: string | null; publisher: string | null; file_path: string | null }>;
  points: { count: number }[];
}
interface LigneConfig {
  id: string;
  label: string;
  params: Record<string, unknown> | null;
  hook_block_mass_kg: number | string | null;
  notes: string | null;
  charts: LigneChart[];
}
interface LigneMachine {
  id: string;
  model: string;
  specs: unknown;
  owner_id: string | null;
  type: Un<{ id: string; code: string; label: string }>;
  manufacturer: Un<{ id: string; name: string }>;
  configurations: LigneConfig[];
}

const SELECT = `id, model, specs, owner_id,
  type:machine_types(id, code, label),
  manufacturer:manufacturers(id, name),
  configurations:machine_configurations(id, label, params, hook_block_mass_kg, notes,
    charts:load_charts(id, status, axis_y, standard, verified_at,
      source:chart_sources(document_title, reference, edition, url, publisher, file_path),
      points:load_chart_points(count)))`;

export function mapMachine(l: LigneMachine, photoPath: string | null = null): MachineResume {
  const t = un(l.type);
  const f = un(l.manufacturer);
  return {
    id: l.id,
    typeId: t?.id ?? "",
    typeCode: t?.code ?? "",
    typeLabel: t?.label ?? "Type inconnu",
    manufacturerId: f?.id ?? "",
    manufacturerName: f?.name ?? "—",
    model: l.model,
    specs: specsDepuisJson(l.specs),
    perso: l.owner_id !== null,
    photoPath,
    photoUrl: null,
    configurations: [...(l.configurations ?? [])]
      .sort((a, b) => a.label.localeCompare(b.label, "fr"))
      .map((c) => {
        const ch = [...(c.charts ?? [])].sort((a, b) => (a.status === b.status ? 0 : a.status === "verifie" ? -1 : 1))[0];
        const s = ch ? un(ch.source) : null;
        return {
          id: c.id,
          label: c.label,
          params: c.params ?? {},
          moufleKg: c.hook_block_mass_kg === null ? null : Number(c.hook_block_mass_kg),
          notes: c.notes,
          abaque: ch
            ? {
                id: ch.id,
                status: ch.status,
                axisY: ch.axis_y,
                standard: ch.standard,
                nbPoints: ch.points?.[0]?.count ?? 0,
                verifieLe: ch.verified_at,
                source: s
                  ? { titre: s.document_title, reference: s.reference, edition: s.edition, url: s.url, editeur: s.publisher, pdfPath: s.file_path }
                  : null,
              }
            : null,
        };
      }),
  };
}

/** Photos des machines (pièces jointes `photo`) + URL signées (bucket privé). */
async function avecPhotos(supabase: SupabaseClient, machines: MachineResume[]): Promise<MachineResume[]> {
  const perso = machines.filter((m) => m.perso);
  if (perso.length === 0) return machines;
  const { data } = await supabase
    .from("attachments")
    .select("machine_id,file_path")
    .eq("kind", "photo")
    .in("machine_id", perso.map((m) => m.id));
  const chemins = new Map((data ?? []).map((a) => [a.machine_id as string, a.file_path as string]));
  const paths = [...chemins.values()];
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("user-files").createSignedUrls(paths, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return machines.map((m) => {
    const p = chemins.get(m.id) ?? null;
    return { ...m, photoPath: p, photoUrl: p ? (urls.get(p) ?? null) : null };
  });
}

export async function listerMachines(supabase: SupabaseClient, portee: "public" | "mine", userId?: string): Promise<MachineResume[]> {
  let q = supabase.from("machines").select(SELECT);
  if (portee === "public") q = q.is("owner_id", null);
  else {
    if (!userId) return [];
    q = q.eq("owner_id", userId);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const machines = ((data ?? []) as unknown as LigneMachine[]).map((l) => mapMachine(l));
  machines.sort((a, b) => a.typeLabel.localeCompare(b.typeLabel, "fr") || a.manufacturerName.localeCompare(b.manufacturerName, "fr") || a.model.localeCompare(b.model, "fr"));
  return avecPhotos(supabase, machines);
}

export async function lireMachine(supabase: SupabaseClient, id: string): Promise<MachineResume | null> {
  const { data } = await supabase.from("machines").select(SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  const [m] = await avecPhotos(supabase, [mapMachine(data as unknown as LigneMachine)]);
  return m;
}

/** Abaques complets (nœuds) des configurations d'une machine, pour tracer les courbes de la fiche. */
export async function lireAbaques(supabase: SupabaseClient, configurationIds: string[]): Promise<Map<string, LoadChart>> {
  const res = new Map<string, LoadChart>();
  if (configurationIds.length === 0) return res;
  const { data } = await supabase
    .from("load_charts")
    .select(
      "id, configuration_id, axis_y, standard, deductions_included, interpolation_allowed, status, source:chart_sources(document_title, reference, edition, url), points:load_chart_points(x, y, capacity_kg)",
    )
    .in("configuration_id", configurationIds);
  for (const r of (data ?? []) as unknown as (Omit<ChartRow, "source"> & { configuration_id: string; source: Un<ChartRow["source"] & object> })[]) {
    res.set(r.configuration_id, mapChartRow({ ...r, source: un(r.source) }));
  }
  return res;
}
