import { describe, expect, it } from "vitest";

import { cheminInterne } from "./result";

describe("cheminInterne (paramètre `suivant`, anti open redirect)", () => {
  it("accepte un chemin interne et conserve la requête", () => {
    expect(cheminInterne("/admin/comptes/7c9e6679-7425-40de-944b-e07fc1f90ae7")).toBe("/admin/comptes/7c9e6679-7425-40de-944b-e07fc1f90ae7");
    expect(cheminInterne("/projets?x=1#a")).toBe("/projets?x=1#a");
  });
  it("refuse tout ce qui peut sortir du domaine", () => {
    for (const v of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      " /projets",
      "javascript:alert(1)",
      "projets",
      "",
      null,
      42,
    ]) {
      expect(cheminInterne(v)).toBe("/");
    }
  });
  it("valeur par défaut paramétrable", () => {
    expect(cheminInterne("//x", "/projets")).toBe("/projets");
  });
});
