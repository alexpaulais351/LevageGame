import { describe, expect, it } from "vitest";

import { formatCalcValue, formatNombreAuto, formatTaux } from "./format";

describe("formatage des valeurs de calcul", () => {
  it("n'ajoute que les décimales utiles", () => {
    expect(formatNombreAuto(5)).toBe("5");
    expect(formatNombreAuto(5.5)).toBe("5,5");
    expect(formatNombreAuto(1234.567)).toBe("1\u202f234,567");
  });
  it("affiche les masses en t dès 1000 kg", () => {
    expect(formatCalcValue({ value: 800, unit: "kg", label: "" })).toBe("800 kg");
    expect(formatCalcValue({ value: 2500, unit: "kg", label: "" })).toBe("2,50 t");
    expect(formatCalcValue({ value: 12.5, unit: "m", label: "" })).toBe("12,5 m");
    expect(formatCalcValue({ value: "oui", unit: "", label: "" })).toBe("oui");
  });
  it("formate un taux", () => {
    expect(formatTaux(0.853)).toBe("85,3 %");
    expect(formatTaux(null)).toBe("—");
    expect(formatTaux(Number.POSITIVE_INFINITY)).toBe("> 100 %");
  });
});
