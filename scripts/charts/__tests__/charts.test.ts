import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseChartCsv } from "../../../src/lib/charts/csv";
import { loadMachineDir, readSeedRefs } from "../load";
import { machineSchema } from "../../../src/lib/charts/schema";
import { generateSql } from "../sql";

const EX = path.resolve(__dirname, "../../../data/charts/_exemple-fictif");

describe("parseChartCsv", () => {
  it("lit les valeurs, cellule vide = null, t -> kg", () => {
    const r = parseChartCsv("radius_m,y,capacity\n3,10,1.5\n4,10,\n", "boom_length_m", "t");
    expect(r.errors).toEqual([]);
    expect(r.points).toEqual([
      { x: 3, y: 10, capacityKg: 1500 },
      { x: 4, y: 10, capacityKg: null },
    ]);
  });
  it("refuse en-tête, virgule décimale, y != 0 si none, NaN", () => {
    expect(parseChartCsv("a,b,c\n", "none", "kg").errors).toHaveLength(1);
    expect(parseChartCsv("radius_m,y,capacity\n3,0,1,5\n", "none", "kg").errors[0]).toMatch(/3 colonnes/);
    expect(parseChartCsv("radius_m,y,capacity\n3,5,100\n", "none", "kg").errors[0]).toMatch(/y doit valoir 0/);
    expect(parseChartCsv("radius_m,y,capacity\n3,0,abc\n", "none", "kg").errors[0]).toMatch(/illisible/);
  });
});

describe("machineSchema", () => {
  const base = JSON.parse(readFileSync(path.join(EX, "machine.json"), "utf8"));
  it("accepte l'exemple", () => expect(machineSchema.safeParse(base).success).toBe(true));
  it("refuse status verifie, champ inconnu, slug en double", () => {
    expect(machineSchema.safeParse({ ...base, status: "verifie" }).success).toBe(false);
    expect(machineSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
    const dup = { ...base, configurations: [base.configurations[0], base.configurations[0]] };
    expect(machineSchema.safeParse(dup).success).toBe(false);
  });
});

describe("exemple fictif", () => {
  const refs = readSeedRefs();
  const rep = loadMachineDir(EX, refs);
  it("est valide avec avertissements", () => {
    expect(rep.errors).toEqual([]);
    expect(rep.configs.every((c) => c.errors.length === 0)).toBe(true);
    expect(rep.configs[0].warnings.some((w) => /cellule vide/.test(w))).toBe(true);
  });
  it("convertit les tonnes en kg", () => {
    expect(rep.configs[1].chart!.points[0].capacityKg).toBe(5500);
  });
  it("seed contient Liebherr et grue_mobile", () => {
    expect(refs?.manufacturers.has("liebherr")).toBe(true);
    expect(refs?.typeCodes.has("grue_mobile")).toBe(true);
  });
  it("charts:sql ignore les dossiers _", () => {
    const g = generateSql([rep]);
    expect(g.machines).toBe(0);
    expect(g.sql).not.toMatch(/FICTIF/);
  });
  it("le SQL d'une machine force a_verifier et owner NULL", () => {
    const sql = generateSql([{ ...rep, dir: "x-y" }]).sql;
    expect(sql).toMatch(/'a_verifier'/);
    expect(sql).toMatch(/owner_id, document_title/);
    expect(sql).not.toMatch(/'verifie'/);
  });
});
