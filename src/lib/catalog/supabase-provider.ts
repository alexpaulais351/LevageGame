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

/** Lecture seule du catalogue public avec la clé anon (RLS : owner_id IS NULL). */
export function createSupabaseProvider(): CatalogProvider {
  let client: ReturnType<typeof createClient> | null = null;
  const db = () => (client ??= createClient());
  const ou = <T>(r: { data: T | null; error: { message: string } | null }): T => {
    if (r.error) throw new Error(r.error.message);
    return r.data as T;
  };

  return {
    kind: "supabase",
    async listTypes() {
      const rows = ou(await db().from("machine_types").select("id, code, label").order("label"));
      return (rows as CatalogType[]) ?? [];
    },
    async listManufacturers(typeId) {
      const rows = ou(
        await db()
          .from("machines")
          .select("manufacturer:manufacturers(id, name)")
          .eq("type_id", typeId)
          .is("owner_id", null),
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
        await db()
          .from("machines")
          .select("id, type_id, manufacturer_id, model")
          .eq("type_id", typeId)
          .eq("manufacturer_id", manufacturerId)
          .is("owner_id", null)
          .order("model"),
      ) as { id: string; type_id: string; manufacturer_id: string; model: string }[];
      return rows.map<CatalogModel>((r) => ({
        id: r.id,
        typeId: r.type_id,
        manufacturerId: r.manufacturer_id,
        model: r.model,
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
