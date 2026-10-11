import { describe, expect, it } from "vitest";

import type { LoadChart } from "@/engine";

import {
  aimanter,
  angleFlecheDeg,
  appliquer,
  borner,
  domaineDeplacement,
  domaineGlobal,
  ecartAngulaire,
  graduations,
  hauteurTeteM,
  inverser,
  lignesAbaque,
  lignesActives,
  pointeurVersPortee,
  polaire,
  tracerEscalier,
} from "./geometry";

const chart = (points: LoadChart["points"], axisY: LoadChart["axisY"] = "boom_length_m"): LoadChart => ({
  id: "t",
  axisX: "radius_m",
  axisY,
  points,
  interpolationAllowed: false,
  status: "a_verifier",
  standard: "",
  source: { title: "", reference: "", edition: "", url: "" },
  deductionsIncluded: false,
});

const C = chart([
  { x: 3, y: 10, capacityKg: 8000 },
  { x: 5, y: 10, capacityKg: 6000 },
  { x: 8, y: 10, capacityKg: 3000 },
  { x: 4, y: 20, capacityKg: 5000 },
  { x: 12, y: 20, capacityKg: 1500 },
]);

describe("échelles", () => {
  const e = { d0: 0, d1: 10, r0: 100, r1: 300 };
  it("applique et inverse", () => {
    expect(appliquer(e, 5)).toBe(200);
    expect(inverser(e, 250)).toBe(7.5);
    expect(appliquer({ d0: 2, d1: 2, r0: 0, r1: 10 }, 2)).toBe(5);
  });
  it("graduations rondes", () => {
    expect(graduations(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(graduations(3, 12, 6)).toEqual([4, 6, 8, 10, 12]);
    expect(graduations(0, 0)).toEqual([0]);
  });
});

describe("escalier", () => {
  const l = lignesAbaque(C);
  it("groupe par ligne et trie", () => {
    expect(l.map((x) => x.y)).toEqual([10, 20]);
    expect(l[0].noeuds.map((n) => n.x)).toEqual([3, 5, 8]);
  });
  it("palier = min des deux nœuds, valeur de nœud conservée, pas de prolongement", () => {
    const [ch] = tracerEscalier(l[0].noeuds, false);
    expect(ch).toEqual([
      { x: 3, c: 8000 },
      { x: 3, c: 6000 },
      { x: 5, c: 6000 },
      { x: 5, c: 3000 },
      { x: 8, c: 3000 },
    ]);
    expect(Math.min(...ch.map((p) => p.x))).toBe(3);
    expect(Math.max(...ch.map((p) => p.x))).toBe(8);
  });
  it("capacité croissante : palier au min à gauche, remontée au nœud", () => {
    const [ch] = tracerEscalier(
      [
        { x: 1, capacityKg: 10 },
        { x: 2, capacityKg: 20 },
      ],
      false,
    );
    expect(ch).toEqual([
      { x: 1, c: 10 },
      { x: 2, c: 10 },
      { x: 2, c: 20 },
    ]);
  });
  it("cellule vide coupe le tracé", () => {
    const ch = tracerEscalier(
      [
        { x: 1, capacityKg: 10 },
        { x: 2, capacityKg: null },
        { x: 3, capacityKg: 5 },
      ],
      false,
    );
    expect(ch).toEqual([[{ x: 1, c: 10 }], [{ x: 3, c: 5 }]]);
  });
  it("interpolation autorisée : segments droits", () => {
    const [ch] = tracerEscalier(l[0].noeuds, true);
    expect(ch).toHaveLength(3);
  });
});

describe("lignes actives et domaine", () => {
  const l = lignesAbaque(C);
  it("ligne exacte, encadrantes, hors grille", () => {
    expect(lignesActives(l, 20)).toEqual([1]);
    expect(lignesActives(l, 15)).toEqual([0, 1]);
    expect(lignesActives(l, 30)).toEqual([]);
    expect(lignesActives(lignesAbaque(chart([{ x: 1, y: null, capacityKg: 1 }], "none")), null)).toEqual([0]);
  });
  it("domaine par ligne, intersection entre lignes, global sans Y", () => {
    expect(domaineGlobal(l)).toEqual({ min: 3, max: 12 });
    expect(domaineDeplacement(l, 10)).toEqual({ min: 3, max: 8 });
    expect(domaineDeplacement(l, 15)).toEqual({ min: 4, max: 8 });
    expect(domaineDeplacement(l, null)).toEqual({ min: 3, max: 12 });
    expect(domaineGlobal([])).toBeNull();
  });
});

describe("pointeur → portée", () => {
  const base = { rectLeft: 100, rectWidth: 500, viewBoxWidth: 1000, xPivotSvg: 200, echelle: 50, domaine: { min: 3, max: 8 } };
  it("convertit px → m", () => {
    // clientX 350 → xSvg 500 → (500-200)/50 = 6 m
    expect(pointeurVersPortee({ ...base, clientX: 350, pas: null })).toBe(6);
  });
  it("borne au domaine", () => {
    expect(pointeurVersPortee({ ...base, clientX: 0, pas: null })).toBe(3);
    expect(pointeurVersPortee({ ...base, clientX: 5000, pas: null })).toBe(8);
  });
  it("snap 0,1 m", () => {
    expect(pointeurVersPortee({ ...base, clientX: 353.4, pas: 0.1 })).toBeCloseTo(6.1, 5);
  });
  it("largeur nulle : plancher du domaine", () => {
    expect(pointeurVersPortee({ ...base, rectWidth: 0, clientX: 10, pas: null })).toBe(3);
  });
  it("aimanter reste dans le domaine", () => {
    expect(aimanter(3.04, 0.5, { min: 3.1, max: 8 })).toBe(3.5);
    expect(aimanter(7.99, 0.5, { min: 3, max: 7.8 })).toBe(7.5);
    expect(borner(9, { min: 3, max: 8 })).toBe(8);
  });
});

describe("géométrie de flèche et plan", () => {
  it("angle et hauteur de tête", () => {
    expect(angleFlecheDeg(5, 10)).toBeCloseTo(60, 6);
    expect(hauteurTeteM(6, 10)).toBeCloseTo(8, 9);
    expect(angleFlecheDeg(11, 10)).toBeNull();
    expect(angleFlecheDeg(5, null)).toBeNull();
    expect(angleFlecheDeg(null, 10)).toBeNull();
  });
  it("polaire : 0° vers le haut, 90° vers la droite", () => {
    const a = polaire(0, 10);
    const b = polaire(90, 10);
    expect(a.x).toBeCloseTo(0, 9);
    expect(a.y).toBeCloseTo(-10, 9);
    expect(b.x).toBeCloseTo(10, 9);
    expect(ecartAngulaire(350, 10)).toBe(20);
    expect(ecartAngulaire(10, 350)).toBe(-20);
  });
});
