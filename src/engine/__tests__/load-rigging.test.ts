import { describe, expect, it } from "vitest";
import { kgToKN, kNToKg, totalLoad } from "../load";
import { brinsPorteurs, checkRigging, type Accessoire, type RiggingInput } from "../rigging";

describe("totalLoad", () => {
  it("somme charge + accessoires + moufle (+ fléchette + autres)", () => {
    const r = totalLoad({ chargeKg: 5000, accessoiresKg: [120, 80], moufleCrochetKg: 300, flechetteReplieeKg: 450, autresKg: 50 });
    expect(r.value).toBe(6000);
    expect(r.formula).toMatch(/fléchette repliée/);
    expect(r.formula).toMatch(/autres/);
    expect(r.inputs.accessoire_2.value).toBe(80);
    expect(r.warnings).toEqual([]);
  });

  it("sans optionnels", () => {
    const r = totalLoad({ chargeKg: 1000, accessoiresKg: [], moufleCrochetKg: 100 });
    expect(r.value).toBe(1100);
    expect(r.formula).not.toMatch(/fléchette/);
  });

  it("aucun arrondi interne", () => {
    expect(totalLoad({ chargeKg: 0.1, accessoiresKg: [0.2], moufleCrochetKg: 0 }).value).toBe(0.1 + 0.2);
  });

  it("donnée manquante ou invalide ⇒ null", () => {
    expect(totalLoad({ chargeKg: Number.NaN, accessoiresKg: [], moufleCrochetKg: 0 }).value).toBeNull();
    expect(totalLoad({ chargeKg: 10, accessoiresKg: [-1], moufleCrochetKg: 0 }).value).toBeNull();
    const r = totalLoad({ chargeKg: 10, accessoiresKg: undefined as unknown as number[], moufleCrochetKg: undefined as unknown as number });
    expect(r.value).toBeNull();
    expect(r.warnings.join()).toMatch(/Donnée manquante : Moufle/);
    expect(r.warnings.join()).toMatch(/accessoires/);
  });

  it("conversions kg ↔ kN (g = 9,81)", () => {
    expect(kgToKN(1000)).toBeCloseTo(9.81, 12);
    expect(kNToKg(9.81)).toBeCloseTo(1000, 9);
  });
});

const elingue = (cmu: number): Accessoire => ({
  id: "el",
  label: "Élingue chaîne",
  type: "elingue",
  cmuKg: cmu,
  sollicitation: "brin",
});

const base = (over: Partial<RiggingInput> = {}): RiggingInput => ({
  masseSousCrochetKg: 2000,
  nbBrins: 2,
  angleBetaDeg: 30,
  accessoires: [elingue(2000)],
  ...over,
});

describe("brinsPorteurs", () => {
  it("3 ou 4 brins ⇒ 2 porteurs sauf équilibrage", () => {
    expect(brinsPorteurs(1)).toBe(1);
    expect(brinsPorteurs(2)).toBe(2);
    expect(brinsPorteurs(3)).toBe(2);
    expect(brinsPorteurs(4)).toBe(2);
    expect(brinsPorteurs(4, true)).toBe(4);
  });
});

