import { describe, expect, it } from "vitest";

import { VEHICULES } from "@/lib/transport/catalogue";
import { demarches, reseau } from "@/lib/transport/demarches";

import { accompagnement, alertesHauteur, categorieConvoi, classerVehicules, contrainte, erreursPiece, evaluerVehicule, type FamilleVehicule } from "../transport";

const enc = (longueurM: number, largeurM: number, masseKg: number, porteAFauxM = 0) => ({ longueurM, largeurM, masseKg, porteAFauxM });
const v = (id: string): FamilleVehicule => VEHICULES.find((x) => x.id === id)!;

describe("categorieConvoi — arrêté du 4 mai 2006, art. 3", () => {
  it("transport normal dans le gabarit", () => {
    expect(categorieConvoi(enc(16.5, 2.55, 44_000), 16.5).categorie).toBe("standard");
  });
  it("hors gabarit : la caractéristique la plus forte fixe la catégorie", () => {
    expect(categorieConvoi(enc(18, 2.55, 30_000), 16.5).categorie).toBe("te1");
    expect(categorieConvoi(enc(20, 3, 48_000), 16.5).categorie).toBe("te1");
    expect(categorieConvoi(enc(20.01, 2.5, 30_000), 16.5).categorie).toBe("te2");
    expect(categorieConvoi(enc(16, 3.5, 30_000), 16.5).categorie).toBe("te2");
    expect(categorieConvoi(enc(16, 2.5, 72_000), 16.5).categorie).toBe("te2");
    expect(categorieConvoi(enc(25.5, 2.5, 30_000), 16.5).categorie).toBe("te3");
    expect(categorieConvoi(enc(16, 4.2, 30_000), 16.5).categorie).toBe("te3");
    const r = categorieConvoi(enc(16, 2.5, 80_000), 16.5);
    expect(r.categorie).toBe("te3");
    expect(r.criteres.join(" ")).toContain("masse");
  });
  it("porte-à-faux arrière > 3 m : hors transport normal", () => {
    expect(categorieConvoi(enc(16, 2.5, 30_000, 3.5), 16.5).categorie).toBe("te1");
    expect(categorieConvoi(enc(16, 2.5, 30_000, 3), 16.5).categorie).toBe("standard");
  });
});

describe("accompagnement — lecture prudente de l'art. 13", () => {
  it("aucun en 1re catégorie et en 2e catégorie ≤ 3 m de large", () => {
    expect(accompagnement("te1", enc(19, 2.9, 40_000))).toMatchObject({ pilote: false, protectionArriere: false, guidage: false });
    expect(accompagnement("te2", enc(24, 2.9, 40_000))).toMatchObject({ pilote: false, protectionArriere: false });
  });
  it("pilote au-delà de 3 m ; pilote + arrière en 3e catégorie ; guidage au-delà de 4,50 m / 40 m / 120 t", () => {
    expect(accompagnement("te2", enc(18, 3.5, 40_000)).pilote).toBe(true);
    expect(accompagnement("te3", enc(26, 2.5, 40_000))).toMatchObject({ pilote: true, protectionArriere: true, guidage: false });
    expect(accompagnement("te3", enc(26, 4.6, 40_000)).guidage).toBe(true);
    expect(accompagnement("te3", enc(41, 2.5, 40_000)).guidage).toBe(true);
    expect(accompagnement("te3", enc(20, 2.5, 121_000)).guidage).toBe(true);
  });
});

