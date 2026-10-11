/**
 * Fonctions pures des visuels (échelles, tracé en escalier, conversion pointeur → portée, bornage).
 * Aucune dépendance React. Aucune valeur n'est inventée : les capacités viennent de l'abaque / du moteur.
 */
import type { LoadChart } from "@/engine";

const EPS = 1e-9;
const egal = (a: number, b: number) => Math.abs(a - b) <= EPS;

// ---------------------------------------------------------------------------
// Échelles
// ---------------------------------------------------------------------------

export interface Echelle {
  d0: number;
  d1: number;
  r0: number;
  r1: number;
}

/** Valeur du domaine → coordonnée du rang (linéaire ; domaine dégénéré → milieu du rang). */
export function appliquer(e: Echelle, v: number): number {
  if (e.d1 === e.d0) return (e.r0 + e.r1) / 2;
  return e.r0 + ((v - e.d0) / (e.d1 - e.d0)) * (e.r1 - e.r0);
}

/** Coordonnée du rang → valeur du domaine. */
export function inverser(e: Echelle, r: number): number {
  if (e.r1 === e.r0) return e.d0;
  return e.d0 + ((r - e.r0) / (e.r1 - e.r0)) * (e.d1 - e.d0);
}

/** Graduations « rondes » (1, 2, 5 × 10^n) couvrant [min ; max], environ `cible` graduations. */
export function graduations(min: number, max: number, cible = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return Number.isFinite(min) ? [min] : [];
  const brut = (max - min) / Math.max(1, cible);
  const mag = Math.pow(10, Math.floor(Math.log10(brut)));
  const r = brut / mag;
  const pas = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  const out: number[] = [];
  const debut = Math.ceil(min / pas - EPS) * pas;
  for (let v = debut; v <= max + EPS; v += pas) out.push(Math.round(v / pas) * pas + 0);
  return out;
}

// ---------------------------------------------------------------------------
// Courbes de charge (abaque → lignes → escalier)
// ---------------------------------------------------------------------------

export interface LigneAbaque {
  /** Valeur de l'axe Y (longueur de flèche / hauteur), `null` pour un abaque sans second axe. */
  y: number | null;
  /** Nœuds triés par portée croissante ; `capacityKg: null` = cellule vide. */
  noeuds: { x: number; capacityKg: number | null }[];
}

/** Regroupe les nœuds de l'abaque par ligne (valeur Y), triés. */
export function lignesAbaque(chart: LoadChart): LigneAbaque[] {
  const map = new Map<string, LigneAbaque>();
  for (const p of chart.points) {
    if (!Number.isFinite(p.x)) continue;
    const y = chart.axisY === "none" ? null : p.y;
    if (chart.axisY !== "none" && (y === null || !Number.isFinite(y))) continue;
    const cle = y === null ? "none" : String(Math.round(y * 1e6));
    let l = map.get(cle);
    if (!l) map.set(cle, (l = { y, noeuds: [] }));
    l.noeuds.push({ x: p.x, capacityKg: p.capacityKg });
  }
  const lignes = [...map.values()];
  lignes.forEach((l) => l.noeuds.sort((a, b) => a.x - b.x));
  return lignes.sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
}

export interface PointTrace {
  x: number;
  c: number;
}

/**
 * Tracé d'une ligne d'abaque, en sous-chemins (une cellule vide coupe le tracé).
 * - sans interpolation autorisée : ESCALIER. Entre deux nœuds la valeur lue est le minimum des deux
 *   (lecture sécuritaire, identique au moteur) ; au nœud lui-même, c'est la valeur du nœud.
 *   Aucun prolongement avant le premier nœud ni après le dernier.
 * - interpolation autorisée par le constructeur : segments droits entre nœuds.
 */
