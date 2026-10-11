import type { ChartAxisY, ChartPoint, LoadChart } from "@/engine";
import { createClient } from "@/lib/supabase/client";

import type {
  CatalogConfiguration,
  CatalogManufacturer,
  CatalogModel,
  CatalogProvider,
  CatalogType,
} from "./types";

/** Ligne PostgREST de `load_charts` avec sa source et ses nœuds. */
export interface ChartRow {
  id: string;
  axis_y: ChartAxisY;
  standard: string | null;
  deductions_included: boolean;
  interpolation_allowed: boolean;
  status: "a_verifier" | "verifie";
  source: { document_title: string; reference: string | null; edition: string | null; url: string | null } | null;
  points: { x: number | string; y: number | string; capacity_kg: number | string | null }[];
}

/** Emprise des stabilisateurs saisie sur une machine personnelle (`specs.calage`), sinon `null`. */
export function calageDepuisSpecs(specs: unknown): { longueurM: number; largeurM: number } | null {
  const c = (specs && typeof specs === "object" ? (specs as { calage?: unknown }).calage : null) as { longueurM?: unknown; largeurM?: unknown } | null;
  const ok = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
  return c && ok(c.longueurM) && ok(c.largeurM) ? { longueurM: c.longueurM, largeurM: c.largeurM } : null;
}

/** Convertit une ligne Supabase en abaque du moteur (y = 0 ⇒ null quand l'abaque n'a pas d'axe Y). */
export function mapChartRow(row: ChartRow): LoadChart {
  const points: ChartPoint[] = row.points
    .map((p) => ({
      x: Number(p.x),
      y: row.axis_y === "none" ? null : Number(p.y),
      capacityKg: p.capacity_kg === null ? null : Number(p.capacity_kg),
    }))
    .sort((a, b) => a.x - b.x || (a.y ?? 0) - (b.y ?? 0));
  return {
    id: row.id,
    axisX: "radius_m",
    axisY: row.axis_y,
    points,
    interpolationAllowed: row.interpolation_allowed,
    status: row.status,
    standard: row.standard ?? "",
    source: {
      title: row.source?.document_title ?? "",
      reference: row.source?.reference ?? "",
      edition: row.source?.edition ?? "",
      url: row.source?.url ?? "",
    },
    deductionsIncluded: row.deductions_included,
  };
}

/**
 * `public` : catalogue public (owner_id IS NULL), lisible par tout compte approuvé.
 * `mine`   : machines personnelles ; la RLS ne renvoie que celles de l'utilisateur connecté.
 */
export type PorteeCatalogue = "public" | "mine";

/** Lecture seule du catalogue (RLS : le client porte la session de l'utilisateur). */
export function createSupabaseProvider(portee: PorteeCatalogue = "public"): CatalogProvider {
  const mine = portee === "mine";
  const proprietaire = <Q extends { is: (c: string, v: null) => Q; not: (c: string, o: string, v: null) => Q }>(q: Q): Q =>
    mine ? q.not("owner_id", "is", null) : q.is("owner_id", null);
  let client: ReturnType<typeof createClient> | null = null;
  const db = () => (client ??= createClient());
  const ou = <T>(r: { data: T | null; error: { message: string } | null }): T => {
    if (r.error) throw new Error(r.error.message);
    return r.data as T;
  };

  return {
    kind: "supabase",
    async listTypes() {
      if (mine) {
        const rows = ou(await proprietaire(db().from("machines").select("type:machine_types(id, code, label)"))) as unknown as {
          type: CatalogType | CatalogType[] | null;
        }[];
        const uniques = new Map<string, CatalogType>();
        for (const r of rows) {
          const t = Array.isArray(r.type) ? r.type[0] : r.type;
          if (t) uniques.set(t.id, t);
        }
        return [...uniques.values()].sort((a, b) => a.label.localeCompare(b.label, "fr"));
      }
      const rows = ou(await db().from("machine_types").select("id, code, label").order("label"));
      return (rows as CatalogType[]) ?? [];
    },
    async listManufacturers(typeId) {
      const rows = ou(
        await proprietaire(db().from("machines").select("manufacturer:manufacturers(id, name)").eq("type_id", typeId)),
      ) as unknown as { manufacturer: CatalogManufacturer | CatalogManufacturer[] | null }[];
      const uniques = new Map<string, CatalogManufacturer>();
      for (const r of rows) {
        const f = Array.isArray(r.manufacturer) ? r.manufacturer[0] : r.manufacturer;
        if (f) uniques.set(f.id, f);
      }
      return [...uniques.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    },
    async listModels(typeId, manufacturerId) {
      const rows = ou(
        await proprietaire(
          db().from("machines").select("id, type_id, manufacturer_id, model, specs").eq("type_id", typeId).eq("manufacturer_id", manufacturerId),
        ).order("model"),
      ) as { id: string; type_id: string; manufacturer_id: string; model: string; specs: unknown }[];
      const photos = new Map<string, string>();
      if (mine && rows.length) {
        const pj = ou(
          await db()
            .from("attachments")
            .select("machine_id, file_path")
            .eq("kind", "photo")
            .in("machine_id", rows.map((r) => r.id)),
        ) as { machine_id: string; file_path: string }[];
        for (const a of pj) photos.set(a.machine_id, a.file_path);
      }
      return rows.map<CatalogModel>((r) => ({
        id: r.id,
        typeId: r.type_id,
        manufacturerId: r.manufacturer_id,
        model: r.model,
        ...(mine ? { calage: calageDepuisSpecs(r.specs), photoPath: photos.get(r.id) ?? null } : {}),
      }));
    },
    async listConfigurations(machineId) {
      const rows = ou(
        await db()
          .from("machine_configurations")
          .select("id, machine_id, label, hook_block_mass_kg, notes")
          .eq("machine_id", machineId)
          .order("label"),
      ) as { id: string; machine_id: string; label: string; hook_block_mass_kg: number | string | null; notes: string | null }[];
      return rows.map<CatalogConfiguration>((r) => ({
        id: r.id,
        machineId: r.machine_id,
        label: r.label,
        hookBlockMassKg: r.hook_block_mass_kg === null ? null : Number(r.hook_block_mass_kg),
        notes: r.notes,
      }));
    },
    async getChart(configurationId) {
      const rows = ou(
        await db()
          .from("load_charts")
          .select(
            "id, axis_y, standard, deductions_included, interpolation_allowed, status, source:chart_sources(document_title, reference, edition, url), points:load_chart_points(x, y, capacity_kg)",
          )
          .eq("configuration_id", configurationId)
          .order("status", { ascending: false })
          .limit(1),
      ) as unknown as (Omit<ChartRow, "source"> & { source: ChartRow["source"] | ChartRow["source"][] })[];
      const r = rows[0];
      if (!r) return null;
      return mapChartRow({ ...r, source: Array.isArray(r.source) ? (r.source[0] ?? null) : r.source });
    },
  };
}
