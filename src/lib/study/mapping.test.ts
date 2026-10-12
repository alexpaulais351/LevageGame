import { describe, expect, it } from "vitest";

import { abaqueTestFictifFleche } from "@/engine/__tests__/fixtures";
import { totalLoad } from "@/engine";

import { computeStudy } from "./compute";
import { createInitialData, fusionnerAvecDefauts } from "./defaults";
import {
  champsObligatoires,
  liftPositions,
  masseSousCrochetKg,
  minBearingInput,
  powerLineInput,
  reservesDocumentaires,
  riggingInput,
  thresholds,
  totalLoadInput,
  windInput,
  outriggerInput,
} from "./mapping";
import { completudeEtapes, erreursEtape, erreursZod, seuilsSchema } from "./schemas";
import type { StudyData } from "./types";

/** Étude complète construite sur l'abaque FICTIF des tests moteur (jamais présent dans l'UI). */
function etudeComplete(): StudyData {
  const d = createInitialData();
  d.operation = { projet: "P", lieu: "L", date: "2026-10-11", description: "D", intervenants: "", redacteur: "R" };
  d.charge = { ...d.charge, designation: "Poutre", masseKg: 2000 };
  d.accessoires = {
    liste: [
      { id: "a1", type: "elingue", label: "Élingue", masseKg: 20, cmuKg: 4200, sollicitation: "brin" },
    ],
    nbBrins: 2,
    angleBetaDeg: 30,
    equilibrageDeclare: false,
  };
  d.machine = {
    selection: {
      typeId: "t", typeLabel: "Type", manufacturerId: "f", manufacturerName: "Fab", machineId: "m", model: "Mod",
      configurationId: "c", configurationLabel: "Conf", chart: abaqueTestFictifFleche(),
    },
    moufleCrochetKg: 100,
    flechetteReplieeKg: null,
    autresKg: null,
  };
  d.geometrie.positions = [
    { id: "prise", nom: "Prise", porteeM: 5, yM: 20 },
    { id: "pose", nom: "Pose", porteeM: 12, yM: 20 },
  ];
  d.sol = { ...d.sol, mode: "stabilisateurs", effortMaxKN: 100, plaqueLongueurM: 1, plaqueLargeurM: 1, portanceKPa: 200 };
  d.environnement = { ...d.environnement, ventPrevu: 5, ventLimiteMachine: 10, lignes: "non" };
  d.personnel = {
    conducteur: "A", caces: "R482 F", autorisationConduite: true, chefManoeuvre: "B", elingueur: "C",
    vgpEngin: true, vgpAccessoires: true,
  };
  return d;
}