export function tracerEscalier(noeuds: LigneAbaque["noeuds"], interpolation: boolean): PointTrace[][] {
  const chemins: PointTrace[][] = [];
  let cur: PointTrace[] = [];
  const fermer = () => {
    if (cur.length > 0) chemins.push(cur);
    cur = [];
  };
  for (let i = 0; i < noeuds.length; i++) {
    const n = noeuds[i];
    if (n.capacityKg === null) {
      fermer();
      continue;
    }
    if (cur.length === 0) cur.push({ x: n.x, c: n.capacityKg });
    else {
      const prec = cur[cur.length - 1];
      if (!interpolation) {
        // `prec` est le dernier point du palier précédent : on le remplace par le niveau de l'intervalle.
        // Le niveau de l'intervalle [x_{i-1} ; x_i] est min(c_{i-1}, c_i) : déjà posé en (x_{i-1}, m).
        cur.push({ x: n.x, c: prec.c });
        if (n.capacityKg !== prec.c) cur.push({ x: n.x, c: n.capacityKg });
      } else cur.push({ x: n.x, c: n.capacityKg });
    }
    const suivant = noeuds[i + 1];
    if (!interpolation && suivant && suivant.capacityKg !== null) {
      const m = Math.min(n.capacityKg, suivant.capacityKg);
      if (m !== cur[cur.length - 1].c) cur.push({ x: n.x, c: m });
    }
  }
  fermer();
  return chemins;
}

/** Points d'un sous-chemin en chaîne SVG « M x,y L x,y … » via deux échelles ; `facteur` multiplie la capacité. */
export function cheminSvg(chemin: PointTrace[], ex: Echelle, ey: Echelle, facteur = 1): string {
  return chemin
    .map((p, i) => `${i === 0 ? "M" : "L"}${arrondi(appliquer(ex, p.x))},${arrondi(appliquer(ey, p.c * facteur))}`)
    .join(" ");
}

/** Aire sous un sous-chemin (jusqu'à la base y = `base` en coordonnées rang). */
export function aireSvg(chemin: PointTrace[], ex: Echelle, ey: Echelle, facteur: number, base: number): string {
  if (chemin.length === 0) return "";
  const pts = chemin.map((p) => `${arrondi(appliquer(ex, p.x))},${arrondi(appliquer(ey, p.c * facteur))}`);
  const x0 = arrondi(appliquer(ex, chemin[0].x));
  const x1 = arrondi(appliquer(ex, chemin[chemin.length - 1].x));
  return `M${x0},${base} L${pts.join(" L")} L${x1},${base} Z`;
}

