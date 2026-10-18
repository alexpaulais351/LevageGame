import { describe, expect, it } from "vitest";

import { gabaritDe, gabaritsReleves, versDessin } from "./gabarits";
import { silhouetteElevation, type Forme } from "./silhouettes";

const CATALOGUE: [string, string][] = [
  ["Caterpillar", "M323F"], ["Demag", "AC 100-4L"], ["Demag", "AC 120-1"], ["Demag", "AC 200-1"], ["Demag", "AC 30 City"],
  ["Demag", "AC 40-2L"], ["Demag", "AC 50-1"], ["Demag", "AC 55-3"], ["Demag", "AC 80-2"], ["Galizia", "G100E"],
  ["Grove", "GMK 3050-1"], ["Grove", "GMK 5130-2"], ["Grove", "GMK 5200"], ["Grove", "GMK 6400"], ["Grove", "GMK5150L"],
  ["Liebherr", "LR 1100"], ["Liebherr", "LTM 1030-2.1"], ["Liebherr", "LTM 1040-2.1"], ["Liebherr", "LTM 1055-3.1"],
  ["Liebherr", "LTM 1070-4.1"], ["Liebherr", "LTM 1070-4.2"], ["Liebherr", "LTM 1090-4.1"], ["Liebherr", "LTM 1100-4.2"],
  ["Liebherr", "LTM 1250-1"], ["Liebherr", "MK 110"], ["Liebherr", "MK 140"], ["Liebherr", "MK 88"],
  ["Tadano", "ATF 50G-3"], ["Tadano", "ATF 60G-3"], ["Tadano", "ATF 90G-4"], ["Terex", "A600"],
];

const fini = (formes: readonly Forme[]) =>
  formes.every((f) => (f.k === "poly" ? f.pts.every((p) => p.every(Number.isFinite)) : f.k === "circle" ? [f.cx, f.cy, f.r].every(Number.isFinite) : [f.x1, f.y1, f.x2, f.y2].every(Number.isFinite)));

describe("gabarits des machines du catalogue", () => {
  it("chaque modèle relevé du catalogue est retrouvé par fabricant + modèle", () => {
    for (const [fab, mod] of CATALOGUE) expect(gabaritDe(fab, mod), `${fab} ${mod}`).not.toBeNull();
    expect(gabaritDe("Grove", "RT 540 E")).toBeNull(); // planche illisible : proportions de la famille
    expect(gabaritDe("Inconnu", "X")).toBeNull();
  });

  it("repère du dessin : avant du porteur côté −x, essieux et cabine sur le porteur", () => {
    const g = gabaritDe("Liebherr", "LTM 1055-3.1")!;
    expect(g.xAvant).toBeLessThan(0);
    expect(g.xArriere).toBeGreaterThan(0);
    expect(g.xArriere - g.xAvant).toBeCloseTo(9.435, 2);
    expect(g.essieux).toHaveLength(3);
    for (const x of g.essieux) expect(x).toBeGreaterThan(g.xAvant);
    expect(g.cabine!.x0).toBeLessThan(g.essieux[0]);
    // tourelle en position de travail : articulation de flèche du côté opposé à la flèche
    expect(g.piedX!).toBeLessThan(0);
  });

  it("toutes les silhouettes dessinées aux cotes restent finies, la tête suit la cible", () => {
    for (const brut of gabaritsReleves()) {
      const gabarit = versDessin(brut)!;
      const type = brut.silhouette === "grue_automotrice_a_tour" ? "grue_tour" : brut.silhouette === "grue_chenilles_treillis" ? "grue_mobile_chenilles" : brut.silhouette === "pelle_rail_route" ? "pelle_rail_route" : "grue_mobile";
      for (const tete of [{ x: 8, y: 14 }, { x: 25, y: 30 }]) {
        const s = silhouetteElevation({ type, tete, dims: { gabarit }, stabilisateurs: "sortis" });
        expect(fini(s.formes), brut.machine).toBe(true);
        expect(s.tete[0]).toBeCloseTo(tete.x, 6);
      }
    }
  });
});