describe("mapping étude → entrées du moteur", () => {
  it("transmet les masses et laisse les vides en donnée manquante", () => {
    const d = etudeComplete();
    expect(totalLoadInput(d)).toMatchObject({ chargeKg: 2000, accessoiresKg: [20], moufleCrochetKg: 100 });
    d.charge.masseKg = null;
    expect(totalLoadInput(d).chargeKg).toBeUndefined();
  });

  it("masse sous crochet = charge + accessoires (sans moufle)", () => {
    const d = etudeComplete();
    expect(masseSousCrochetKg(d)).toBe(2020);
    expect(riggingInput(d)).toMatchObject({ masseSousCrochetKg: 2020, nbBrins: 2, angleBetaDeg: 30 });
    d.accessoires.liste[0].masseKg = null;
    expect(masseSousCrochetKg(d)).toBeNull();
  });

  it("n'envoie au moteur que les positions complètes et signale les autres", () => {
    const d = etudeComplete();
    d.geometrie.positions.push({ id: "x", nom: "Libre", porteeM: null, yM: null });
    expect(liftPositions(d).map((p) => p.id)).toEqual(["prise", "pose"]);
    expect(champsObligatoires(d).filter((c) => c.value === null).map((c) => c.label)).toContain(
      "portée de la position « Libre »",
    );
  });

  it("ignore l'axe Y quand l'abaque n'en a pas", () => {
    const d = etudeComplete();
    d.machine.selection!.chart = abaqueTestFictifFleche({ axisY: "none" });
    expect(liftPositions(d)[0].y).toBeNull();
  });

  it("convertit le vent km/h en m/s et les seuils en ratios", () => {
    const d = etudeComplete();
    d.environnement.uniteVent = "kmh";
    d.environnement.ventPrevu = 36;
    d.environnement.ventLimiteMachine = 72;
    expect(windInput(d)).toMatchObject({ ventPrevuMs: 10, limiteMachineMs: 20, limiteChargeMs: undefined });
    expect(thresholds(d)).toEqual({ greenMax: 0.9, orangeMax: 1 });
  });

  it("construit les entrées sol et lignes", () => {
    const d = etudeComplete();
    expect(outriggerInput(d)).toEqual({
      effortMaxKN: 100,
      surface: { type: "plaque", longueurM: 1, largeurM: 1 },
      portanceAdmissibleKPa: 200,
    });
    d.environnement.ligneDistanceSeuilM = 5;
    expect(powerLineInput(d).distanceSeuilM).toBe(5);
    expect(powerLineInput(d).distancePrevueM).toBeUndefined();
  });

  it("génère des réserves documentaires jamais bloquantes", () => {
    const d = etudeComplete();
    d.personnel.vgpEngin = false;
    const r = reservesDocumentaires(d, ["Personnel et documents"]);
    expect(r.every((i) => i.severity === "reserve")).toBe(true);
    expect(r).toHaveLength(2);
  });
});

describe("complétude et validation Zod", () => {
  it("étude vide : aucune étape complète", () => {
    expect(completudeEtapes(createInitialData()).some(Boolean)).toBe(false);
  });
  it("étude complète : 9 étapes complètes", () => {
    expect(completudeEtapes(etudeComplete())).toEqual(Array(9).fill(true));
  });
  it("exige la hauteur/flèche seulement si l'abaque a un axe Y", () => {
    const d = etudeComplete();
    d.geometrie.positions[0].yM = null;
    expect(erreursEtape("geometrie", d)).toHaveProperty(["positions.0.yM"]);
    d.machine.selection!.chart = abaqueTestFictifFleche({ axisY: "none" });
    expect(erreursEtape("geometrie", d)).toEqual({});
  });
  it("valide les seuils", () => {
    expect(erreursZod(seuilsSchema, { vertPct: 90, orangePct: 80 })).toHaveProperty("vertPct");
    expect(erreursZod(seuilsSchema, { vertPct: 80, orangePct: 120 })).toHaveProperty("orangePct");
    expect(erreursZod(seuilsSchema, { vertPct: 80, orangePct: 100 })).toEqual({});
  });
  it("exige les dimensions du patin ou de la plaque selon le type", () => {
    const d = etudeComplete();
    d.sol.typeSurface = "patin";
    expect(erreursEtape("sol", d)).toHaveProperty("patinSurfaceM2");
    d.sol.patinSurfaceM2 = 0.25;
    expect(erreursEtape("sol", d)).toEqual({});
  });
});

describe("computeStudy", () => {
  it("donne ADEQUAT sur un dossier complet largement dans l'abaque", () => {
    const r = computeStudy(etudeComplete());
    expect(r.chargeTotale.value).toBe(2120);
    expect(r.verdict.value.verdict).toBe("ADEQUAT");
    expect(r.verdict.value.bloquants).toEqual([]);
    // position la plus défavorable : portée 12 m, flèche 20 m → 3000 kg
    expect(r.verdict.value.positionDefavorable?.id).toBe("pose");
    expect(r.verdict.value.tauxMax).toBeCloseTo(2120 / 3000, 9);
  });
  it("NON ADEQUAT hors abaque", () => {
    const d = etudeComplete();
    d.geometrie.positions[1].porteeM = 40;
    const r = computeStudy(d);
    expect(r.verdict.value.verdict).toBe("NON_ADEQUAT");
    expect(r.verdict.value.bloquants.some((i) => i.code === "HORS_ABAQUE")).toBe(true);
  });
  it("abaque à vérifier sans effet sur le verdict (D29)", () => {
    const d = etudeComplete();
    d.machine.selection!.chart = abaqueTestFictifFleche({ status: "a_verifier" });
    const r = computeStudy(d);
    expect(r.verdict.value.verdict).toBe("ADEQUAT");
    expect(r.verdict.value.reserves).toEqual([]);
  });
  it("réserve si les VGP ne sont pas confirmées", () => {
    const d = etudeComplete();
    d.personnel.vgpEngin = false;
    const r = computeStudy(d);
    expect(r.verdict.value.verdict).toBe("ADEQUAT_AVEC_RESERVES");
  });
  it("étude vierge : NON ADEQUAT avec données manquantes, sans exception", () => {
    const r = computeStudy(createInitialData());
    expect(r.verdict.value.verdict).toBe("NON_ADEQUAT");
    expect(r.nbDonneesManquantes).toBeGreaterThan(0);
  });
});

