import { describe, expect, it } from "vitest";
import { cn, formatDateFR, formatMasse, formatNombreFR, hexToRgb } from "./utils";

const NNBSP = " ";

describe("cn", () => {
  it("fusionne et déduplique les classes Tailwind", () => {
    expect(cn("p-2", false && "x", "p-4")).toBe("p-4");
  });
});

describe("formatNombreFR", () => {
  it("formate avec virgule et séparateur de milliers", () => {
    expect(formatNombreFR(1234.5)).toBe(`1${NNBSP}234,50`);
    expect(formatNombreFR(1234567.891, 1)).toBe(`1${NNBSP}234${NNBSP}567,9`);
  });
  it("gère 0 décimale, négatifs et petits nombres", () => {
    expect(formatNombreFR(12, 0)).toBe("12");
    expect(formatNombreFR(-1234.5)).toBe(`-1${NNBSP}234,50`);
    expect(formatNombreFR(0.5)).toBe("0,50");
    expect(formatNombreFR(-0.001)).toBe("0,00");
  });
  it("renvoie une chaîne vide pour une valeur non finie", () => {
    expect(formatNombreFR(NaN)).toBe("");
  });
});

describe("formatMasse", () => {
  it("affiche en kg sous 1000", () => {
    expect(formatMasse(850)).toBe("850 kg");
    expect(formatMasse(999.5)).toBe(`999,50 kg`);
  });
  it("affiche en tonnes dès 1000 kg", () => {
    expect(formatMasse(1250)).toBe("1,25 t");
    expect(formatMasse(1000)).toBe("1 t");
    expect(formatMasse(12500)).toBe(`12,50 t`);
  });
});

describe("formatDateFR", () => {
  it("formate JJ/MM/AAAA", () => {
    expect(formatDateFR(new Date(2026, 3, 1))).toBe("01/04/2026");
  });
  it("renvoie vide si invalide", () => {
    expect(formatDateFR("n'importe quoi")).toBe("");
  });
});

describe("hexToRgb", () => {
  it("convertit un hex", () => {
    expect(hexToRgb("#004489")).toEqual({ r: 0, g: 68, b: 137 });
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
  });
  it("renvoie null si invalide", () => {
    expect(hexToRgb("zzz")).toBeNull();
  });
});
