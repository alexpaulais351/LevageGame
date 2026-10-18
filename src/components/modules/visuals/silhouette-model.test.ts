import { describe, expect, it } from "vitest";

import { abaqueFictif } from "@/lib/pdf/fixture";
import { donneesRapides } from "@/lib/study/rapide";

import { geometrieElevation, HAUTEUR_MOUFLE_M } from "./silhouette-model";

/** Pelle sur chenilles avec abaque en hauteur (ISO 10567) : la hauteur de levage est celle du point d'attache. */
function pelleHauteur(yM: number | null, porteeM = 5.9) {
  const d = donneesRapides();
  const chart = { ...abaqueFictif(), axisY: "height_m" as const, points: [1.5, 3, 4.5, 6].flatMap((y) => [3, 4, 5, 6, 7, 8].map((x) => ({ x, y, capacityKg: 9000 - x * 800 }))) };
  d.machine.selection = {
    typeId: "pelle",
    typeLabel: "Pelle sur chenilles",
    manufacturerId: "f",
    manufacturerName: "FICTIF",
    machineId: "m",
    model: "P-1",
    configurationId: "c",
    configurationLabel: "test",
    chart,
  };
  d.charge.masseKg = 2000;
  d.geometrie.positions[0] = { id: "pose", nom: "Pose", porteeM, yM, angleDeg: null };
  return geometrieElevation(d, { ...d.geometrie.positions[0], angleDeg: null, hauteurAppuiM: null, capaciteKg: null, horsAbaque: false, taux: null, zone: null }, null);
}

describe("géométrie d'élévation — hauteur de levage d'un abaque en hauteur", () => {
  it("le point d'attache est à la hauteur de levage saisie et la charge pend dessous, à l'échelle", () => {
    for (const y of [4.5, 6]) {
      const g = pelleHauteur(y);
      expect(g.teteY).toBeCloseTo(y, 6);
      expect(g.crochetY).toBeCloseTo(y - HAUTEUR_MOUFLE_M, 6);
      expect(g.crochetIndicatif).toBe(false);
      expect(g.elingue).toBeCloseTo(0.8, 6);
    }
    // Monter la hauteur de levage monte la charge d'autant.
    const bas = (g: ReturnType<typeof pelleHauteur>) => g.crochetY - g.elingue - g.chargeH;
    expect(bas(pelleHauteur(6)) - bas(pelleHauteur(4.5))).toBeCloseTo(1.5, 6);
  });

  it("hauteur de levage trop faible : l'élingue se raccourcit, la charge ne s'enfonce pas sous le sol", () => {
    const g = pelleHauteur(2.5);
    expect(g.teteY).toBeCloseTo(2.5, 6);
    expect(g.crochetY).toBeCloseTo(2.5 - HAUTEUR_MOUFLE_M, 6);
    expect(g.elingue).toBeLessThan(0.8);
    expect(g.crochetY - g.elingue - g.chargeH).toBeGreaterThanOrEqual(-1e-9);
  });

  it("sans hauteur saisie, le crochet reste à sa hauteur par défaut (indicatif)", () => {
    const g = pelleHauteur(null);
    expect(g.crochetIndicatif).toBe(true);
  });
});
