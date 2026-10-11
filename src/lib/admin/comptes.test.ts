import { describe, expect, it } from "vitest";

import { decisionSchema, decisionsPossibles, DECISION_STATUT } from "./comptes";

describe("décisions de l'administrateur", () => {
  it("actions proposées selon le statut", () => {
    expect(decisionsPossibles("en_attente")).toEqual(["accepter", "refuser"]);
    expect(decisionsPossibles("approuve")).toEqual(["suspendre"]);
    expect(decisionsPossibles("suspendu")).toEqual(["reactiver"]);
    expect(decisionsPossibles("refuse")).toEqual(["accepter"]);
  });
  it("aucune décision ne ramène à « en attente »", () => {
    expect(Object.values(DECISION_STATUT)).not.toContain("en_attente");
  });
  it("schéma : identifiant et décision validés", () => {
    expect(decisionSchema.safeParse({ userId: "x", decision: "accepter" }).success).toBe(false);
    expect(decisionSchema.safeParse({ userId: "7c9e6679-7425-40de-944b-e07fc1f90ae7", decision: "promouvoir" }).success).toBe(false);
    expect(decisionSchema.safeParse({ userId: "7c9e6679-7425-40de-944b-e07fc1f90ae7", decision: "suspendre" }).success).toBe(true);
  });
});
