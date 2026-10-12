import { describe, expect, it } from "vitest";
import { Packer } from "docx";
import JSZip from "jszip";

import { classerVehicules } from "@/engine/transport";

import { VEHICULES } from "./catalogue";
import { donneesDemande, nomFichierDemande, type Demandeur } from "./demande";
import { construireDocument, piecesAJoindre } from "./demande-docx";

const demandeur: Demandeur = { nom: "Camille Martin", fonction: "Conductrice de travaux", entreprise: "Démo BTP", adresse: null, siret: null, telephone: null, email: "c@exemple.test" };
const projet = { id: "p1", nom: "Pont de la Démo", adresse: "1 route du Test, 69000 Lyon", client: "Ville fictive" };
const trajet = { depart: "Usine de préfabrication, Mâcon", dates: "semaine 46", voyages: "2" };

function evPoutre() {
  const piece = { longueurM: 24, largeurM: 0.6, hauteurM: 1.2, masseKg: 30_000 };
  return { piece, ev: classerVehicules(piece, VEHICULES, ["porte-poutres"])[0] };
}

describe("projet de demande (Word)", () => {
  it("données : nature, convoi, trajet, projet", () => {
    const { piece, ev } = evPoutre();
    const d = donneesDemande({ ev, piece, typePiece: "Poutre béton précontrainte", designation: "Poutre P3", indivisible: true, demandeur, projet, trajet, schemas: [], date: new Date(2026, 9, 12) });
    expect(d.date).toBe("12/10/2026");
    expect(d.titre).toBe("Projet de demande de transport exceptionnel");
    expect(d.nature).toBe("autorisation");
    expect(d.convoi.categorie).toBe("Convoi exceptionnel 3e catégorie");
    expect(d.convoi.longueur).toBe("27 m");
    expect(d.trajet).toMatchObject({ depart: "Usine de préfabrication, Mâcon", arrivee: projet.adresse, voyages: "2" });
    expect(d.rubriques[0].titre).toBe("Autorisation");
  });

  it("transport normal : note sans demande ; 1re catégorie indivisible : déclaration", () => {
    const petite = { longueurM: 8, largeurM: 2.4, hauteurM: 1.2, masseKg: 18_000 };
    const ev = classerVehicules(petite, VEHICULES)[0];
    const d = donneesDemande({ ev, piece: petite, typePiece: "Prédalles", designation: null, indivisible: true, demandeur, projet: null, trajet, schemas: [] });
    expect(d.nature).toBe("aucune");
    expect(d.titre).toBe("Note de transport");
    const longue = { longueurM: 16, largeurM: 0.5, hauteurM: 1, masseKg: 6_000 };
    const ev1 = classerVehicules(longue, VEHICULES, ["semi-extensible"]).find((x) => x.categorie === "te1")!;
    expect(donneesDemande({ ev: ev1, piece: longue, typePiece: "Poutre", designation: null, indivisible: true, demandeur, projet: null, trajet, schemas: [] }).nature).toBe("declaration");
  });

  it("document .docx : contenu pré-rempli et mentions", async () => {
    const { piece, ev } = evPoutre();
    const d = donneesDemande({ ev, piece, typePiece: "Poutre béton précontrainte", designation: "Poutre P3", indivisible: true, demandeur, projet, trajet, schemas: [] });
    const buffer = await Packer.toBuffer(construireDocument(d));
    const xml = await (await JSZip.loadAsync(buffer)).file("word/document.xml")!.async("string");
    for (const attendu of ["Projet de demande de transport exceptionnel", "Camille Martin", "Pont de la Démo", "Poutre P3", "Convoi exceptionnel 3e catégorie", "Usine de préfabrication, Mâcon", "à compléter", "☒ ", "Pièces à joindre"]) {
      expect(xml).toContain(attendu);
    }
    expect(piecesAJoindre(d).some((p) => p.includes("indivisible"))).toBe(true);
  });

  it("nom de fichier", () => {
    expect(nomFichierDemande("Pont / Démo", "Poutre", new Date(2026, 9, 12))).toBe("Demande transport - Pont Demo - 2026-10-12.docx");
    expect(nomFichierDemande("[EXEMPLE] Réseau DN800 – rue", "x", new Date(2026, 0, 5))).toBe("Demande transport - EXEMPLE Reseau DN800 rue - 2026-01-05.docx");
    expect(nomFichierDemande(null, "Poutre béton", new Date(2026, 0, 5))).toBe("Demande transport - Poutre beton - 2026-01-05.docx");
  });
});