function arrondi(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Lignes à mettre en avant pour une valeur Y : la ligne exacte, sinon les deux lignes encadrantes (lecture min). */
export function lignesActives(lignes: LigneAbaque[], y: number | null | undefined): number[] {
  if (lignes.length === 0) return [];
  if (lignes.length === 1 && lignes[0].y === null) return [0];
  if (y === null || y === undefined || !Number.isFinite(y)) return [];
  const exact = lignes.findIndex((l) => l.y !== null && egal(l.y, y));
  if (exact >= 0) return [exact];
  const inf = [...lignes.keys()].filter((i) => (lignes[i].y ?? Infinity) < y).pop();
  const sup = [...lignes.keys()].find((i) => (lignes[i].y ?? -Infinity) > y);
  return inf !== undefined && sup !== undefined ? [inf, sup] : [];
}

export interface Domaine {
  min: number;
  max: number;
}

function domaineLigne(l: LigneAbaque): Domaine | null {
  return l.noeuds.length === 0 ? null : { min: l.noeuds[0].x, max: l.noeuds[l.noeuds.length - 1].x };
}

/** Domaine global de portée de l'abaque. */
export function domaineGlobal(lignes: LigneAbaque[]): Domaine | null {
  let min = Infinity;
  let max = -Infinity;
  for (const l of lignes) {
    const d = domaineLigne(l);
    if (!d) continue;
    min = Math.min(min, d.min);
    max = Math.max(max, d.max);
  }
  return Number.isFinite(min) ? { min, max } : null;
}

/**
 * Domaine de portée utilisable pour une valeur Y : celui de la ligne exacte, ou l'intersection des deux
 * lignes encadrantes (comme le moteur). Sans Y exploitable : domaine global.
 */
export function domaineDeplacement(lignes: LigneAbaque[], y: number | null | undefined): Domaine | null {
  const global = domaineGlobal(lignes);
  const actives = lignesActives(lignes, y);
  if (actives.length === 0) return global;
  let min = -Infinity;
  let max = Infinity;
  for (const i of actives) {
    const d = domaineLigne(lignes[i]);
    if (!d) return global;
    min = Math.max(min, d.min);
    max = Math.min(max, d.max);
  }
  return min <= max ? { min, max } : global;
}

// ---------------------------------------------------------------------------
// Pointeur → portée
// ---------------------------------------------------------------------------

/** Borne `v` dans le domaine. */
export function borner(v: number, d: Domaine): number {
  return Math.min(d.max, Math.max(d.min, v));
}

/** Arrondit au pas (m) ; pas ≤ 0 ou absent = pas de snap. Le résultat reste dans le domaine. */
export function aimanter(v: number, pas: number | null, d?: Domaine): number {
  if (pas === null || !(pas > 0)) return d ? borner(v, d) : v;
  const s = Math.round(Math.round(v / pas) * pas * 1e6) / 1e6;
  if (!d) return s;
  if (s < d.min - EPS) return Math.round(Math.ceil(d.min / pas - EPS) * pas * 1e6) / 1e6;
  if (s > d.max + EPS) return Math.round(Math.floor(d.max / pas + EPS) * pas * 1e6) / 1e6;
  return s;
}

/**
 * Coordonnée écran (clientX) → portée (m) : px → unités du viewBox → mètres, bornée au domaine puis aimantée.
 * `xPivotSvg` : abscisse du pivot dans le viewBox ; `echelle` : unités du viewBox par mètre.
 */
export function pointeurVersPortee(args: {
  clientX: number;
  rectLeft: number;
  rectWidth: number;
  viewBoxWidth: number;
  xPivotSvg: number;
  echelle: number;
  domaine: Domaine;
  pas: number | null;
}): number {
  const { clientX, rectLeft, rectWidth, viewBoxWidth, xPivotSvg, echelle, domaine, pas } = args;
  if (rectWidth <= 0 || echelle <= 0) return domaine.min;
  const xSvg = ((clientX - rectLeft) / rectWidth) * viewBoxWidth;
  const brut = (xSvg - xPivotSvg) / echelle;
  return aimanter(borner(brut, domaine), pas, domaine);
}

// ---------------------------------------------------------------------------
// Élévation
// ---------------------------------------------------------------------------

/** Hauteur de pied de flèche par défaut (m) lorsque la donnée constructeur n'est pas connue : schéma indicatif. */
export const HAUTEUR_PIED_DEFAUT_M = 2;

/**
 * Angle de flèche (°) si calculable géométriquement : cos(α) = portée / longueur de flèche.
 * `null` (n.d.) si la longueur est inconnue ou si la portée dépasse la longueur.
 */
export function angleFlecheDeg(porteeM: number | null, longueurM: number | null): number | null {
  if (porteeM === null || longueurM === null || !(longueurM > 0) || porteeM < 0 || porteeM > longueurM) return null;
  return (Math.acos(porteeM / longueurM) * 180) / Math.PI;
}

/** Hauteur de la tête de flèche au-dessus du pied : √(L² − r²), ou `null`. */
export function hauteurTeteM(porteeM: number | null, longueurM: number | null): number | null {
  if (porteeM === null || longueurM === null || !(longueurM > 0) || porteeM < 0 || porteeM > longueurM) return null;
  return Math.sqrt(longueurM * longueurM - porteeM * porteeM);
}

// ---------------------------------------------------------------------------
// Vue en plan
// ---------------------------------------------------------------------------

/** Angle (°, 0 = haut du plan, sens horaire) + rayon → décalage (x vers la droite, y vers le bas) en unités de rayon. */
export function polaire(angleDeg: number, rayon: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: rayon * Math.sin(a), y: -rayon * Math.cos(a) };
}

/** Normalise un angle dans [0 ; 360[. */
export function normaliserAngle(a: number): number {
  return ((a % 360) + 360) % 360;
}

/** Écart angulaire signé le plus court de `a` vers `b` (−180 ; 180]. */
export function ecartAngulaire(a: number, b: number): number {
  let d = normaliserAngle(b) - normaliserAngle(a);
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}
