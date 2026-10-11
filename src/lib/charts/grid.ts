/**
 * Grille éditable → points d'abaque. Les cellules sont du texte libre ; la conversion passe par le
 * parseur CSV partagé (mêmes règles que l'import), après normalisation de la virgule décimale française.
 */
import type { ChartAxisY } from "../../engine/types";
import { CSV_HEADER, parseChartCsv, type CsvResult } from "./csv";

export interface LigneGrille {
  radius: string;
  y: string;
  capacity: string;
}

export const LIGNE_VIDE: LigneGrille = { radius: "", y: "", capacity: "" };

const norm = (s: string) => s.trim().replace(/\s/g, "").replace(",", ".");
const vide = (l: LigneGrille) => !l.radius.trim() && !l.y.trim() && !l.capacity.trim();

/** Sérialise la grille en CSV canonique (lignes totalement vides ignorées). */
export function grilleVersCsv(lignes: LigneGrille[], axisY: ChartAxisY): string {
  const corps = lignes
    .filter((l) => !vide(l))
    .map((l) => [norm(l.radius), axisY === "none" ? "0" : norm(l.y), norm(l.capacity)].join(","));
  return [CSV_HEADER, ...corps].join("\n");
}

/** Points de la grille ; une ligne partiellement remplie produit une erreur (jamais de valeur devinée). */
export function grilleVersPoints(lignes: LigneGrille[], axisY: ChartAxisY, unit: "kg" | "t"): CsvResult {
  const remplies = lignes.filter((l) => !vide(l));
  if (remplies.length === 0) return { points: [], errors: [] };
  const r = parseChartCsv(grilleVersCsv(lignes, axisY), axisY, unit);
  // Les numéros de ligne CSV (en-tête = 1) deviennent des numéros de ligne de grille (1ʳᵉ ligne = 1).
  const errors = r.errors.map((e) => e.replace(/^ligne (\d+)/, (_, n: string) => `ligne ${Number(n) - 1}`));
  if (axisY !== "none") remplies.forEach((l, i) => !l.y.trim() && errors.push(`ligne ${i + 1} : y (flèche / hauteur) obligatoire`));
  return { points: r.points, errors: [...new Set(errors)] };
}

/** Texte CSV → grille (pour passer d'un import CSV à la correction manuelle). */
export function pointsVersGrille(points: { x: number; y: number | null; capacityKg: number | null }[], unit: "kg" | "t"): LigneGrille[] {
  const f = unit === "t" ? 1000 : 1;
  const s = (n: number) => String(n).replace(".", ",");
  return points.map((p) => ({ radius: s(p.x), y: p.y === null ? "" : s(p.y), capacity: p.capacityKg === null ? "" : s(Number((p.capacityKg / f).toFixed(6))) }));
}
