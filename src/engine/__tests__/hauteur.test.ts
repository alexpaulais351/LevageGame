import { describe, expect, it } from "vitest";

import { hookHeight } from "../hauteur";

describe("hookHeight — hauteur sous crochet nécessaire", () => {
  it("point d'appui le plus haut + charge + élingage + garde", () => {
    const r = hookHeight({
      appuis: [
        { nom: "Prise", hauteurM: 0 },
        { nom: "Pose", hauteurM: 9 },
      ],
      hauteurChargeM: 1.2,
      hauteurElingageM: 3,
      gardeM: 0.5,
    });
    expect(r.value).toBeCloseTo(13.7);
    expect(r.inputs.Ha.label).toContain("Pose");
    expect(r.warnings).toEqual([]);
  });

  it("élingage non saisi compté 0 et signalé", () => {
    const r = hookHeight({ appuis: [{ nom: "Pose", hauteurM: 4 }], hauteurChargeM: 2, hauteurElingageM: null, gardeM: null });
    expect(r.value).toBe(6);
    expect(r.warnings.join(" ")).toContain("élingage");
  });

  it("non calculable sans appui ou sans hauteur de charge", () => {
    expect(hookHeight({ appuis: [{ nom: "Pose", hauteurM: null }], hauteurChargeM: 2, hauteurElingageM: 1, gardeM: 0 }).value).toBeNull();
    expect(hookHeight({ appuis: [{ nom: "Pose", hauteurM: 3 }], hauteurChargeM: null, hauteurElingageM: 1, gardeM: 0 }).value).toBeNull();
  });
});
