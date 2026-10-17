import { describe, expect, it } from "vitest";

import { maxRadius } from "../chart";
import { abaqueTestFictifFleche } from "./fixtures";

describe("maxRadius — portée maximale pour une charge (abaque fictif)", () => {
  const chart = abaqueTestFictifFleche();

  it("plus grand nœud où la capacité couvre la charge", () => {
    const r = maxRadius(chart, 3000, 20);
    expect(r.value).toBe(12);
    expect(r.inputs.cap.value).toBe(3000);
    expect(String(r.inputs.limite.value)).toContain("capacité insuffisante");
  });

  it("aucun nœud au-delà de la grille ; cellule vide ignorée", () => {
    const r = maxRadius(chart, 1000, 30);
    expect(r.value).toBe(20);
    expect(String(r.inputs.limite.value)).toContain("fin de l'abaque");
  });

  it("charge trop lourde : aucune portée", () => {
    expect(maxRadius(chart, 20000, 20).value).toBeNull();
  });

  it("longueur de flèche intermédiaire : minimum des deux lignes", () => {
    // lignes 20 et 30 m : à 12 m, min(3000, 2800) = 2800 < 3000 ⇒ 8 m (min(5200, 4800) = 4800)
    expect(maxRadius(chart, 3000, 25).value).toBe(8);
  });
});
