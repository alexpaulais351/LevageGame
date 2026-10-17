import { describe, expect, it } from "vitest";

import { abaqueTestFictifFleche } from "@/engine/__tests__/fixtures";

import { calculRapide, donneesRapides } from "./rapide";

describe("adéquation rapide", () => {
  const base = () => {
    const d = donneesRapides();
    d.machine.selection = {
      typeId: "t",
      typeLabel: "Grue mobile",
      manufacturerId: "f",
      manufacturerName: "TEST",
      machineId: "m",
      model: "FICTIF",
      configurationId: "c",
      configurationLabel: "test",
      chart: abaqueTestFictifFleche(),
    };
    d.machine.moufleCrochetKg = 200;
    d.charge.masseKg = 2500;
    d.charge.coefMarge = 1.1;
    d.geometrie.positions[0].porteeM = 8;
    d.geometrie.positions[0].yM = 20;
    return d;
  };

  it("une seule position « Pose » par défaut", () => {
    expect(donneesRapides().geometrie.positions).toHaveLength(1);
  });

  it("charge totale × coef + moufle, taux et portée max, sans bloquant documentaire", () => {
    const r = calculRapide(base());
    expect(r.chargeTotale.value).toBeCloseTo(2950);
    expect(r.verdict.value.positions[0].capacite.value).toBe(5200);
    expect(r.verdict.value.verdict).toBe("ADEQUAT");
    expect(r.verdict.value.bloquants).toEqual([]);
    expect(r.porteeMax?.value).toBe(12);
  });

  it("hors abaque au-delà de la grille ⇒ non adéquat", () => {
    const d = base();
    d.geometrie.positions[0].porteeM = 40;
    expect(calculRapide(d).verdict.value.verdict).toBe("NON_ADEQUAT");
  });
});
