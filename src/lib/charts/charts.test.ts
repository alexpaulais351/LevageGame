import { describe, expect, it } from "vitest";

import { classerAvertissements, construireAbaque, type AbaqueSaisi } from "./build";
import { parseChartCsv } from "./csv";
import { grilleVersCsv, grilleVersPoints, LIGNE_VIDE, pointsVersGrille } from "./grid";
import { analyserAbaque } from "./validate";

const SRC = { title: "Tableau de charges FICTIF", reference: "FICTIF-001", edition: null, url: null };
const base: AbaqueSaisi = {
  mode: "csv",
  csv: "",
  grille: [],
  axisY: "boom_length_m",
  unit: "t",
  standard: "EN 13000",
  deductionsIncluded: false,
  interpolationAllowed: false,
};

describe("grille → points (mêmes règles que le CSV)", () => {
  it("convertit virgule décimale, ignore les lignes vides, t → kg", () => {
    const r = grilleVersPoints(
      [
        { radius: "3", y: "10", capacity: "1,5" },
        { ...LIGNE_VIDE },
        { radius: "4,5", y: "10", capacity: "" },
      ],
      "boom_length_m",
      "t",
    );
    expect(r.errors).toEqual([]);
    expect(r.points).toEqual([
      { x: 3, y: 10, capacityKg: 1500 },
      { x: 4.5, y: 10, capacityKg: null },
    ]);
  });
  it("axe 'none' : y forcé à 0 puis null", () => {
    const r = grilleVersPoints([{ radius: "3", y: "", capacity: "100" }], "none", "kg");
    expect(r.errors).toEqual([]);
    expect(r.points).toEqual([{ x: 3, y: null, capacityKg: 100 }]);
  });
  it("erreurs avec numéro de ligne de grille, y obligatoire, jamais de valeur devinée", () => {
    const r = grilleVersPoints(
      [
        { radius: "3", y: "10", capacity: "abc" },
        { radius: "", y: "10", capacity: "5" },
        { radius: "5", y: "", capacity: "5" },
      ],
      "boom_length_m",
      "kg",
    );
    expect(r.errors.join("|")).toMatch(/ligne 1 : capacity illisible/);
    expect(r.errors.join("|")).toMatch(/ligne 2 : radius_m illisible/);
    expect(r.errors.join("|")).toMatch(/ligne 3/);
  });
  it("grille vide : aucun point, aucune erreur (l'erreur « grille vide » vient de la validation)", () => {
    expect(grilleVersPoints([{ ...LIGNE_VIDE }], "none", "kg")).toEqual({ points: [], errors: [] });
  });
  it("sérialise en CSV canonique relu à l'identique par parseChartCsv", () => {
    const g = [{ radius: "3", y: "10", capacity: "12,5" }];
    const csv = grilleVersCsv(g, "boom_length_m");
    expect(csv).toBe("radius_m,y,capacity\n3,10,12.5");
    expect(parseChartCsv(csv, "boom_length_m", "kg").points).toEqual(grilleVersPoints(g, "boom_length_m", "kg").points);
  });
  it("points → grille (aller-retour)", () => {
    const pts = [{ x: 3, y: 10, capacityKg: 1500 }, { x: 4.5, y: 10, capacityKg: null }];
    expect(pointsVersGrille(pts, "t")).toEqual([
      { radius: "3", y: "10", capacity: "1,5" },
      { radius: "4,5", y: "10", capacity: "" },
    ]);
  });
});

describe("construireAbaque (aperçu client = validation serveur)", () => {
  it("CSV valide : pas d'erreur, abaque a_verifier, avertissements classés", () => {
    const csv = "radius_m,y,capacity\n3,10,5\n4,10,\n5,10,6\n";
    const r = construireAbaque({ ...base, csv }, SRC);
    expect(r.errors).toEqual([]);
    expect(r.chart.status).toBe("a_verifier");
    expect(r.chart.points).toHaveLength(3);
    const w = classerAvertissements(r.warnings);
    expect(w.cellulesVides).toHaveLength(1);
    expect(w.capaciteCroissante).toHaveLength(1); // 5 t à 3 m → 6 t à 5 m (la cellule vide est sautée)
    expect(w.autres).toEqual([]);
  });
  it("erreurs bloquantes : doublon, en-tête, précision non stockable", () => {
    expect(construireAbaque({ ...base, csv: "x,y,z\n" }, SRC).errors[0]).toMatch(/en-tête/);
    expect(construireAbaque({ ...base, csv: "radius_m,y,capacity\n3,10,5\n3,10,4\n" }, SRC).errors.join()).toMatch(/doublon/);
    expect(construireAbaque({ ...base, unit: "kg", csv: "radius_m,y,capacity\n3.123,10,5\n" }, SRC).errors.join()).toMatch(/2 décimales/);
    expect(construireAbaque({ ...base, unit: "kg", csv: "radius_m,y,capacity\n3,10,5.55\n" }, SRC).errors.join()).toMatch(/1 décimale/);
  });
  it("CSV vide / grille vide : Grille vide (bloquant)", () => {
    expect(construireAbaque(base, SRC).errors.length).toBeGreaterThan(0);
    expect(construireAbaque({ ...base, mode: "grille", grille: [{ ...LIGNE_VIDE }] }, SRC).errors.join()).toMatch(/Grille vide/);
  });
  it("source incomplète et norme absente : simples avertissements", () => {
    const r = construireAbaque({ ...base, standard: null, csv: "radius_m,y,capacity\n3,10,5\n" }, { ...SRC, reference: null });
    expect(r.errors).toEqual([]);
    expect(classerAvertissements(r.warnings).autres.join()).toMatch(/Source incomplète|Norme/);
  });
  it("mode grille équivalent au mode csv", () => {
    const a = construireAbaque({ ...base, csv: "radius_m,y,capacity\n3,10,5\n4,10,4\n" }, SRC);
    const b = construireAbaque({ ...base, mode: "grille", grille: [{ radius: "3", y: "10", capacity: "5" }, { radius: "4", y: "10", capacity: "4" }] }, SRC);
    expect(b.chart.points).toEqual(a.chart.points);
    expect(b.errors).toEqual(a.errors);
  });
});

describe("analyserAbaque", () => {
  it("conserve les erreurs amont", () => {
    const r = analyserAbaque(
      { id: "x", points: [{ x: 1, y: null, capacityKg: 10 }], axisY: "none", interpolationAllowed: false, standard: "EN 13000", deductionsIncluded: false, source: SRC },
      ["erreur amont"],
    );
    expect(r.errors).toEqual(["erreur amont"]);
  });
});
