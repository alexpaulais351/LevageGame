import { describe, expect, it } from "vitest";

import type { LoadChart } from "@/engine";
import { createInitialData } from "@/lib/study/defaults";

import { axeYIncompatible, etudeAvecAlternative, evaluerAlternative } from "./comparateur";

const chart = (cap: number): LoadChart => ({
  id: "c",
  axisX: "radius_m",
  axisY: "none",
  points: [
    { x: 3, y: null, capacityKg: cap },
    { x: 10, y: null, capacityKg: cap / 2 },
  ],
  interpolationAllowed: false,
  status: "verifie",
  standard: "",
  source: { title: "t", reference: "r", edition: "e", url: "u" },
  deductionsIncluded: true,
});
const sel = (cap: number, cfg: string) => ({
  typeId: "t", typeLabel: "T", manufacturerId: "m", manufacturerName: "M", machineId: "x", model: "X",
  configurationId: cfg, configurationLabel: cfg, chart: chart(cap),
});

describe("comparateur", () => {
  const d = createInitialData();
  d.charge.masseKg = 2000;
  d.machine.selection = sel(10000, "A");
  d.machine.moufleCrochetKg = 100;
  d.geometrie.positions = [{ id: "p", nom: "P", porteeM: 10, yM: null, angleDeg: null }];

  it("ne modifie pas l'étude d'origine et change la machine", () => {
    const avant = JSON.stringify(d);
    const e = etudeAvecAlternative(d, { selection: sel(3000, "B"), moufleCrochetKg: 50 });
    expect(JSON.stringify(d)).toBe(avant);
    expect(e.machine.selection?.configurationId).toBe("B");
    expect(e.machine.moufleCrochetKg).toBe(50);
  });
  it("conserve la masse du crochet si la configuration n'en donne pas", () => {
    expect(etudeAvecAlternative(d, { selection: sel(3000, "B"), moufleCrochetKg: null }).machine.moufleCrochetKg).toBe(100);
  });
  it("taux différent selon l'abaque (capacité lue par le moteur)", () => {
    const a = evaluerAlternative(d, { selection: sel(10000, "A"), moufleCrochetKg: null });
    const b = evaluerAlternative(d, { selection: sel(3000, "B"), moufleCrochetKg: null });
    expect(a.verdict.value.tauxMax).toBeCloseTo(2100 / 5000, 9);
    expect(b.verdict.value.tauxMax).toBeCloseTo(2100 / 1500, 9);
  });
  it("axe Y incompatible", () => {
    expect(axeYIncompatible(d, { ...chart(1), axisY: "boom_length_m" })).toBe(true);
    expect(axeYIncompatible(d, chart(1))).toBe(false);
  });
});
