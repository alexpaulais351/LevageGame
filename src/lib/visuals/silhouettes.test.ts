import { describe, expect, it } from "vitest";

import {
  TYPES_MACHINE,
  cinematiquePelle,
  formesCrochet,
  projeter,
  silhouetteElevation,
  silhouettePlan,
  silhouetteVignette,
  typeMachineDepuis,
  type Forme,
} from "./silhouettes";

const fini = (formes: readonly Forme[]) =>
  formes.every((f) =>
    f.k === "poly" ? f.pts.every((p) => p.every(Number.isFinite)) : f.k === "circle" ? [f.cx, f.cy, f.r].every(Number.isFinite) : [f.x1, f.y1, f.x2, f.y2].every(Number.isFinite),
  );

describe("silhouettes — élévation", () => {
  for (const type of TYPES_MACHINE) {
    it(`${type} : au moins une primitive, aucune valeur non finie, tête = cible en x`, () => {
      for (const tete of [{ x: 0, y: 0 }, { x: 3, y: 5 }, { x: 12, y: 18 }, { x: 40, y: 30 }]) {
        const s = silhouetteElevation({ type, tete });
        expect(s.formes.length).toBeGreaterThan(0);
        expect(fini(s.formes)).toBe(true);
        expect(Number.isFinite(s.angleDeg)).toBe(true);
        expect(Number.isFinite(s.longueurFlecheM)).toBe(true);
        expect(s.bornes.maxX).toBeGreaterThan(s.bornes.minX);
        expect(s.tete[0]).toBeCloseTo(tete.x, 6);
      }
    });
    it(`${type} : stabilisateurs sortis / rentrés sans erreur`, () => {
      for (const stabilisateurs of ["sortis", "rentres"] as const) {
        expect(fini(silhouetteElevation({ type, stabilisateurs, tete: { x: 6, y: 9 } }).formes)).toBe(true);
      }
    });
  }

  it("flèche de grue mobile : pied → tête cohérent avec la cible (angle, longueur)", () => {
    const s = silhouetteElevation({ type: "grue_mobile", tete: { x: 8, y: 2.9 + 8 } });
    expect(s.pied).toEqual([0, 2.9]);
    expect(s.longueurFlecheM).toBeCloseTo(Math.hypot(8, 8), 6);
    expect(s.angleDeg).toBeCloseTo(45, 6);
  });

  it("dimensions connues utilisées, défauts signalés « indicatif »", () => {
    const defaut = silhouetteElevation({ type: "grue_mobile", tete: { x: 5, y: 10 } });
    expect(defaut.indicatif).toContain("hauteur du pied de flèche");
    const connu = silhouetteElevation({ type: "grue_mobile", tete: { x: 5, y: 10 }, dims: { hauteurPiedM: 3.2, longueurPorteurM: 11, largeurPorteurM: 2.8, calage: { longueurM: 6, largeurM: 7 } } });
    expect(connu.pied[1]).toBe(3.2);
    expect(connu.indicatif).toEqual([]);
  });

  it("entrées non finies : pas de NaN", () => {
    const s = silhouetteElevation({ type: "pelle_chenilles", tete: { x: NaN, y: Infinity } });
    expect(fini(s.formes)).toBe(true);
  });

  it("stabilisateurs sortis ajoutent des formes (grue mobile)", () => {
    const a = silhouetteElevation({ type: "grue_mobile", stabilisateurs: "sortis", tete: { x: 6, y: 10 } });
    const b = silhouetteElevation({ type: "grue_mobile", stabilisateurs: "rentres", tete: { x: 6, y: 10 } });
    expect(a.formes.length).toBeGreaterThan(b.formes.length);
  });

  it("pelle : la tête du balancier atteint le point de charge (échelle si hors portée)", () => {
    for (const t of [{ x: 4, y: 3 }, { x: 12, y: 3 }, { x: 0.5, y: 2 }]) {
      const s = silhouetteElevation({ type: "pelle_chenilles", tete: t });
      expect(s.tete[0]).toBeCloseTo(t.x, 6);
    }
    const c = cinematiquePelle([0, 2], [10, 5], 5.7, 2.9);
    expect(Math.hypot(c.coude[0], c.coude[1] - 2)).toBeCloseTo(c.l1, 6);
    expect(Math.hypot(10 - c.coude[0], 5 - c.coude[1])).toBeCloseTo(c.l2, 6);
    expect(c.k).toBeGreaterThan(1);
    const proche = cinematiquePelle([0, 2], [4, 3], 5.7, 2.9);
    expect(proche.k).toBe(1);
    expect(Math.hypot(proche.coude[0], proche.coude[1] - 2)).toBeCloseTo(5.7, 6);
  });

  it("chariot élévateur et grue à tour : points d'attache attendus", () => {
    expect(silhouetteElevation({ type: "chariot_elevateur", tete: { x: 1, y: 1.5 } }).sansCable).toBe(true);
    const tour = silhouetteElevation({ type: "grue_tour", tete: { x: 20, y: 25 } });
    expect(tour.tete[0]).toBe(20);
    expect(tour.tete[1]).toBeLessThanOrEqual(25);
  });

  it("accessoire fourches ajoute des formes (télescopique)", () => {
    const a = silhouetteElevation({ type: "telescopique_fixe", tete: { x: 5, y: 8 }, accessoire: "fourches" });
    const b = silhouetteElevation({ type: "telescopique_fixe", tete: { x: 5, y: 8 }, accessoire: "crochet" });
    expect(a.formes.length).toBeGreaterThan(b.formes.length);
  });
});

