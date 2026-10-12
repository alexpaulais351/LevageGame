import { describe, expect, it } from "vitest";

import { filtrer, grouperParType, machinesSansAbaque, valeursDistinctes, type ItemListe } from "./filtre";

const it1 = (p: Partial<ItemListe>): ItemListe => ({
  id: "1", typeCode: "grue_tour", typeLabel: "Grue à tour", manufacturerName: "Liebherr", model: "110 EC-B", nbConfigs: 1, statut: "verifie", perso: false, ...p,
});
const items = [it1({ id: "a" }), it1({ id: "b", manufacturerName: "Manitou", model: "MRT 2550", typeLabel: "Chariot télescopique rotatif" }), it1({ id: "c", model: "Éco 3" })];

describe("filtre machines", () => {
  it("recherche insensible à la casse et aux accents", () => {
    expect(filtrer(items, { recherche: "eco", type: null, constructeur: null }).map((i) => i.id)).toEqual(["c"]);
    expect(filtrer(items, { recherche: "liebherr 110", type: null, constructeur: null }).map((i) => i.id)).toEqual(["a"]);
  });
  it("filtre par type et constructeur", () => {
    expect(filtrer(items, { recherche: "", type: "Grue à tour", constructeur: null })).toHaveLength(2);
    expect(filtrer(items, { recherche: "", type: null, constructeur: "Manitou" })).toHaveLength(1);
  });
  it("groupe par type et liste les valeurs distinctes", () => {
    expect(grouperParType(items).map((g) => [g.typeLabel, g.items.length])).toEqual([["Grue à tour", 2], ["Chariot télescopique rotatif", 1]]);
    expect(valeursDistinctes(items, "manufacturerName")).toEqual(["Liebherr", "Manitou"]);
  });
  it("machines sans abaque : libellé de type", () => {
    const r = machinesSansAbaque([{ manufacturer: "X", model: "Y", type_code: "pelle_pneus", motif: "m", besoin: "b" }]);
    expect(r[0].typeLabel).toBe("Pelle sur pneus");
    expect(machinesSansAbaque().length).toBeGreaterThan(0);
  });
});
