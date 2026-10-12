import { describe, expect, it } from "vitest";
import { checkPowerLine, checkWind, kmhToMs } from "../environment";
import { checkCrawlerPressure, checkOutriggerPressure, minBearingCapacity } from "../ground";

describe("checkOutriggerPressure", () => {
  it("plaque L × l : p = F / S ; égalité acceptée", () => {
    const r = checkOutriggerPressure({ effortMaxKN: 200, surface: { type: "plaque", longueurM: 1, largeurM: 1 }, portanceAdmissibleKPa: 200 });
    expect(r.value.pressionKPa).toBe(200);
    expect(r.value.margeKPa).toBe(0);
    expect(r.value.taux).toBe(1);
    expect(r.issues).toEqual([]);
    expect(r.formula).toMatch(/L × l/);
  });

  it("pression > portance ⇒ bloquant", () => {
    const r = checkOutriggerPressure({ effortMaxKN: 300, surface: { type: "plaque", longueurM: 1.2, largeurM: 1 }, portanceAdmissibleKPa: 200 });
    expect(r.value.pressionKPa).toBeCloseTo(250, 9);
    expect(r.value.margeKPa).toBeCloseTo(-50, 9);
    expect(r.issues[0]).toMatchObject({ code: "SOL_INSUFFISANT", severity: "bloquant" });
  });

  it("patin", () => {
    const r = checkOutriggerPressure({ effortMaxKN: 100, surface: { type: "patin", surfaceM2: 0.5 }, portanceAdmissibleKPa: 250 });
    expect(r.value.pressionKPa).toBe(200);
    expect(r.issues).toEqual([]);
    expect(r.formula).toMatch(/S_patin/);
  });

  it("aucune portance par défaut : manquante ⇒ bloquant", () => {
    const r = checkOutriggerPressure({
      effortMaxKN: 100,
      surface: { type: "patin", surfaceM2: 0.5 },
      portanceAdmissibleKPa: undefined as unknown as number,
    });
    expect(r.value.portanceKPa).toBeNull();
    expect(r.value.taux).toBeNull();
    expect(r.issues[0].code).toBe("DONNEE_MANQUANTE");
  });

  it("surface / effort invalides ⇒ bloquants", () => {
    const r = checkOutriggerPressure({ effortMaxKN: -1, surface: { type: "plaque", longueurM: 0, largeurM: 1 }, portanceAdmissibleKPa: 100 });
    expect(r.value.pressionKPa).toBeNull();
    expect(r.issues).toHaveLength(2);
    const r2 = checkOutriggerPressure({ effortMaxKN: 1, surface: { type: "patin", surfaceM2: Number.NaN }, portanceAdmissibleKPa: 100 });
    expect(r2.value.surfaceM2).toBeNull();
    const r3 = checkOutriggerPressure({ effortMaxKN: 1, surface: undefined as never, portanceAdmissibleKPa: 100 });
    expect(r3.issues[0].message).toMatch(/surface/);
  });
});

describe("checkCrawlerPressure", () => {
  it("p_moy = F / (2 × L × b)", () => {
    const r = checkCrawlerPressure({ effortKN: 800, longueurAppuiM: 5, largeurTuileM: 0.8, portanceAdmissibleKPa: 150 });
    expect(r.value.surfaceM2).toBeCloseTo(8, 12);
    expect(r.value.pressionKPa).toBeCloseTo(100, 9);
    expect(r.issues).toEqual([]);
    expect(r.warnings[0]).toMatch(/excentrement/);
  });
  it("insuffisant et invalide", () => {
    expect(checkCrawlerPressure({ effortKN: 800, longueurAppuiM: 5, largeurTuileM: 0.8, portanceAdmissibleKPa: 90 }).issues[0].code).toBe("SOL_INSUFFISANT");
    expect(checkCrawlerPressure({ effortKN: 800, longueurAppuiM: 0, largeurTuileM: 0.8, portanceAdmissibleKPa: 90 }).value.pressionKPa).toBeNull();
  });
});

describe("checkWind", () => {
  it("vent ≤ limite machine ⇒ ok ; égalité acceptée", () => {
    const r = checkWind({ ventPrevuMs: 9, limiteMachineMs: 9 });
    expect(r.issues).toEqual([]);
    expect(r.value.margeMs).toBe(0);
  });
  it("vent > limite machine ⇒ bloquant", () => {
    expect(checkWind({ ventPrevuMs: 9.1, limiteMachineMs: 9 }).issues[0]).toMatchObject({ code: "VENT_DEPASSE", severity: "bloquant" });
  });
  it("charge à forte prise au vent : limite réduite appliquée", () => {
    const r = checkWind({ ventPrevuMs: 8, limiteMachineMs: 12, chargeFortePriseAuVent: true, limiteChargeMs: 7 });
    expect(r.value.limiteAppliqueeMs).toBe(7);
    expect(r.issues[0].code).toBe("VENT_DEPASSE");
    expect(r.formula).toMatch(/min/);
  });
  it("limite réduite manquante ⇒ bloquant donnée manquante", () => {
    const r = checkWind({ ventPrevuMs: 5, limiteMachineMs: 12, chargeFortePriseAuVent: true });
    expect(r.value.limiteAppliqueeMs).toBeNull();
    expect(r.issues[0].code).toBe("DONNEE_MANQUANTE");
  });
  it("données manquantes", () => {
    const r = checkWind({ ventPrevuMs: Number.NaN, limiteMachineMs: 0 });
    expect(r.issues).toHaveLength(2);
    expect(r.value.margeMs).toBeNull();
  });
  it("km/h → m/s", () => {
    expect(kmhToMs(36)).toBeCloseTo(10, 12);
  });
});

describe("checkPowerLine", () => {
  it("distance ≥ seuil saisi ⇒ ok", () => {
    const r = checkPowerLine({ distancePrevueM: 5, distanceSeuilM: 5, tensionKV: 63, label: "Ligne HTB" });
    expect(r.issues).toEqual([]);
    expect(r.value.margeM).toBe(0);
    expect(r.inputs.U.value).toBe(63);
  });
  it("distance < seuil ⇒ bloquant", () => {
    const r = checkPowerLine({ distancePrevueM: 2.9, distanceSeuilM: 3 });
    expect(r.issues[0]).toMatchObject({ code: "DISTANCE_ELECTRIQUE", severity: "bloquant" });
  });
  it("seuil non saisi ⇒ bloquant donnée manquante (aucune valeur par défaut)", () => {
    const r = checkPowerLine({ distancePrevueM: -1, distanceSeuilM: undefined as unknown as number });
    expect(r.issues.map((i) => i.code)).toEqual(["DONNEE_MANQUANTE", "DONNEE_MANQUANTE"]);
    expect(r.value.margeM).toBeNull();
  });
});

describe("minBearingCapacity — portance minimale requise", () => {
  it("q_min = F / S, conversions bar et t/m²", () => {
    const r = minBearingCapacity({ effortKN: 300, surfaceM2: 1.5 });
    expect(r.value).toBeCloseTo(200, 12);
    expect(r.inputs.q_bar.value).toBeCloseTo(2, 12);
    expect(r.inputs.q_tm2.value).toBeCloseTo(200 / 9.81, 12);
    expect(r.warnings).toEqual([]);
  });
  it("données manquantes ⇒ null", () => {
    expect(minBearingCapacity({ effortKN: Number.NaN, surfaceM2: 1 }).value).toBeNull();
    expect(minBearingCapacity({ effortKN: 100, surfaceM2: 0 }).value).toBeNull();
  });
});
