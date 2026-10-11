import { describe, expect, it } from "vitest";
import * as engine from "../index";
import { computeVerdict, validateThresholds, zoneOf, type VerdictInput } from "../verdict";
import { abaqueTestFictifFleche, abaqueTestFictifSimple } from "./fixtures";

// ABAQUE_TEST_FICTIF_SIMPLE : 1000 kg à 6 m.
const at6 = (Q: number | null, over: Partial<VerdictInput> = {}) =>
  computeVerdict({
    chart: abaqueTestFictifSimple(),
    positions: [{ id: "prise", label: "Prise", rayonM: 6 }],
    chargeTotaleKg: Q,
    ...over,
  });

describe("zoneOf — bornes", () => {
  it("vert < 80 % ≤ orange ≤ 100 % < rouge", () => {
    expect(zoneOf(0.79)).toBe("vert");
    expect(zoneOf(0.8)).toBe("orange");
    expect(zoneOf(0.8 - 1e-12)).toBe("orange");
    expect(zoneOf(1)).toBe("orange");
    expect(zoneOf(1 + 1e-12)).toBe("orange");
    expect(zoneOf(1.001)).toBe("rouge");
    expect(zoneOf(0.6, { greenMax: 0.5, orangeMax: 0.9 })).toBe("orange");
  });
});

describe("validateThresholds", () => {
  it("valide les seuils", () => {
    expect(validateThresholds({ greenMax: 0.8, orangeMax: 1 })).toEqual([]);
    expect(validateThresholds({ greenMax: 0.9, orangeMax: 0.9 })).toEqual([]);
    expect(validateThresholds({ greenMax: 0, orangeMax: 1 })).toHaveLength(1);
    expect(validateThresholds({ greenMax: 0.9, orangeMax: 0.8 })).toHaveLength(1);
    expect(validateThresholds({ greenMax: 0.8, orangeMax: 1.2 })).toHaveLength(1);
    expect(validateThresholds({ greenMax: Number.NaN, orangeMax: 1 })).toHaveLength(1);
  });
});

describe("computeVerdict — taux et bornes 80 / 100 %", () => {
  it("799 kg / 1000 kg ⇒ vert, ADEQUAT", () => {
    const r = at6(799);
    expect(r.value.verdict).toBe("ADEQUAT");
    expect(r.value.zone).toBe("vert");
    expect(r.value.tauxMax).toBeCloseTo(0.799, 12);
    expect(r.value.bloquants).toEqual([]);
    expect(r.value.reserves).toEqual([]);
    expect(r.source).toContain("ABAQUE_TEST_FICTIF_SIMPLE");
  });
  it("taux exactement 80 % ⇒ orange, ADEQUAT_AVEC_RESERVES", () => {
    const r = at6(800);
    expect(r.value.zone).toBe("orange");
    expect(r.value.verdict).toBe("ADEQUAT_AVEC_RESERVES");
    expect(r.value.reserves[0].code).toBe("ZONE_ORANGE");
  });
  it("taux exactement 100 % ⇒ orange, ADEQUAT_AVEC_RESERVES", () => {
    const r = at6(1000);
    expect(r.value.zone).toBe("orange");
    expect(r.value.verdict).toBe("ADEQUAT_AVEC_RESERVES");
  });
  it("taux > 100 % ⇒ NON_ADEQUAT", () => {
    const r = at6(1000.01);
    expect(r.value.zone).toBe("rouge");
    expect(r.value.verdict).toBe("NON_ADEQUAT");
    expect(r.value.bloquants[0].code).toBe("TAUX_DEPASSE");
  });
  it("seuils personnalisés", () => {
    expect(at6(600, { thresholds: { greenMax: 0.5, orangeMax: 0.9 } }).value.verdict).toBe("ADEQUAT_AVEC_RESERVES");
    expect(at6(950, { thresholds: { greenMax: 0.5, orangeMax: 0.9 } }).value.zone).toBe("rouge");
  });
  it("seuils invalides ⇒ bloquant", () => {
    const r = at6(100, { thresholds: { greenMax: 0.9, orangeMax: 0.5 } });
    expect(r.value.verdict).toBe("NON_ADEQUAT");
    expect(r.value.bloquants[0].code).toBe("SEUILS_INVALIDES");
  });
});

describe("computeVerdict — positions multiples", () => {
  it("position la plus défavorable = taux maximal", () => {
    const r = computeVerdict({
      chart: abaqueTestFictifSimple(),
      positions: [
        { id: "prise", label: "Prise", rayonM: 4 },
        { id: "pose", label: "Pose", rayonM: 8 },
        { id: "rot", label: "Rotation", rayonM: 3 },
      ],
      chargeTotaleKg: 500,
    });
    expect(r.value.positionDefavorable?.id).toBe("pose");
    expect(r.value.tauxMax).toBeCloseTo(500 / 600, 12);
    expect(r.value.verdict).toBe("ADEQUAT_AVEC_RESERVES");
    expect(r.inputs.capacite_pose.value).toBe(600);
  });
  it("position hors abaque ⇒ la plus défavorable, bloquant", () => {
    const r = computeVerdict({
      chart: abaqueTestFictifFleche(),
      positions: [
        { id: "a", label: "Prise", rayonM: 5, y: 20 },
        { id: "b", label: "Pose", rayonM: 30, y: 20 },
        { id: "c", label: "Rotation", rayonM: 3, y: 20 },
      ],
      chargeTotaleKg: 1000,
    });
    expect(r.value.verdict).toBe("NON_ADEQUAT");
    expect(r.value.positionDefavorable?.id).toBe("b");
    expect(r.value.tauxMax).toBeNull();
    expect(r.value.zone).toBe("rouge");
    expect(r.value.bloquants[0].code).toBe("HORS_ABAQUE");
    expect(r.inputs.capacite_b.value).toBe("hors abaque");
  });
  it("capacité nulle ⇒ bloquant", () => {
    const r = computeVerdict({
      chart: abaqueTestFictifSimple({ points: [{ x: 1, y: null, capacityKg: 0 }, { x: 2, y: null, capacityKg: 0 }] }),
      positions: [{ id: "p", label: "Prise", rayonM: 1 }],
      chargeTotaleKg: 10,
    });
    expect(r.value.verdict).toBe("NON_ADEQUAT");
    expect(r.value.positions[0].zone).toBe("rouge");
  });
});

