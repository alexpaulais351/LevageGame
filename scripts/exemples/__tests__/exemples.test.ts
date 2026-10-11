import path from "node:path";

import { describe, expect, it } from "vitest";

import { donneesDepuisVersion, jsonStable, payloadVersion } from "../../../src/lib/account/version";
import { computeStudy } from "../../../src/lib/study/compute";
import { loadAll } from "../../charts/load";
import {
  abaqueCatalogue,
  construireModeles,
  derniereMigrationModeles,
  empreinteAbaque,
  genererSql,
  lireFichier,
  resumeVerdict,
  STATUTS,
  sqlAttendu,
  substituer,
  TABLE_MODELES,
  TABLE_MODELES_V1,
  tableDeMigration,
  valeursEssai,
} from "../modeles";

const reports = loadAll();
const modeles = construireModeles(reports);

describe("modèles des projets d'exemple", () => {
  it("2 projets, 3 études, verdicts attendus", () => {
    expect(modeles.map((p) => p.nom)).toEqual([
      "[EXEMPLE] Réhabilitation bureaux Lyon 3e – Les Acacias",
      "[EXEMPLE] Renouvellement réseau assainissement DN800 – rue des Vignes-Fictives",
    ]);
    const etudes = modeles.flatMap((p) => p.etudes.map((e) => [p.ordre, e.reference, e.model, e.slug, resumeVerdict(e.result.verifie)]));
    expect(etudes).toEqual([
      [1, "ADQ-001", "GMK3060L", "fleche-principale-360-cw13-5t", "ADEQUAT bloquants[] réserves[]"],
      [1, "ADQ-002", "GMK3060L", "fleche-principale-360-cw12-5t", "ADEQUAT_AVEC_RESERVES bloquants[] réserves[ZONE_ORANGE]"],
      [2, "ADQ-001", "323", "hd-reach-5-7-r2-9-cw5-4t-600-triple-side", "ADEQUAT bloquants[] réserves[]"],
    ]);
  });

  it("result stocké = computeStudy(data) une fois les marqueurs substitués, pour chaque statut d'abaque", () => {
    for (const p of modeles) {
      for (const e of p.etudes) {
        for (const statut of STATUTS) {
          const v = valeursEssai(statut);
          const data = donneesDepuisVersion(JSON.parse(substituer(JSON.stringify(e.data), v)));
          expect(data.machine.selection?.chart?.status).toBe(statut);
          expect(data.operation.redacteur).toBe(v.REDACTEUR);
          const stocke = JSON.parse(substituer(JSON.stringify(e.result[statut]), v));
          expect(jsonStable(stocke)).toBe(jsonStable(payloadVersion(data, computeStudy(data)).result));
          expect(JSON.stringify(stocke)).not.toMatch(/@@[A-Z_]+@@/);
        }
      }
    }
  });

  it("empreinte : dépend des nœuds de l'abaque", () => {
    const c = abaqueCatalogue(reports, { model: "323", slug: "hd-reach-5-7-r2-9-cw5-4t-600-triple-side" });
    const modif = { ...c, points: c.points.map((p, i) => (i === 0 ? { ...p, capacityKg: (p.capacityKg ?? 0) + 1 } : p)) };
    expect(empreinteAbaque(c)).toMatch(/^[0-9a-f]{32}$/);
    expect(empreinteAbaque(modif)).not.toBe(empreinteAbaque(c));
    expect(empreinteAbaque({ ...c, points: [...c.points].reverse() })).toBe(empreinteAbaque(c));
  });

  it("configuration inconnue refusée", () => {
    expect(() => abaqueCatalogue(reports, { model: "323", slug: "inexistante" })).toThrow(/absente/);
  });

  it("la dernière migration de modèles est à jour (sinon : npm run exemples:sql)", () => {
    const f = derniereMigrationModeles();
    expect(f).not.toBeNull();
    const contenu = lireFichier(f!);
    expect(contenu).toBe(sqlAttendu(modeles, contenu));
  });

  it("les migrations générées ciblent private.modeles_exemples_v2 (la 0800 seule reste sur la v1)", () => {
    const sql = genererSql(modeles);
    expect(TABLE_MODELES).toBe("private.modeles_exemples_v2");
    expect(tableDeMigration(sql)).toBe(TABLE_MODELES);
    expect(sql).toContain("insert into private.modeles_exemples_v2 (ordre, nom, adresse, client, etudes) values");
    expect(sql).not.toMatch(/private\.modeles_exemples[ ;(]/);
    const f = derniereMigrationModeles()!;
    const table = tableDeMigration(lireFichier(f));
    if (path.basename(f) <= "20261011000800_projets_exemples_modeles.sql") expect(table).toBe(TABLE_MODELES_V1);
    else expect(table).toBe(TABLE_MODELES);
  });
});