describe("checkRigging", () => {
  it("2 brins à 30° : T = W / (2 cos 30°)", () => {
    const r = checkRigging(base());
    expect(r.value.nbBrinsPorteurs).toBe(2);
    expect(r.value.effortParBrinKg).toBeCloseTo(2000 / (2 * Math.cos(Math.PI / 6)), 9);
    expect(r.issues).toEqual([]);
    expect(r.value.accessoires[0].conforme).toBe(true);
    expect(r.formula).toMatch(/cos β/);
  });

  it("4 brins sans équilibrage ⇒ 2 porteurs ; avec palonnier ⇒ 4", () => {
    const sans = checkRigging(base({ nbBrins: 4, angleBetaDeg: 0 }));
    expect(sans.value.effortParBrinKg).toBeCloseTo(1000, 9);
    expect(sans.warnings[0]).toMatch(/2 brins/);
    const avec = checkRigging(base({ nbBrins: 4, angleBetaDeg: 0, equilibrageDeclare: true }));
    expect(avec.value.effortParBrinKg).toBeCloseTo(500, 9);
    expect(avec.warnings).toEqual([]);
  });

  it("angles limites : 45° ok, >45° réserve, 60° réserve, >60° bloquant", () => {
    expect(checkRigging(base({ angleBetaDeg: 45, accessoires: [elingue(5000)] })).issues).toEqual([]);
    const r46 = checkRigging(base({ angleBetaDeg: 45.001, accessoires: [elingue(5000)] }));
    expect(r46.issues).toHaveLength(1);
    expect(r46.issues[0]).toMatchObject({ code: "ANGLE_ELINGAGE", severity: "reserve" });
    expect(checkRigging(base({ angleBetaDeg: 60, accessoires: [elingue(5000)] })).issues[0].severity).toBe("reserve");
    const r61 = checkRigging(base({ angleBetaDeg: 60.001, accessoires: [elingue(5000)] }));
    expect(r61.issues[0]).toMatchObject({ code: "ANGLE_ELINGAGE", severity: "bloquant" });
  });

  it("CMU (mode d'élingage utilisé) comparée à l'effort, sans facteur de mode", () => {
    // T à 0° = 1000 kg par brin
    const ok = checkRigging(base({ angleBetaDeg: 0, accessoires: [elingue(1000)] }));
    expect(ok.value.accessoires[0].cmuUtileKg).toBe(1000);
    expect(ok.value.accessoires[0].taux).toBeCloseTo(1, 12);
    expect(ok.issues).toEqual([]);
    const ko = checkRigging(base({ angleBetaDeg: 0, accessoires: [elingue(999)] }));
    expect(ko.issues[0]).toMatchObject({ code: "CMU_INSUFFISANTE", severity: "bloquant" });
  });

  it("sollicitation 'ensemble' comparée à la masse totale (palonnier, crochet)", () => {
    const pal: Accessoire = { id: "p", label: "Palonnier", type: "palonnier", cmuKg: 1999, sollicitation: "ensemble" };
    const r = checkRigging(base({ accessoires: [elingue(5000), pal] }));
    expect(r.value.accessoires[1].effortKg).toBe(2000);
    expect(r.issues.map((i) => i.code)).toEqual(["CMU_INSUFFISANTE"]);
  });

  it("données manquantes ⇒ bloquants", () => {
    const r = checkRigging({
      masseSousCrochetKg: Number.NaN,
      nbBrins: 2.5,
      angleBetaDeg: 90,
      accessoires: [],
    });
    expect(r.value.effortParBrinKg).toBeNull();
    expect(r.value.nbBrinsPorteurs).toBeNull();
    expect(r.issues.filter((i) => i.code === "DONNEE_MANQUANTE")).toHaveLength(4);

    const r2 = checkRigging(base({ accessoires: [elingue(0)] }));
    expect(r2.issues.filter((i) => i.code === "DONNEE_MANQUANTE")).toHaveLength(1);
    expect(r2.value.accessoires[0].conforme).toBe(false);
    expect(r2.inputs.cmu_el.value).toBe("invalide");

    const r3 = checkRigging(base({ masseSousCrochetKg: -1, accessoires: [{ ...elingue(1000), sollicitation: "ensemble" }] }));
    expect(r3.value.accessoires[0].effortKg).toBeNull();
  });
});

describe("totalLoad — coefficient de marge", () => {
  const base = { chargeKg: 1000, accessoiresKg: [50], moufleCrochetKg: 100 };
  it("absent ⇒ 1 (sans marge)", () => {
    expect(totalLoad(base).value).toBe(1150);
  });
  it("majore la seule masse de la charge", () => {
    const r = totalLoad({ ...base, coefMarge: 1.2 });
    expect(r.value).toBeCloseTo(1350, 9);
    expect(r.inputs.coef_marge.value).toBe(1.2);
    expect(r.inputs.charge_brute.value).toBe(1000);
    expect(r.formula).toContain("coef. de marge");
  });
  it("coefficient < 1 ou invalide ⇒ résultat invalide", () => {
    expect(totalLoad({ ...base, coefMarge: 0.9 }).value).toBeNull();
    expect(totalLoad({ ...base, coefMarge: Number.NaN }).value).toBeNull();
  });
});
