import { describe, expect, it } from "vitest";

import { KN_PAR_TONNE, kNToT, kgToT, msToKmh, nombreVersTexte, parseNombreFR, tToKN, tToKg, ventEnMs } from "./units";

describe("conversions d'unités", () => {
  it("convertit kg ↔ t sans artefact flottant", () => {
    expect(tToKg(1.2)).toBe(1200);
    expect(tToKg(0.0123)).toBe(12.3);
    expect(kgToT(2500)).toBe(2.5);
  });
  it("convertit kN ↔ t avec g = 9,81", () => {
    expect(KN_PAR_TONNE).toBeCloseTo(9.81, 9);
    expect(tToKN(2)).toBeCloseTo(19.62, 9);
    expect(kNToT(19.62)).toBeCloseTo(2, 9);
  });
  it("convertit le vent en m/s", () => {
    expect(ventEnMs(10, "ms")).toBe(10);
    expect(ventEnMs(36, "kmh")).toBeCloseTo(10, 9);
    expect(msToKmh(10)).toBeCloseTo(36, 9);
  });
});

describe("saisie de nombres à la française", () => {
  it("lit virgule, point, espaces", () => {
    expect(parseNombreFR("12,5")).toBe(12.5);
    expect(parseNombreFR("1 200")).toBe(1200);
    expect(parseNombreFR("1.5")).toBe(1.5);
    expect(parseNombreFR(" 0 ")).toBe(0);
  });
  it("retourne null si vide et NaN si invalide", () => {
    expect(parseNombreFR("")).toBeNull();
    expect(parseNombreFR("  ")).toBeNull();
    expect(parseNombreFR("abc")).toBeNaN();
    expect(parseNombreFR("1,2,3")).toBeNaN();
  });
  it("reformate pour le champ de saisie", () => {
    expect(nombreVersTexte(12.5)).toBe("12,5");
    expect(nombreVersTexte(null)).toBe("");
    expect(nombreVersTexte(3)).toBe("3");
  });
});
