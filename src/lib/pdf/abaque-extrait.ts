/**
 * Extrait d'abaque pour la fiche : lignes (Y) et colonnes (portées) qui ENCADRENT les positions de levage.
 * Aucune valeur n'est calculée ni extrapolée : seules des cellules de l'abaque sont reprises.
 */
import type { LoadChart } from "@/engine";
import { lignesAbaque, lignesActives, type LigneAbaque } from "@/components/modules/visuals/geometry";

export interface PositionExtrait {
  nom: string;
  porteeM: number | null;
  yM: number | null;
}

export interface ExtraitAbaque {
  axeY: LoadChart["axisY"];
  /** Portées (colonnes), triées. */
  colonnes: number[];
  lignes: {
    y: number | null;
    /** Capacité (kg) ; `null` = cellule vide du constructeur ; `undefined` = pas de nœud à cette portée. */
    cellules: (number | null | undefined)[];
  }[];
  /** Positions hors du domaine de l'abaque (aucune ligne ou colonne encadrante). */
  horsDomaine: string[];
}

const EPS = 1e-9;

/** Portées encadrant `x` dans la liste triée `xs` : nœud exact, ou nœud inférieur et supérieur. */
export function colonnesEncadrantes(xs: number[], x: number): number[] {
  if (xs.length === 0 || !Number.isFinite(x)) return [];
  const exact = xs.find((v) => Math.abs(v - x) <= EPS);
  if (exact !== undefined) return [exact];
  const inf = [...xs].reverse().find((v) => v < x);
  const sup = xs.find((v) => v > x);
  return [inf, sup].filter((v): v is number => v !== undefined);
}

/** Indices des lignes à montrer pour un Y : exacte, ou encadrantes ; hors grille → ligne la plus proche. */
function lignesPour(lignes: LigneAbaque[], y: number | null): number[] {
  if (lignes.length === 0) return [];
  if (lignes.length === 1 && lignes[0].y === null) return [0];
  const actives = lignesActives(lignes, y);
  if (actives.length > 0) return actives;
  if (y === null || !Number.isFinite(y)) return [];
  return [y < (lignes[0].y ?? 0) ? 0 : lignes.length - 1];
}

export function extraireAbaque(chart: LoadChart, positions: PositionExtrait[]): ExtraitAbaque {
  const lignes = lignesAbaque(chart);
  const xsGlobal = [...new Set(lignes.flatMap((l) => l.noeuds.map((n) => n.x)))].sort((a, b) => a - b);
  const idx = new Set<number>();
  const cols = new Set<number>();
  const hors: string[] = [];

  for (const p of positions) {
    if (p.porteeM === null) continue;
    const li = lignesPour(lignes, chart.axisY === "none" ? null : p.yM);
    li.forEach((i) => idx.add(i));
    const xsLignes = li.length > 0 ? [...new Set(li.flatMap((i) => lignes[i].noeuds.map((n) => n.x)))].sort((a, b) => a - b) : xsGlobal;
    const c = colonnesEncadrantes(xsLignes, p.porteeM);
    c.forEach((v) => cols.add(v));
    const enDomaine = xsLignes.length > 0 && p.porteeM >= xsLignes[0] - EPS && p.porteeM <= xsLignes[xsLignes.length - 1] + EPS;
    const yOk = chart.axisY === "none" || lignesActives(lignes, p.yM).length > 0;
    if (!enDomaine || !yOk || li.length === 0) hors.push(p.nom);
  }

  // Aucune position exploitable : on montre la première ligne et ses premières colonnes (aperçu), sans conclure.
  if (idx.size === 0 && lignes.length > 0) {
    idx.add(0);
    lignes[0].noeuds.slice(0, 6).forEach((n) => cols.add(n.x));
  }

  const colonnes = [...cols].sort((a, b) => a - b);
  return {
    axeY: chart.axisY,
    colonnes,
    lignes: [...idx]
      .sort((a, b) => a - b)
      .map((i) => ({
        y: lignes[i].y,
        cellules: colonnes.map((x) => {
          const n = lignes[i].noeuds.find((v) => Math.abs(v.x - x) <= EPS);
          return n === undefined ? undefined : n.capacityKg;
        }),
      })),
    horsDomaine: hors,
  };
}
