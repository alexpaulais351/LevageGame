import { describe, expect, it } from "vitest";

import { mapChartRow, type ChartRow } from "./supabase-provider";

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
