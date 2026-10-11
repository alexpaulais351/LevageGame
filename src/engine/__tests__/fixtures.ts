/**
 * ABAQUES DE TEST FICTIFS — valeurs inventées pour les tests unitaires uniquement.
 * Ils ne correspondent à AUCUNE machine réelle et ne doivent jamais être présentés comme tels.
 */
import type { ChartPoint, LoadChart } from "../types";

const SOURCE_FICTIVE = {
  title: "ABAQUE TEST FICTIF — ne correspond à aucune machine",
  reference: "TEST-0000",
  edition: "test",
  url: "",
};

/** y = longueur de flèche ; la portée max varie selon la longueur ; une cellule vide à 24 m / 30 m. */
export const POINTS_FLECHE_FICTIFS: ChartPoint[] = [
  { x: 3, y: 10, capacityKg: 10000 },
  { x: 5, y: 10, capacityKg: 8000 },
  { x: 8, y: 10, capacityKg: 5000 },
  { x: 3, y: 20, capacityKg: 9000 },
  { x: 5, y: 20, capacityKg: 7500 },
  { x: 8, y: 20, capacityKg: 5200 },
  { x: 12, y: 20, capacityKg: 3000 },
  { x: 16, y: 20, capacityKg: 2000 },
  { x: 5, y: 30, capacityKg: 6000 },
  { x: 8, y: 30, capacityKg: 4800 },
  { x: 12, y: 30, capacityKg: 2800 },
  { x: 16, y: 30, capacityKg: 1800 },
  { x: 20, y: 30, capacityKg: 1200 },
  { x: 24, y: 30, capacityKg: null },
];

export function abaqueTestFictifFleche(over: Partial<LoadChart> = {}): LoadChart {
  return {
    id: "ABAQUE_TEST_FICTIF_FLECHE",
    axisX: "radius_m",
    axisY: "boom_length_m",
    points: POINTS_FLECHE_FICTIFS.map((p) => ({ ...p })),
    interpolationAllowed: false,
    status: "verifie",
    standard: "NORME FICTIVE DE TEST",
    source: SOURCE_FICTIVE,
    deductionsIncluded: false,
    ...over,
  };
}

/** Abaque mono-ligne fictif (axe Y 'none') : 1000 kg constant de 2 à 10 m. */
export function abaqueTestFictifSimple(over: Partial<LoadChart> = {}): LoadChart {
  return {
    id: "ABAQUE_TEST_FICTIF_SIMPLE",
    axisX: "radius_m",
    axisY: "none",
    points: [
      { x: 2, y: null, capacityKg: 1000 },
      { x: 6, y: null, capacityKg: 1000 },
      { x: 10, y: null, capacityKg: 600 },
    ],
    interpolationAllowed: false,
    status: "verifie",
    standard: "NORME FICTIVE DE TEST",
    source: SOURCE_FICTIVE,
    deductionsIncluded: false,
    ...over,
  };
}
