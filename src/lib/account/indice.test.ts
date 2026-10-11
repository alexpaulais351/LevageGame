import { describe, expect, it } from "vitest";

import { indiceDepuisNumero, indiceSuivant, numeroDepuisIndice } from "./indice";

describe("indices de version", () => {
  it("numérote A, B, C…", () => {
    expect([1, 2, 3, 26].map(indiceDepuisNumero)).toEqual(["A", "B", "C", "Z"]);
  });
  it("continue après Z : AA, AB… AZ, BA", () => {
    expect([27, 28, 52, 53, 702, 703].map(indiceDepuisNumero)).toEqual(["AA", "AB", "AZ", "BA", "ZZ", "AAA"]);
  });
  it("est réversible", () => {
    for (let n = 1; n <= 1500; n++) expect(numeroDepuisIndice(indiceDepuisNumero(n))).toBe(n);
  });
  it("incrémente l'indice", () => {
    expect(indiceSuivant(null)).toBe("A");
    expect(indiceSuivant("A")).toBe("B");
    expect(indiceSuivant("Z")).toBe("AA");
    expect(indiceSuivant("AZ")).toBe("BA");
    expect(indiceSuivant("ZZ")).toBe("AAA");
  });
  it("refuse les valeurs invalides", () => {
    expect(() => indiceDepuisNumero(0)).toThrow();
    expect(() => indiceDepuisNumero(1.5)).toThrow();
    expect(() => indiceSuivant("a1")).toThrow();
    expect(numeroDepuisIndice("")).toBeNull();
    expect(numeroDepuisIndice("a")).toBeNull();
  });
});