describe("computeVerdict — agrégation des contrôles", () => {
  it("abaque à vérifier ⇒ réserve obligatoire", () => {
    const r = at6(100, { chart: abaqueTestFictifSimple({ status: "a_verifier" }) });
    expect(r.value.verdict).toBe("ADEQUAT_AVEC_RESERVES");
    expect(r.value.reserves.map((i) => i.code)).toContain("ABAQUE_A_VERIFIER");
  });
  it("abaque incohérent ⇒ bloquant ; avertissements remontés", () => {
    const r = at6(100, {
      chart: abaqueTestFictifSimple({
        points: [
          { x: 2, y: null, capacityKg: 1000 },
          { x: 6, y: null, capacityKg: 1000 },
          { x: 10, y: null, capacityKg: -1 },
        ],
      }),
    });
    expect(r.value.bloquants.map((i) => i.code)).toContain("ABAQUE_INVALIDE");
    expect(at6(100, { chart: abaqueTestFictifFleche() }).warnings.join()).toMatch(/cellule vide/);
  });
  it("contrôles élingage / sol / vent / ligne agrégés", () => {
    const rig = engine.checkRigging({
      masseSousCrochetKg: 1000,
      nbBrins: 2,
      angleBetaDeg: 50,
      accessoires: [{ id: "e", label: "Élingue", type: "elingue", cmuDirectKg: 1000, facteurMode: 1, sollicitation: "brin" }],
    });
    const wind = engine.checkWind({ ventPrevuMs: 5, limiteMachineMs: 10 });
    const r1 = at6(100, { controles: [rig, wind] });
    expect(r1.value.verdict).toBe("ADEQUAT_AVEC_RESERVES");
    expect(r1.value.reserves[0].code).toBe("ANGLE_ELINGAGE");

    const sol = engine.checkOutriggerPressure({ effortMaxKN: 300, surface: { type: "patin", surfaceM2: 1 }, portanceAdmissibleKPa: 200 });
    const ligne = engine.checkPowerLine({ distancePrevueM: 2, distanceSeuilM: 3 });
    const vent = engine.checkWind({ ventPrevuMs: 15, limiteMachineMs: 10 });
    const r2 = at6(100, { controles: [sol, ligne, vent] });
    expect(r2.value.verdict).toBe("NON_ADEQUAT");
    expect(r2.value.bloquants.map((i) => i.code)).toEqual(["SOL_INSUFFISANT", "DISTANCE_ELECTRIQUE", "VENT_DEPASSE"]);
  });
  it("champ obligatoire manquant ⇒ bloquant « donnée manquante »", () => {
    const r = at6(100, {
      champsObligatoires: [
        { label: "Lieu", value: "Lyon" },
        { label: "Date", value: "" },
        { label: "Masse", value: Number.NaN },
        { label: "Intervenants", value: [] },
        { label: "Conducteur", value: null },
        { label: "Objet", value: { a: 1 } },
        { label: "N", value: 3 },
      ],
    });
    expect(r.value.bloquants.map((i) => i.message)).toEqual([
      "Donnée manquante : Date.",
      "Donnée manquante : Masse.",
      "Donnée manquante : Intervenants.",
      "Donnée manquante : Conducteur.",
    ]);
  });
  it("abaque, positions ou charge manquants ⇒ NON_ADEQUAT", () => {
    const noChart = at6(100, { chart: null });
    expect(noChart.value.verdict).toBe("NON_ADEQUAT");
    expect(noChart.value.positionDefavorable).toBeNull();
    expect(noChart.source).toBeUndefined();
    expect(at6(100, { positions: [] }).value.bloquants[0].message).toMatch(/position/);
    const noQ = at6(null);
    expect(noQ.value.verdict).toBe("NON_ADEQUAT");
    expect(noQ.value.positions[0].taux).toBeNull();
    expect(noQ.inputs.Q.value).toBe("non renseignée");
  });
});

describe("chaîne complète (exemple fictif)", () => {
  it("totalLoad → computeVerdict", () => {
    const q = engine.totalLoad({ chargeKg: 2500, accessoiresKg: [50], moufleCrochetKg: 150 });
    const r = engine.computeVerdict({
      chart: abaqueTestFictifFleche({ status: "a_verifier" }),
      positions: [
        { id: "prise", label: "Prise", rayonM: 10, y: 25 },
        { id: "pose", label: "Pose", rayonM: 6, y: 20 },
      ],
      chargeTotaleKg: q.value,
    });
    expect(q.value).toBe(2700);
    // capacité prise = 2800 kg ⇒ taux 96,4 % (orange) ; abaque à vérifier ⇒ réserve
    expect(r.value.positionDefavorable?.id).toBe("prise");
    expect(r.value.verdict).toBe("ADEQUAT_AVEC_RESERVES");
    expect(engine.G).toBe(9.81);
    expect(engine.EPS).toBe(1e-9);
  });
});