describe("fusion avec les valeurs par défaut", () => {
  it("complète les sections absentes d'une ancienne sauvegarde", () => {
    const d = fusionnerAvecDefauts({ charge: { designation: "X" } } as Partial<StudyData>);
    expect(d.charge.designation).toBe("X");
    expect(d.charge.masseKg).toBeNull();
    expect(d.seuils).toEqual({ vertPct: 90, orangePct: 100 });
    expect(fusionnerAvecDefauts(undefined)).toEqual(createInitialData());
  });
  it("convertit un accessoire antérieur au retrait du facteur de mode (CMU = CMU direct × facteur)", () => {
    const ancien = { id: "a", type: "elingue", label: "E", masseKg: 10, cmuDirectKg: 3150, facteurMode: 2.1, sollicitation: "ensemble" };
    const sansFacteur = { ...ancien, id: "b", facteurMode: null };
    const d = fusionnerAvecDefauts({ accessoires: { liste: [ancien, sansFacteur], nbBrins: 4, angleBetaDeg: 30, equilibrageDeclare: false } } as unknown as Partial<StudyData>);
    expect(d.accessoires.liste[0]).toEqual({ id: "a", type: "elingue", label: "E", masseKg: 10, cmuKg: 3150 * 2.1, sollicitation: "ensemble" });
    expect(d.accessoires.liste[1].cmuKg).toBe(3150);
    expect(d.charge.coefMarge).toBe(1);
  });
  it("le coefficient de marge majore la charge totale et la masse sous crochet", () => {
    const d = fusionnerAvecDefauts({ charge: { designation: "X", masseKg: 1000, coefMarge: 1.1 } } as Partial<StudyData>);
    d.accessoires.liste = [{ id: "a", type: "elingue", label: "E", masseKg: 20, cmuKg: 2000, sollicitation: "brin" }];
    d.machine.moufleCrochetKg = 100;
    expect(totalLoad(totalLoadInput(d)).value).toBeCloseTo(1100 + 20 + 100, 9);
    expect(masseSousCrochetKg(d)).toBeCloseTo(1120, 9);
  });
});

describe("minBearingInput", () => {
  it("surface selon le mode d'appui", () => {
    const d = createInitialData();
    expect(minBearingInput(d)).toBeNull();
    d.sol = { ...d.sol, mode: "stabilisateurs", effortMaxKN: 200, typeSurface: "plaque", plaqueLongueurM: 1, plaqueLargeurM: 1.2 };
    expect(minBearingInput(d)).toEqual({ effortKN: 200, surfaceM2: 1.2 });
    d.sol = { ...d.sol, typeSurface: "patin", patinSurfaceM2: 0.5 };
    expect(minBearingInput(d)).toEqual({ effortKN: 200, surfaceM2: 0.5 });
    d.sol = { ...d.sol, mode: "chenilles", chenilleLongueurM: 4, chenilleTuileM: 0.6 };
    expect(minBearingInput(d)?.surfaceM2).toBeCloseTo(4.8, 12);
    d.sol = { ...d.sol, chenilleTuileM: null };
    expect(minBearingInput(d)?.surfaceM2).toBeNaN();
  });
});
