import { describe, expect, it } from "vitest";

import { classerVehicules } from "@/engine/transport";
import { VEHICULES } from "@/lib/transport/catalogue";
import type { Demandeur } from "@/lib/transport/demande";

import { buildTransportPdfModel, nomFichierSyntheseTransport } from "./transport-model";

const demandeur: Demandeur = { nom: "Camille Martin", fonction: null, entreprise: "Démo BTP", adresse: null, siret: null, telephone: null, email: null };
const projet = { id: "p", nom: "Pont de la Démo", adresse: "1 route du Test, Lyon", client: null };

function modele(piece: { longueurM: number; largeurM: number; hauteurM: number; masseKg: number }, prioritaires: string[] = []) {
  const classement = classerVehicules(piece, VEHICULES, prioritaires);
  return buildTransportPdfModel({
    ev: classement[0],
    classement,
    piece,
    typePiece: "Poutre béton précontrainte",
    designation: "Poutre P3",
    indivisible: true,
    conseils: ["Transport à plat sur appuis."],
    demandeur,
    projet,
    schemas: [],
    date: new Date(2026, 9, 12),
  });
}

describe("synthèse transport (PDF)", () => {
  it("transport particulier : décision, réponses, seuils dépassés", () => {
    const m = modele({ longueurM: 24, largeurM: 0.6, hauteurM: 1.2, masseKg: 30_000 }, ["porte-poutres"]);
    expect(m.decision.particulier).toBe(true);
    expect(m.decision.titre).toContain("TRANSPORT PARTICULIER NÉCESSAIRE");
    expect(m.reponses[0]).toMatchObject({ reponse: "Oui — 3e catégorie", contrainte: true });
    expect(m.reponses[1].reponse).toContain("pilote");
    expect(m.reponses[2].reponse).toBe("Autorisation préfectorale");
    expect(m.seuils.find((x) => x.critere === "Longueur")).toMatchObject({ depasse: true, valeur: "27 m" });
    expect(m.entete).toMatchObject({ projet: "Pont de la Démo", date: "12/10/2026", redacteur: "Camille Martin" });
    expect(m.alternatives.length).toBeGreaterThan(0);
  });

  it("transport normal : aucun transport particulier", () => {
    const m = modele({ longueurM: 8, largeurM: 2.4, hauteurM: 1.2, masseKg: 18_000 });
    expect(m.decision.titre).toBe("TRANSPORT NORMAL — AUCUN TRANSPORT PARTICULIER");
    expect(m.reponses.every((r) => !r.contrainte)).toBe(true);
    expect(m.seuils.every((s) => !s.depasse)).toBe(true);
  });

  it("nom de fichier ASCII", () => {
    expect(nomFichierSyntheseTransport({ projet: "Pont de la Démo", piece: "x", date: new Date(2026, 9, 12) })).toBe("transport_Pont-de-la-Demo_2026-10-12.pdf");
    expect(nomFichierSyntheseTransport({ projet: null, piece: "Poutre béton", date: new Date(2026, 0, 5) })).toBe("transport_Poutre-beton_2026-01-05.pdf");
  });
});