describe("véhicules", () => {
  it("hauteur totale = plancher + pièce ; alertes au-delà de 4 / 4,5 / 4,8 m", () => {
    expect(alertesHauteur(4)).toEqual([]);
    expect(alertesHauteur(4.6)).toHaveLength(2);
    expect(alertesHauteur(5)).toHaveLength(3);
    const e = evaluerVehicule({ longueurM: 6, largeurM: 2.5, hauteurM: 2.8, masseKg: 8_000 }, v("semi-plateau"));
    expect(e.encombrement?.hauteurM).toBeCloseTo(4.15, 9);
    expect(e.alertesHauteur).toHaveLength(1);
  });
  it("plateau extensible : allongé à la longueur de la pièce, porte-à-faux au-delà", () => {
    const e = evaluerVehicule({ longueurM: 18, largeurM: 0.5, hauteurM: 1, masseKg: 6_000 }, v("semi-extensible"));
    expect(e.possible).toBe(true);
    expect(e.encombrement).toMatchObject({ plateauRetenuM: 18, porteAFauxM: 0 });
    expect(e.encombrement?.longueurM).toBeCloseTo(20.9, 9);
    expect(e.categorie).toBe("te2");
    const fixe = evaluerVehicule({ longueurM: 16, largeurM: 0.5, hauteurM: 1, masseKg: 6_000 }, v("semi-plateau"));
    expect(fixe.encombrement?.porteAFauxM).toBeCloseTo(2.4, 9);
    expect(fixe.categorie).toBe("te1");
  });
  it("impossible : charge utile, longueur, pupitre", () => {
    expect(evaluerVehicule({ longueurM: 5, largeurM: 2, hauteurM: 1, masseKg: 13_000 }, v("porteur-grue")).possible).toBe(false);
    expect(evaluerVehicule({ longueurM: 15, largeurM: 1, hauteurM: 1, masseKg: 5_000 }, v("porteur-grue")).raisonsImpossible[0]).toContain("trop longue");
    expect(evaluerVehicule({ longueurM: 6, largeurM: 2, hauteurM: 3, masseKg: 5_000 }, v("porte-panneaux")).possible).toBe(false);
  });
  it("classement : possibles d'abord, catégorie la plus légère, hauteur ≤ 4 m, masse", () => {
    const voile = classerVehicules({ longueurM: 7, largeurM: 0.2, hauteurM: 3.4, masseKg: 12_000 }, VEHICULES);
    expect(voile[0].vehicule.id).toBe("porte-panneaux");
    expect(voile[0].categorie).toBe("standard");
    const poutre = classerVehicules({ longueurM: 30, largeurM: 0.6, hauteurM: 1.4, masseKg: 35_000 }, VEHICULES);
    expect(poutre[0].vehicule.id).toBe("porte-poutres");
    expect(poutre[0].categorie).toBe("te3");
    expect(poutre.at(-1)?.possible).toBe(false);
  });
  it("une hauteur > 4 m compte comme un cran de catégorie ; à contrainte égale, famille habituelle d'abord", () => {
    const engin = { longueurM: 9.5, largeurM: 2.98, hauteurM: 3.1, masseKg: 24_000 };
    const r = classerVehicules(engin, VEHICULES, ["surbaissee"]);
    expect(r[0].vehicule.id).toBe("surbaissee");
    expect(contrainte(r[0])).toBeLessThanOrEqual(contrainte(r[1]));
    expect(categorieConvoi(enc(17, 2.5, 30_000), 16.5).criteres[0]).toBe("longueur > 16,5 m (gabarit normal de l'ensemble)");
  });
  it("validation des saisies", () => {
    expect(erreursPiece({ longueurM: 1, largeurM: 1, hauteurM: 1, masseKg: 1 })).toEqual([]);
    expect(erreursPiece({ longueurM: 0, largeurM: Number.NaN })).toHaveLength(4);
  });
});

describe("démarches", () => {
  const e = { longueurM: 22, largeurM: 3.2, hauteurM: 3, masseKg: 60_000, porteAFauxM: 0, plateauRetenuM: 15 };
  it("transport normal : pas d'autorisation", () => {
    expect(demarches("standard", { ...e, porteAFauxM: 1 }, { chargeIndivisible: true })[0].lignes[0]).toContain("Aucune");
  });
  it("1re catégorie : déclaration seulement pour une charge indivisible", () => {
    expect(demarches("te1", e, { chargeIndivisible: true })[0].lignes[0]).toContain("Déclaration");
    expect(demarches("te1", e, { chargeIndivisible: false })[0].lignes[0]).toContain("engins exclus");
  });
  it("réseau selon la masse", () => {
    expect(reseau(40_000)).toContain("2TE48");
    expect(reseau(60_000)).toContain("TE72");
    expect(reseau(90_000)).toContain("TE94");
    expect(reseau(110_000)).toContain("TE120");
    expect(reseau(130_000)).toContain("spécifique");
    expect(demarches("te3", e, { chargeIndivisible: true }).map((x) => x.titre)).toEqual(["Autorisation", "Signalisation du convoi", "Circulation"]);
  });
});
