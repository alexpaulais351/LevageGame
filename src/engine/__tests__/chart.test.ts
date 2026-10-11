import { describe, expect, it } from "vitest";
import { readCapacity, validateChart } from "../chart";
import type { ChartPoint, LoadChart } from "../types";
import { abaqueTestFictifFleche, abaqueTestFictifSimple, POINTS_FLECHE_FICTIFS } from "./fixtures";

const horsAbaque = (r: { value: number | null; warnings: string[] }) => {
  expect(r.value).toBeNull();
  expect(r.warnings.some((w) => w.startsWith("hors abaque"))).toBe(true);
};

describe("readCapacity — ABAQUE_TEST_FICTIF_FLECHE (sans interpolation)", () => {
  const chart = abaqueTestFictifFleche();

  it("nœud exact ⇒ valeur du nœud", () => {
    const r = readCapacity(chart, 5, 20);
    expect(r.value).toBe(7500);
    expect(r.warnings).toEqual([]);
    expect(r.formula).toContain("nœud");
    expect(r.source).toContain("ABAQUE TEST FICTIF");
    expect(r.inputs.portee.value).toBe(5);
  });

  it("nœud exact aux tolérances 1e-9 près", () => {
    expect(readCapacity(chart, 5 + 1e-12, 20 - 1e-12).value).toBe(7500);
  });

  it("entre deux nœuds ⇒ minimum des nœuds encadrants", () => {
    expect(readCapacity(chart, 6.5, 20).value).toBe(5200);
    expect(readCapacity(chart, 3.1, 10).value).toBe(8000);
  });

  it("hors abaque bas et haut en portée (aucune extrapolation)", () => {
    horsAbaque(readCapacity(chart, 2.999, 20));
    horsAbaque(readCapacity(chart, 16.001, 20));
    horsAbaque(readCapacity(chart, -1, 20));
  });

  it("y hors des valeurs de la grille ⇒ hors abaque", () => {
    horsAbaque(readCapacity(chart, 5, 9.9));
    horsAbaque(readCapacity(chart, 5, 30.1));
  });

  it("y intermédiaire ⇒ minimum sur les 2 à 4 nœuds encadrants", () => {
    expect(readCapacity(chart, 5, 15).value).toBe(7500); // nœuds 8000 / 7500
    expect(readCapacity(chart, 4, 15).value).toBe(7500); // 10000, 8000, 9000, 7500
    const r = readCapacity(chart, 10, 25); // 5200, 3000, 4800, 2800
    expect(r.value).toBe(2800);
    expect(r.inputs.ligne_inf.value).toBe(3000);
    expect(r.inputs.ligne_sup.value).toBe(2800);
  });

  it("portée max variable selon la flèche : nœud manquant ⇒ hors abaque", () => {
    expect(readCapacity(chart, 10, 20).value).toBe(3000);
    horsAbaque(readCapacity(chart, 10, 15)); // la ligne 10 m s'arrête à 8 m
    horsAbaque(readCapacity(chart, 4, 25)); // la ligne 30 m commence à 5 m
    horsAbaque(readCapacity(chart, 18, 25)); // ligne 20 m s'arrête à 16 m
    expect(readCapacity(chart, 18, 30).value).toBe(1200);
  });

  it("cellule vide ⇒ hors abaque (sur le nœud et entre nœuds)", () => {
    horsAbaque(readCapacity(chart, 24, 30));
    horsAbaque(readCapacity(chart, 22, 30));
  });

  it("donnée manquante ou invalide ⇒ hors abaque", () => {
    horsAbaque(readCapacity(chart, 5));
    horsAbaque(readCapacity(chart, 5, null));
    horsAbaque(readCapacity(chart, Number.NaN, 20));
    horsAbaque(readCapacity(chart, 5, Number.POSITIVE_INFINITY));
  });

  it("abaque vide ⇒ hors abaque", () => {
    horsAbaque(readCapacity(abaqueTestFictifFleche({ points: [] }), 5, 20));
    horsAbaque(readCapacity(abaqueTestFictifFleche({ points: [{ x: 5, y: null, capacityKg: 1 }] }), 5, 20));
  });

  it("abaque à vérifier ⇒ avertissement", () => {
    const r = readCapacity(abaqueTestFictifFleche({ status: "a_verifier" }), 5, 20);
    expect(r.value).toBe(7500);
    expect(r.warnings[0]).toMatch(/à vérifier/);
    expect(r.source).toContain("À VÉRIFIER");
  });
});

describe("readCapacity — interpolation autorisée", () => {
  const chart = abaqueTestFictifFleche({ interpolationAllowed: true });

  it("interpolation linéaire en portée sur une ligne existante", () => {
    expect(readCapacity(chart, 6.5, 20).value).toBeCloseTo(6350, 9);
    expect(readCapacity(chart, 5, 20).value).toBe(7500);
    expect(readCapacity(chart, 6.5, 20).formula).toMatch(/interpolation/);
  });

  it("y intermédiaire ⇒ minimum des deux lignes interpolées", () => {
    // ligne 20 : 7500 + 0.5×(5200−7500) = 6350 ; ligne 30 : 6000 + 0.5×(4800−6000) = 5400
    expect(readCapacity(chart, 6.5, 25).value).toBeCloseTo(5400, 9);
  });

  it("jamais d'extrapolation, même autorisée", () => {
    horsAbaque(readCapacity(chart, 2, 20));
    horsAbaque(readCapacity(chart, 17, 20));
    horsAbaque(readCapacity(chart, 22, 30));
  });
});