describe("silhouettes — plan", () => {
  for (const type of TYPES_MACHINE) {
    it(`${type} : primitives finies pour tous les azimuts`, () => {
      for (const azimutDeg of [-90, 0, 45, 180, 359]) {
        const s = silhouettePlan({ type, azimutDeg, porteeM: 10 });
        expect(s.formes.length).toBeGreaterThan(0);
        expect(fini(s.formes)).toBe(true);
        expect(fini(silhouettePlan({ type, azimutDeg, porteeM: null }).formes)).toBe(true);
      }
    });
  }
  it("la flèche suit l'azimut (grue mobile, 90° = vers la droite)", () => {
    const s = silhouettePlan({ type: "grue_mobile", azimutDeg: 90, porteeM: 12 });
    expect(s.bornes.maxX).toBeGreaterThan(11);
  });
  it("emprise des stabilisateurs = dimensions de calage connues", () => {
    const s = silhouettePlan({ type: "grue_mobile", azimutDeg: 0, porteeM: 5, dims: { calage: { longueurM: 6, largeurM: 8 } }, stabilisateurs: "sortis" });
    expect(s.emprise).toEqual({ minX: -4, maxX: 4, minY: -3, maxY: 3 });
    expect(s.indicatif).not.toContain("emprise des stabilisateurs");
  });
});

describe("utilitaires", () => {
  it("typeMachineDepuis : code puis libellé", () => {
    expect(typeMachineDepuis("pelle_pneus")).toBe("pelle_pneus");
    expect(typeMachineDepuis("grue", "Grue mobile sur chenilles")).toBe("grue_mobile_chenilles");
    expect(typeMachineDepuis(null, "Chariot télescopique rotatif")).toBe("telescopique_rotatif");
    expect(typeMachineDepuis(null, "Pelle rail-route")).toBe("pelle_rail_route");
    expect(typeMachineDepuis(null, "Grue à tour")).toBe("grue_tour");
    expect(typeMachineDepuis(null, "Chariot élévateur")).toBe("chariot_elevateur");
    expect(typeMachineDepuis(null, "Grue auxiliaire (camion-bras)")).toBe("grue_auxiliaire");
    expect(typeMachineDepuis(null, "Truc")).toBeNull();
    expect(typeMachineDepuis(null, null)).toBeNull();
  });
  it("projeter : échelle et inversion de l'axe y", () => {
    const [f] = projeter([{ k: "line", x1: 0, y1: 1, x2: 2, y2: 3, stroke: "#000", w: 1 }], { ox: 10, oy: 100, s: 10, flipY: true });
    expect(f).toMatchObject({ x1: 10, y1: 90, x2: 30, y2: 70 });
  });
  it("moufle et vignettes", () => {
    expect(formesCrochet(3, 5).length).toBeGreaterThan(0);
    for (const t of TYPES_MACHINE) expect(silhouetteVignette(t).formes.length).toBeGreaterThan(0);
  });
});
