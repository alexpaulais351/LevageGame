import { describe, expect, it } from "vitest";

import { abaqueTestFictifSimple } from "@/engine/__tests__/fixtures";

import { createStaticProvider } from "./static-provider";
import { mapChartRow, type ChartRow } from "./supabase-provider";
import type { StaticCatalogData } from "./types";

describe("fournisseur statique de repli", () => {
  it("le JSON embarqué est vide", async () => {
    const p = createStaticProvider();
    expect(p.kind).toBe("statique");
    expect(await p.listTypes()).toEqual([]);
  });

  it("navigue types → constructeurs → modèles → configurations → abaque", async () => {
    const chart = abaqueTestFictifSimple();
    const data: StaticCatalogData = {
      types: [{ id: "t1", code: "x", label: "Type test" }],
      manufacturers: [
        { id: "f1", name: "Fab A" },
        { id: "f2", name: "Fab B" },
      ],
      machines: [{ id: "m1", typeId: "t1", manufacturerId: "f1", model: "M1" }],
      configurations: [{ id: "c1", machineId: "m1", label: "Conf", hookBlockMassKg: 50, notes: null }],
      charts: [{ ...chart, configurationId: "c1" }],
    };
    const p = createStaticProvider(data);
    expect((await p.listManufacturers("t1")).map((f) => f.id)).toEqual(["f1"]);
    expect((await p.listModels("t1", "f1")).map((m) => m.id)).toEqual(["m1"]);
    expect((await p.listConfigurations("m1"))[0].hookBlockMassKg).toBe(50);
    const c = await p.getChart("c1");
    expect(c?.id).toBe(chart.id);
    expect(c).not.toHaveProperty("configurationId");
    expect(await p.getChart("inconnu")).toBeNull();
  });
});

describe("mapChartRow", () => {
  const base: ChartRow = {
    id: "abc",
    axis_y: "boom_length_m",
    standard: "EN 13000",
    deductions_included: false,
    interpolation_allowed: false,
    status: "a_verifier",
    source: { document_title: "Doc", reference: "R1", edition: "2020", url: null },
    points: [
      { x: "8", y: "20", capacity_kg: "5000" },
      { x: 3, y: 10, capacity_kg: null },
    ],
  };
  it("convertit les numériques et trie les nœuds", () => {
    const c = mapChartRow(base);
    expect(c.points.map((p) => p.x)).toEqual([3, 8]);
    expect(c.points[0].capacityKg).toBeNull();
    expect(c.points[1]).toEqual({ x: 8, y: 20, capacityKg: 5000 });
    expect(c.source).toEqual({ title: "Doc", reference: "R1", edition: "2020", url: "" });
    expect(c.status).toBe("a_verifier");
  });
  it("y devient null pour un abaque sans axe Y", () => {
    const c = mapChartRow({ ...base, axis_y: "none", points: [{ x: 2, y: 0, capacity_kg: 1000 }] });
    expect(c.points[0].y).toBeNull();
  });
});