describe("readCapacity — abaque sans second axe", () => {
  const chart = abaqueTestFictifSimple();
  it("lit la ligne unique en ignorant y", () => {
    expect(readCapacity(chart, 6).value).toBe(1000);
    expect(readCapacity(chart, 8, 99).value).toBe(600);
    expect(readCapacity(chart, 4).formula).toMatch(/minimum/);
    horsAbaque(readCapacity(chart, 11));
    expect(readCapacity(chart, 6).inputs.y).toBeUndefined();
  });
  it("cellule vide sur la ligne unique", () => {
    const c = abaqueTestFictifSimple({ points: [{ x: 2, y: null, capacityKg: null }, { x: 4, y: null, capacityKg: 500 }] });
    horsAbaque(readCapacity(c, 2));
    horsAbaque(readCapacity(c, 3));
  });
});

/** Nœuds encadrants calculés indépendamment de l'implémentation. */
function bracketing(points: ChartPoint[], x: number, y: number): ChartPoint[] | null {
  const ys = [...new Set(points.map((p) => p.y as number))].sort((a, b) => a - b);
  const lines = ys.includes(y) ? [y] : [ys.filter((v) => v < y).pop(), ys.find((v) => v > y)];
  const out: ChartPoint[] = [];
  for (const ly of lines) {
    if (ly === undefined) return null;
    const line = points.filter((p) => p.y === ly);
    const lo = line.filter((p) => p.x <= x).sort((a, b) => b.x - a.x)[0];
    const hi = line.filter((p) => p.x >= x).sort((a, b) => a.x - b.x)[0];
    if (!lo || !hi) return null;
    out.push(lo, hi);
  }
  return out;
}

describe("propriété — capacité retournée ≤ min des nœuds encadrants (grille paramétrée)", () => {
  const cases: [number, number][] = [];
  for (let x = 0; x <= 26; x += 0.5) for (const y of [8, 10, 12.5, 15, 20, 22, 25, 30, 32]) cases.push([x, y]);

  it.each(cases)("x=%s m, y=%s m", (x, y) => {
    for (const interpolationAllowed of [false, true]) {
      const chart = abaqueTestFictifFleche({ interpolationAllowed });
      const r = readCapacity(chart, x, y);
      const nodes = bracketing(POINTS_FLECHE_FICTIFS, x, y);
      const caps = nodes?.map((n) => n.capacityKg);
      if (!nodes || caps!.some((c) => c === null)) {
        expect(r.value).toBeNull();
        continue;
      }
      expect(r.value).not.toBeNull();
      const vals = caps as number[];
      if (!interpolationAllowed) {
        expect(r.value!).toBeLessThanOrEqual(Math.min(...vals) + 1e-9);
        expect(vals).toContain(r.value);
      } else {
        expect(r.value!).toBeLessThanOrEqual(Math.max(...vals) + 1e-9);
        expect(r.value!).toBeGreaterThanOrEqual(Math.min(...vals) - 1e-9);
      }
    }
  });
});

describe("validateChart", () => {
  it("abaque de test cohérent (avec cellule vide signalée)", () => {
    const v = validateChart(abaqueTestFictifFleche());
    expect(v.valid).toBe(true);
    expect(v.errors).toEqual([]);
    expect(v.warnings.some((w) => w.includes("cellule vide"))).toBe(true);
  });

  it("grille vide", () => {
    const v = validateChart(abaqueTestFictifFleche({ points: [] }));
    expect(v.valid).toBe(false);
    expect(v.errors[0]).toMatch(/vide/);
  });

  it("valeurs négatives, NaN, doublons, y manquant", () => {
    const bad: LoadChart = abaqueTestFictifFleche({
      points: [
        { x: -1, y: 10, capacityKg: 100 },
        { x: 2, y: -10, capacityKg: 100 },
        { x: 3, y: 10, capacityKg: -5 },
        { x: Number.NaN, y: 10, capacityKg: 100 },
        { x: 4, y: 10, capacityKg: Number.NaN },
        { x: 5, y: 10, capacityKg: 50 },
        { x: 5, y: 10, capacityKg: 40 },
        { x: 6, y: null, capacityKg: 40 },
      ],
    });
    const v = validateChart(bad);
    expect(v.valid).toBe(false);
    const all = v.errors.join("\n");
    expect(all).toMatch(/portée négative/);
    expect(all).toMatch(/flèche négative/);
    expect(all).toMatch(/capacité négative/);
    expect(all).toMatch(/portée non numérique/);
    expect(all).toMatch(/capacité non numérique/);
    expect(all).toMatch(/doublon/);
    expect(all).toMatch(/manquante/);
  });

  it("capacité croissante avec la portée ⇒ avertissement", () => {
    const v = validateChart(
      abaqueTestFictifSimple({
        points: [
          { x: 2, y: null, capacityKg: 1000 },
          { x: 4, y: null, capacityKg: 1200 },
        ],
      }),
    );
    expect(v.valid).toBe(true);
    expect(v.warnings.some((w) => w.includes("croissante"))).toBe(true);
  });

  it("axe 'none' avec plusieurs y ⇒ erreur ; source / norme incomplètes ⇒ avertissement", () => {
    const v = validateChart(
      abaqueTestFictifSimple({
        points: [
          { x: 2, y: 1, capacityKg: 1000 },
          { x: 4, y: 2, capacityKg: 900 },
        ],
        standard: "",
        source: { title: "", reference: "", edition: "", url: "" },
      }),
    );
    expect(v.valid).toBe(false);
    expect(v.errors.join()).toMatch(/plusieurs valeurs y/);
    expect(v.warnings.join()).toMatch(/Source incomplète/);
    expect(v.warnings.join()).toMatch(/Norme/);
  });
});
