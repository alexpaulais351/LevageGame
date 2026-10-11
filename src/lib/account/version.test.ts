import { describe, expect, it } from "vitest";

import { createInitialData } from "@/lib/study/defaults";
import { computeStudy } from "@/lib/study/compute";

import {
  appliquerSeuilsUtilisateur,
  donneesDepuisVersion,
  donneesInitiales,
  jsonStable,
  libelleVersion,
  payloadVersion,
  verdictDepuisResultat,
} from "./version";

describe("mapping store ↔ version", () => {
  it("aller-retour : data de la version = état du store", () => {
    const d = createInitialData();
    d.operation.projet = "Pont de Tancarville";
    d.charge.masseKg = 1250.5;
    const p = payloadVersion(d);
    expect(jsonStable(donneesDepuisVersion(p.data))).toBe(jsonStable(d));
  });
  it("result est du JSON pur (NaN / Infinity → null) et porte le verdict du moteur", () => {
    const d = createInitialData();
    const p = payloadVersion(d, computeStudy(d));
    expect(() => JSON.stringify(p.result)).not.toThrow();
    expect(JSON.stringify(p.result)).not.toMatch(/NaN|Infinity/);
    expect(verdictDepuisResultat(p.result)).toBe("NON_ADEQUAT"); // données manquantes → jamais adéquat
  });
  it("complète une sauvegarde ancienne avec les défauts", () => {
    const ancien = { operation: { projet: "X" } };
    const d = donneesDepuisVersion(ancien);
    expect(d.operation.projet).toBe("X");
    expect(d.operation.lieu).toBe("");
    expect(d.seuils).toEqual({ vertPct: 80, orangePct: 100 });
    expect(donneesDepuisVersion(null).accessoires.liste).toEqual([]);
    expect(donneesDepuisVersion([1, 2]).geometrie.positions).toHaveLength(3);
  });
  it("version stockée avant D29 : réserve « abaque à vérifier » seule ignorée à l'affichage", () => {
    const res = (reserves: { code: string }[], bloquants: { code: string }[] = []) => ({
      verdict: { value: { verdict: "ADEQUAT_AVEC_RESERVES", reserves, bloquants } },
    });
    expect(verdictDepuisResultat(res([{ code: "ABAQUE_A_VERIFIER" }]))).toBe("ADEQUAT");
    expect(verdictDepuisResultat(res([{ code: "ABAQUE_A_VERIFIER" }, { code: "ZONE_ORANGE" }]))).toBe("ADEQUAT_AVEC_RESERVES");
    expect(verdictDepuisResultat(res([{ code: "ZONE_ORANGE" }]))).toBe("ADEQUAT_AVEC_RESERVES");
    expect(verdictDepuisResultat({ verdict: { value: { verdict: "ADEQUAT_AVEC_RESERVES" } } })).toBe("ADEQUAT_AVEC_RESERVES");
    expect(verdictDepuisResultat({ verdict: { value: { verdict: "NON_ADEQUAT", reserves: [{ code: "ABAQUE_A_VERIFIER" }], bloquants: [{ code: "HORS_ABAQUE" }] } } })).toBe("NON_ADEQUAT");
  });
  it("verdict illisible → null", () => {
    expect(verdictDepuisResultat(null)).toBeNull();
    expect(verdictDepuisResultat({ verdict: { value: { verdict: "AUTRE" } } })).toBeNull();
  });
  it("jsonStable ignore l'ordre des clés et undefined", () => {
    expect(jsonStable({ a: 1, b: { c: 2, d: [1, { x: 1, y: 2 }] } })).toBe(jsonStable({ b: { d: [1, { y: 2, x: 1 }], c: 2 }, a: 1, z: undefined }));
    expect(jsonStable({ a: 1 })).not.toBe(jsonStable({ a: 2 }));
    expect(jsonStable({ a: Number.NaN })).toBe(jsonStable({ a: null }));
  });
  it("libellé de version", () => {
    expect(libelleVersion(2)).toBe("Version B");
  });
});

describe("seuils utilisateur appliqués aux nouvelles études", () => {
  it("remplacent les seuils par défaut", () => {
    const d = appliquerSeuilsUtilisateur(createInitialData(), { vert: 70, orange: 95 });
    expect(d.seuils).toEqual({ vertPct: 70, orangePct: 95 });
  });
  it("ne touchent pas des seuils déjà personnalisés dans l'étude", () => {
    const d = createInitialData();
    d.seuils = { vertPct: 60, orangePct: 90 };
    expect(appliquerSeuilsUtilisateur(d, { vert: 70, orange: 95 }).seuils).toEqual({ vertPct: 60, orangePct: 90 });
  });
  it("une étude neuve reprend projet, lieu, rédacteur et seuils du compte", () => {
    const d = donneesInitiales({ projet: "Tour A", lieu: "Paris", redacteur: "A. Dupont", seuils: { vert: 75, orange: 100 } });
    expect(d.operation).toMatchObject({ projet: "Tour A", lieu: "Paris", redacteur: "A. Dupont" });
    expect(d.seuils.vertPct).toBe(75);
  });
});
