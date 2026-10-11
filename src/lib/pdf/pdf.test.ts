import { describe, expect, it } from "vitest";

import { computeStudy } from "@/lib/study/compute";
import { createInitialData } from "@/lib/study/defaults";

import { colonnesEncadrantes, extraireAbaque } from "./abaque-extrait";
import { nomFichierPdf, slugFichier } from "./filename";
import { abaqueFictif, etudeFictive } from "./fixture";
import { CADRE_COURT, MENTION_PERMANENTE, buildPdfModel, dateFR, pdfTexte, type PdfMeta } from "./model";

const meta: PdfMeta = { genereLe: new Date(2026, 9, 11) };
const modele = (statut: "a_verifier" | "verifie" = "a_verifier", m = meta) => {
  const d = etudeFictive(statut);
  return buildPdfModel(d, computeStudy(d), m);
};

describe("nomFichierPdf", () => {
  it("utilise la référence sans accents ni espaces", () => {
    expect(nomFichierPdf({ reference: "ADQ Été 12/B", projet: "Autre", date: new Date(2026, 0, 5) })).toBe("adequation_ADQ-Ete-12-B_2026-01-05.pdf");
  });
  it("retombe sur le projet puis sur « etude »", () => {
    expect(nomFichierPdf({ reference: "  ", projet: "Tour Œuvre – Lyon 3e", date: new Date(2026, 11, 31) })).toBe("adequation_Tour-oeuvre-Lyon-3e_2026-12-31.pdf");
    expect(nomFichierPdf({ date: new Date(2026, 5, 1) })).toBe("adequation_etude_2026-06-01.pdf");
  });
  it("borne la longueur et ne produit que de l'ASCII sûr", () => {
    const n = nomFichierPdf({ projet: "é".repeat(200) + "x".repeat(100), date: new Date(2026, 5, 1) });
    expect(n).toMatch(/^adequation_[A-Za-z0-9-]+_2026-06-01\.pdf$/);
    expect(slugFichier("a b/c\\d:e")).toBe("a-b-c-d-e");
  });
});

describe("extrait d'abaque", () => {
  const chart = abaqueFictif();
  it("colonnes encadrantes : nœud exact, sinon inférieur et supérieur, sans extrapolation", () => {
    const xs = [3, 4, 5, 6, 8];
    expect(colonnesEncadrantes(xs, 5)).toEqual([5]);
    expect(colonnesEncadrantes(xs, 7)).toEqual([6, 8]);
    expect(colonnesEncadrantes(xs, 1)).toEqual([3]);
    expect(colonnesEncadrantes(xs, 20)).toEqual([8]);
    expect(colonnesEncadrantes([], 5)).toEqual([]);
  });
  it("lignes et colonnes encadrant les positions (Y exact et Y intermédiaire)", () => {
    const e = extraireAbaque(chart, [
      { nom: "Prise", porteeM: 8, yM: 30 },
      { nom: "Rotation", porteeM: 11, yM: 30 },
      { nom: "Pose", porteeM: 14, yM: 35 },
    ]);
    expect(e.colonnes).toEqual([8, 10, 12, 14]);
    expect(e.lignes.map((l) => l.y)).toEqual([30, 40]);
    expect(e.lignes[0].cellules).toEqual([11000, 8500, 6500, 5200]);
    expect(e.lignes[1].cellules).toEqual([8000, 6500, 5200, 4300]);
    expect(e.horsDomaine).toEqual([]);
  });
  it("conserve les cellules vides (null) et signale l'absence de nœud (undefined)", () => {
    const e = extraireAbaque(chart, [{ nom: "P", porteeM: 16, yM: 40 }]);
    expect(e.colonnes).toEqual([16]);
    expect(e.lignes[0].y).toBe(40);
    expect(e.lignes[0].cellules).toEqual([null]);
    const e2 = extraireAbaque(chart, [{ nom: "P", porteeM: 3, yM: 20 }, { nom: "Q", porteeM: 5, yM: 40 }]);
    const l40 = e2.lignes.find((l) => l.y === 40);
    expect(l40?.cellules[e2.colonnes.indexOf(3)]).toBeUndefined();
  });
  it("signale les positions hors domaine, sans extrapoler", () => {
    const e = extraireAbaque(chart, [{ nom: "Loin", porteeM: 40, yM: 30 }, { nom: "Haut", porteeM: 8, yM: 99 }]);
    expect(e.horsDomaine).toEqual(["Loin", "Haut"]);
    expect(e.colonnes.every((x) => [8, 18].includes(x))).toBe(true);
  });
  it("abaque sans second axe : une seule ligne", () => {
    const simple = { ...chart, axisY: "none" as const, points: [{ x: 5, y: null, capacityKg: 9000 }, { x: 10, y: null, capacityKg: 6000 }] };
    const e = extraireAbaque(simple, [{ nom: "P", porteeM: 7, yM: null }]);
    expect(e.colonnes).toEqual([5, 10]);
    expect(e.lignes).toEqual([{ y: null, cellules: [9000, 6000] }]);
  });
});

