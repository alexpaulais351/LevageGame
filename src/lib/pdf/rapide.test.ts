import { describe, expect, it } from "vitest";

import { abaqueTestFictifFleche } from "@/engine/__tests__/fixtures";
import { calculRapide, donneesRapides } from "@/lib/study/rapide";

import { buildRapidePdfModel, nomFichierRapide } from "./rapide-model";

function donnees() {
  const d = donneesRapides();
  d.machine.selection = {
    typeId: "t",
    typeLabel: "Grue mobile",
    manufacturerId: "f",
    manufacturerName: "TEST",
    machineId: "m",
    model: "FICTIF 1",
    configurationId: "c",
    configurationLabel: "test",
    chart: abaqueTestFictifFleche(),
  };
  d.machine.moufleCrochetKg = 200;
  d.charge.masseKg = 2500;
  d.charge.coefMarge = 1.1;
  d.geometrie.positions[0].porteeM = 8;
  d.geometrie.positions[0].yM = 20;
  return d;
}

describe("PDF « Adéquation de levage » (vérification rapide)", () => {
  it("verdict, résultats, portée maximale, sans détail de lecture d'abaque", () => {
    const d = donnees();
    const m = buildRapidePdfModel({ data: d, resultat: calculRapide(d), redacteur: "Camille Martin", entreprise: "EBGC", date: new Date("2026-10-17T10:00:00Z") });
    expect(m.verdict.libelle).toBe("ADÉQUAT");
    expect(m.resultats[0][1]).toContain("2,95");
    expect(m.porteeMax?.valeur).toBe("12 m");
    expect(m.calculs.map((c) => c.titre).some((x) => x.startsWith("Capacité à l'abaque"))).toBe(false);
    expect(m.limites).toContain("ne sont pas contrôlés");
    expect(m.calculs.map((c) => c.titre)).toContain("Charge totale");
    expect(m.entete.titre).toBe("ADÉQUATION DE LEVAGE");
    expect(m.jauge).toMatchObject({ zone: "vert", seuilVert: 0.9, seuilOrange: 1 });
    expect(m.jauge.taux).not.toBeNull();
  });

  it("logo de l'entreprise : seulement s'il est fourni", () => {
    const d = donnees();
    expect(buildRapidePdfModel({ data: d, resultat: calculRapide(d), redacteur: "C. M.", entreprise: null }).entete.logoUrl).toBeNull();
    expect(buildRapidePdfModel({ data: d, resultat: calculRapide(d), redacteur: "C. M.", entreprise: "EBGC", logoUrl: "data:image/png;base64,AAAA" }).entete.logoUrl).toBe("data:image/png;base64,AAAA");
  });

  it("schéma en élévation de la pose, coloré selon le verdict rapide (vent, sol, élingage ignorés)", () => {
    const d = donnees();
    const m = buildRapidePdfModel({ data: d, resultat: calculRapide(d), redacteur: "Camille Martin", entreprise: null });
    expect(m.schema.disponible).toBe(true);
    expect(m.schema.titre).toBe("Schéma de la pose (élévation, indicatif)");
    expect(m.schema.prims.some((p) => p.k === "text" && p.t === "portée 8 m")).toBe(true);
    expect(m.schema.notes[0]).toContain("portée 8 m");
  });

  it("nom de fichier ASCII", () => {
    expect(nomFichierRapide({ modele: "GMK 3050-1", date: new Date("2026-10-17T10:00:00Z") })).toBe("adequation-levage_GMK-3050-1_2026-10-17.pdf");
  });
});