describe("buildPdfModel", () => {
  it("reprend verdict, bloquants et mentions obligatoires", () => {
    const m = modele();
    expect(m.verdict.code).toBe("NON_ADEQUAT");
    expect(m.verdict.libelle).toBe("NON ADÉQUAT");
    expect(m.conclusion.bloquants.length).toBeGreaterThanOrEqual(2);
    expect(m.conclusion.bloquants.join(" ")).not.toMatch(/\d\.\d{3,}/);
    expect(m.mentionPermanente).toBe(MENTION_PERMANENTE);
    expect(m.mentionPermanente).toContain("personne compétente");
    expect(m.cadreCourt).toBe(CADRE_COURT);
    expect(m.cadre).toContain("arrêté du 1er mars 2004");
    expect(m.cadre).toContain("R.4323-22");
    expect(m.signatures).toEqual(["Rédacteur", "Chef de manœuvre", "Conducteur", "Responsable chantier"]);
  });
  it("abaque à vérifier : drapeau et source complète", () => {
    const m = modele("a_verifier");
    expect(m.abaqueAVerifier).toBe(true);
    const a = m.machine.abaque;
    expect(a?.statutLibelle).toBe("À VÉRIFIER");
    expect(a?.source.map((c) => c.label)).toEqual(["Titre", "Référence", "Édition", "URL", "Norme de calcul", "Statut"]);
    expect(a?.source.find((c) => c.label === "URL")?.valeur).toBe("https://exemple.invalid/abaque-fictif.pdf");
    expect(a?.extrait.colonnes).toEqual([8, 10, 12, 14]);
    expect(m.conclusion.reserves.join(" ")).toContain("à vérifier");
  });
  it("abaque vérifié : pas d'encadré", () => {
    const m = modele("verifie");
    expect(m.abaqueAVerifier).toBe(false);
    expect(m.machine.abaque?.statutLibelle).toBe("Vérifié");
  });
  it("en-tête du compte : logo seulement s'il est fourni ; aucune mention « non enregistré »", () => {
    expect(modele().entete.logoUrl).toBeNull();
    expect(modele()).not.toHaveProperty("invite");
    const connecte = modele("verifie", { genereLe: meta.genereLe, entreprise: "Entreprise Test", logoUrl: "data:image/png;base64,AAAA", reference: "R-1", indice: "B" });
    expect(connecte.entete).toMatchObject({ reference: "R-1", indice: "B", entreprise: "Entreprise Test", logoUrl: "data:image/png;base64,AAAA" });
  });
  it("accessoires : CMU utile vs effort, conforme / non conforme", () => {
    const l = modele().accessoires.lignes;
    expect(l.map((x) => x.conforme)).toEqual([true, true, false]);
    expect(l[2].label).toBe("Palonnier 6 m");
  });
  it("taux par position, schémas et détail des calculs présents", () => {
    const m = modele();
    expect(m.taux.lignes.map((x) => x.nom)).toEqual(["Prise", "Rotation", "Pose"]);
    expect(m.taux.lignes[2].taux).toMatch(/^110,2/);
    expect(m.taux.lignes[2].zone).toBe("rouge");
    expect(m.schemas.map((s) => s.id)).toEqual(["courbe", "elevation", "plan"]);
    expect(m.schemas.every((s) => s.disponible && s.prims.length > 0)).toBe(true);
    const titres = m.calculs.map((c) => c.titre);
    expect(titres).toEqual(expect.arrayContaining(["Charge totale", "Élingage et CMU", "Appuis et sol", "Vent", "Lignes électriques"]));
    expect(m.calculs[0].formule.length).toBeGreaterThan(0);
    expect(m.calculs[0].entrees.length).toBeGreaterThan(0);
  });
  it("étude vierge : ne plante pas, courbe et plan indisponibles, tirets", () => {
    const d = createInitialData();
    const m = buildPdfModel(d, computeStudy(d), meta);
    expect(m.verdict.code).toBe("NON_ADEQUAT");
    expect(m.schemas.filter((s) => s.id !== "elevation").every((s) => !s.disponible)).toBe(true);
    expect(m.entete.projet).toBe("—");
    expect(m.entete.date).toBe("11/10/2026");
    expect(m.machine.abaque).toBeNull();
  });
  it("aucun caractère hors police intégrée dans les textes générés", () => {
    const m = modele();
    const tout = JSON.stringify({ c: m.calculs, k: m.conclusion, a: m.accessoires, s: m.sol, e: m.environnement });
    expect(tout).not.toMatch(/[≤≥⇒→−βΣ ]/);
  });
});

describe("utilitaires", () => {
  it("dateFR", () => {
    expect(dateFR("2026-03-04")).toBe("04/03/2026");
    expect(dateFR("libre")).toBe("libre");
  });
  it("pdfTexte remplace les symboles absents de WinAnsi", () => {
    expect(pdfTexte("a ≤ b ⇒ β")).toBe("a <= b => bêta");
    expect(pdfTexte("1 234")).toBe("1 234");
    expect(pdfTexte("ok 😀")).toBe("ok ");
  });
});
