/**
 * Silhouettes vectorielles paramétriques des machines de levage (schéma technique, sans photo ni logo constructeur).
 *
 * Fonctions PURES : aucune dépendance React / DOM. Elles renvoient des formes (polygones, cercles, lignes)
 * en coordonnées MÉTRIQUES. Deux jeux de coordonnées :
 *  - élévation : x vers la droite (0 = axe de rotation), y vers le HAUT (0 = sol) ;
 *  - plan : x vers la droite, y vers le BAS (0,0 = axe de rotation), azimut 0° = haut, sens horaire.
 * `projeter` convertit les formes en pixels ; l'écran (SVG React) et la fiche (SVG react-pdf) consomment
 * exactement les mêmes formes.
 *
 * Toute dimension non fournie est remplacée par une proportion par défaut (`DIMS_DEFAUT`, ordre de grandeur
 * d'une machine courante) et signalée dans `indicatif` : le schéma ne remplace pas les plans constructeur.
 */
import { VINCI } from "@/lib/design-tokens";

import { elevCamionBras, elevChariot, elevGrueAutomotriceTour, elevPickCarry, elevGrueChenilles, elevGrueMobile, elevGrueTour, elevPelle, elevTelescopique, moufleCrochet } from "./engins-elevation";
import type { Gabarit } from "./gabarits";
import { GRIS_FONCE, GRIS_MOYEN, flecheTelescopique, treillis } from "./rendu";

export type TypeMachine =
  | "grue_mobile"
  | "grue_mobile_chenilles"
  | "grue_tour"
  | "grue_auxiliaire"
  | "telescopique_fixe"
  | "telescopique_rotatif"
  | "pelle_pneus"
  | "pelle_chenilles"
  | "pelle_rail_route"
  | "chariot_elevateur";

export const TYPES_MACHINE: readonly TypeMachine[] = [
  "grue_mobile",
  "grue_mobile_chenilles",
  "grue_tour",
  "grue_auxiliaire",
  "telescopique_fixe",
  "telescopique_rotatif",
  "pelle_pneus",
  "pelle_chenilles",
  "pelle_rail_route",
  "chariot_elevateur",
];

export const LIBELLE_TYPE: Record<TypeMachine, string> = {
  grue_mobile: "Grue mobile sur pneus",
  grue_mobile_chenilles: "Grue mobile sur chenilles",
  grue_tour: "Grue à tour",
  grue_auxiliaire: "Grue auxiliaire (camion-bras)",
  telescopique_fixe: "Chariot télescopique fixe",
  telescopique_rotatif: "Chariot télescopique rotatif",
  pelle_pneus: "Pelle sur pneus",
  pelle_chenilles: "Pelle sur chenilles",
  pelle_rail_route: "Pelle rail-route",
  chariot_elevateur: "Chariot élévateur",
};

/** Retrouve le type depuis son code (`machine_types.code`) ou, à défaut, son libellé. `null` si inconnu. */
export function typeMachineDepuis(code: string | null | undefined, libelle?: string | null): TypeMachine | null {
  const c = (code ?? "").trim().toLowerCase();
  if ((TYPES_MACHINE as readonly string[]).includes(c)) return c as TypeMachine;
  const l = (libelle ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (!l) return null;
  const a = (...m: string[]) => m.every((x) => l.includes(x));
  if (l.includes("pelle")) return l.includes("rail") ? "pelle_rail_route" : l.includes("chenille") ? "pelle_chenilles" : "pelle_pneus";
  if (l.includes("telescop")) return l.includes("rotatif") ? "telescopique_rotatif" : "telescopique_fixe";
  if (l.includes("elevateur")) return "chariot_elevateur";
  if (l.includes("tour")) return "grue_tour";
  if (l.includes("auxiliaire") || l.includes("camion")) return "grue_auxiliaire";
  if (a("grue") && l.includes("chenille")) return "grue_mobile_chenilles";
  if (a("grue")) return "grue_mobile";
  return null;
}

// ---------------------------------------------------------------------------
// Formes et couleurs
// ---------------------------------------------------------------------------

export type Pt = [number, number];

/** Arrêt de dégradé : position (0–1), couleur de la charte, opacité facultative. */
export type Arret = readonly [number, string, number?];
/** Dégradé en coordonnées de la forme (projeté avec elle) : linéaire a → b, ou radial de centre c et rayon r. */
export type Degrade = { k: "lin"; a: Pt; b: Pt; arrets: readonly Arret[] } | { k: "rad"; c: Pt; r: number; arrets: readonly Arret[] };
export type Peinture = string | Degrade;

export type Forme =
  | { k: "poly"; pts: Pt[]; fill?: Peinture; stroke?: string; sw?: number; op?: number }
  | { k: "circle"; cx: number; cy: number; r: number; fill?: Peinture; stroke?: string; sw?: number; op?: number }
  | { k: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; w: number; dash?: string; op?: number };

export { GRIS_FONCE, GRIS_MOYEN, cinematiquePelle } from "./rendu";
const C = {
  corps: GRIS_FONCE,
  organe: GRIS_MOYEN,
  acier: VINCI.gris,
  clair: VINCI.grisLight,
  vitre: VINCI.bleuXLight,
  fleche: VINCI.bleu,
  flecheFonce: VINCI.bleuDark,
  noir: VINCI.noir,
  blanc: VINCI.blanc,
} as const;

export interface Bornes {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function calculerBornes(formes: readonly Forme[]): Bornes {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const ajoute = (x: number, y: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };
  for (const f of formes) {
    if (f.k === "poly") f.pts.forEach(([x, y]) => ajoute(x, y));
    else if (f.k === "circle") {
      ajoute(f.cx - f.r, f.cy - f.r);
      ajoute(f.cx + f.r, f.cy + f.r);
    } else {
      ajoute(f.x1, f.y1);
      ajoute(f.x2, f.y2);
    }
  }
  return Number.isFinite(minX) ? { minX, maxX, minY, maxY } : { minX: 0, maxX: 0, minY: 0, maxY: 0 };
}

/** Transformation métrique → pixels : `x' = ox + x·s`, `y' = oy + (flipY ? −y : y)·s`. Les épaisseurs restent en px. */
export function projeter(formes: readonly Forme[], t: { ox: number; oy: number; s: number; flipY: boolean }): Forme[] {
  const X = (x: number) => t.ox + x * t.s;
  const Y = (y: number) => t.oy + (t.flipY ? -y : y) * t.s;
  const P = ([x, y]: Pt): Pt => [X(x), Y(y)];
  const peint = (p?: Peinture): Peinture | undefined =>
    p === undefined || typeof p === "string" ? p : p.k === "lin" ? { ...p, a: P(p.a), b: P(p.b) } : { ...p, c: P(p.c), r: p.r * t.s };
  return formes.map((f): Forme => {
    if (f.k === "poly") return { ...f, pts: f.pts.map(P), fill: peint(f.fill) };
    if (f.k === "circle") return { ...f, cx: X(f.cx), cy: Y(f.cy), r: f.r * t.s, fill: peint(f.fill) };
    return { ...f, x1: X(f.x1), y1: Y(f.y1), x2: X(f.x2), y2: Y(f.y2) };
  });
}

/** Chaîne `points` d'un polygone (SVG). */
export function pointsSvg(pts: readonly Pt[]): string {
  return pts.map(([x, y]) => `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`).join(" ");
}

// ---------------------------------------------------------------------------
// Dimensions
// ---------------------------------------------------------------------------

/** Dimensions (m) connues pour la machine/configuration ; tout champ absent = valeur par défaut « indicatif ». */
export interface DimsMachine {
  /** Longueur du porteur / du châssis. */
  longueurPorteurM?: number | null;
  /** Largeur hors tout (porteur, châssis ou voie des chenilles). */
  largeurPorteurM?: number | null;
  /** Hauteur du pied de flèche au-dessus du sol. */
  hauteurPiedM?: number | null;
  /** Longueur de flèche (ou de flèche de grue à tour). */
  longueurFlecheM?: number | null;
  /** Longueur du balancier (pelle). */
  balancierM?: number | null;
  /** Emprise des stabilisateurs. */
  calage?: { longueurM: number; largeurM: number } | null;
  /** Cotes du modèle relevées sur la planche constructeur (dessin aux proportions réelles). */
  gabarit?: Gabarit | null;
}

export type Calage = "sortis" | "rentres";
export type Accessoire = "crochet" | "fourches" | "potence";

export interface ParamsSilhouette {
  type: TypeMachine;
  dims?: DimsMachine | null;
  /** Stabilisateurs sortis / rentrés ; défaut selon le type. */
  stabilisateurs?: Calage | null;
  /** Télescopiques : accessoire en bout de flèche. */
  accessoire?: Accessoire | null;
}

/** Valeurs par défaut documentées (ordre de grandeur d'une machine courante de la famille) — INDICATIF. */
export const DIMS_DEFAUT = {
  grue_mobile: { longueurPorteurM: 10.8, largeurPorteurM: 2.75, hauteurPiedM: 2.9, calage: { longueurM: 6.8, largeurM: 7.2 } },
  grue_mobile_chenilles: { longueurPorteurM: 7.2, largeurPorteurM: 5.0, hauteurPiedM: 3.3 },
  grue_tour: { longueurPorteurM: 4.0, largeurPorteurM: 4.0, hauteurPiedM: 0 },
  grue_auxiliaire: { longueurPorteurM: 9.8, largeurPorteurM: 2.5, hauteurPiedM: 2.5, calage: { longueurM: 4.8, largeurM: 5.0 } },
  telescopique_fixe: { longueurPorteurM: 4.8, largeurPorteurM: 2.2, hauteurPiedM: 2.0, calage: { longueurM: 3.4, largeurM: 3.8 } },
  telescopique_rotatif: { longueurPorteurM: 5.4, largeurPorteurM: 2.4, hauteurPiedM: 2.45, calage: { longueurM: 3.8, largeurM: 5.0 } },
  pelle_pneus: { longueurPorteurM: 5.2, largeurPorteurM: 2.5, hauteurPiedM: 1.9, balancierM: 2.9, calage: { longueurM: 5.2, largeurM: 3.6 } },
  pelle_chenilles: { longueurPorteurM: 4.0, largeurPorteurM: 2.8, hauteurPiedM: 1.7, balancierM: 2.9 },
  pelle_rail_route: { longueurPorteurM: 5.2, largeurPorteurM: 2.5, hauteurPiedM: 1.9, balancierM: 2.9, calage: { longueurM: 5.2, largeurM: 3.6 } },
  chariot_elevateur: { longueurPorteurM: 2.9, largeurPorteurM: 1.2, hauteurPiedM: 0 },
} satisfies Record<TypeMachine, DimsMachine>;

const num = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

export interface DimsResolues {
  longueurPorteurM: number;
  largeurPorteurM: number;
  hauteurPiedM: number;
  balancierM: number;
  longueurFlecheM: number | null;
  calage: { longueurM: number; largeurM: number };
  calageConnu: boolean;
  /** Abscisse de l'articulation de flèche par rapport à l'axe (0 sans gabarit). */
  piedXM: number;
  gabarit: Gabarit | null;
  /** Libellés des dimensions remplacées par une valeur par défaut. */
  indicatif: string[];
}

export function resoudreDims(type: TypeMachine, dims?: DimsMachine | null): DimsResolues {
  const d = DIMS_DEFAUT[type] as DimsMachine;
  const g = dims?.gabarit ?? null;
  // Cotes du modèle (planche constructeur) en priorité sur les proportions par défaut de la famille
  if (g) {
    dims = {
      ...dims,
      longueurPorteurM: dims?.longueurPorteurM ?? g.xArriere - g.xAvant,
      largeurPorteurM: dims?.largeurPorteurM ?? g.largeur,
      hauteurPiedM: dims?.hauteurPiedM ?? g.piedH,
      calage: dims?.calage ?? g.calage,
    };
  }
  const indicatif: string[] = [];
  const pick = (v: number | null | undefined, def: number | null | undefined, nom: string): number => {
    if (num(v)) return v;
    if (num(def)) indicatif.push(nom);
    return num(def) ? def : 0;
  };
  const longueurPorteurM = pick(dims?.longueurPorteurM, d.longueurPorteurM, "longueur du porteur");
  const largeurPorteurM = pick(dims?.largeurPorteurM, d.largeurPorteurM, "largeur du porteur");
  const hauteurPiedM = type === "grue_tour" || type === "chariot_elevateur" ? 0 : pick(dims?.hauteurPiedM, d.hauteurPiedM, "hauteur du pied de flèche");
  const balancierM = type.startsWith("pelle") ? pick(dims?.balancierM, d.balancierM, "balancier") : (d.balancierM ?? 2.9);
  const calageConnu = !!dims?.calage && num(dims.calage.longueurM) && num(dims.calage.largeurM);
  const cDef = d.calage ?? { longueurM: 4, largeurM: 4 };
  const calage = calageConnu ? (dims!.calage as { longueurM: number; largeurM: number }) : cDef;
  if (!calageConnu && d.calage) indicatif.push("emprise des stabilisateurs");
  return {
    longueurPorteurM,
    largeurPorteurM,
    hauteurPiedM,
    balancierM,
    longueurFlecheM: num(dims?.longueurFlecheM) ? dims!.longueurFlecheM! : null,
    calage,
    calageConnu,
    piedXM: g?.piedX ?? 0,
    gabarit: g,
    indicatif,
  };
}

const AVEC_STABS: Record<TypeMachine, boolean> = {
  grue_mobile: true,
  grue_mobile_chenilles: false,
  grue_tour: false,
  grue_auxiliaire: true,
  telescopique_fixe: true,
  telescopique_rotatif: true,
  pelle_pneus: true,
  pelle_chenilles: false,
  pelle_rail_route: true,
  chariot_elevateur: false,
};
const STABS_DEFAUT: Record<TypeMachine, Calage> = {
  grue_mobile: "sortis",
  grue_mobile_chenilles: "rentres",
  grue_tour: "rentres",
  grue_auxiliaire: "sortis",
  telescopique_fixe: "rentres",
  telescopique_rotatif: "sortis",
  pelle_pneus: "sortis",
  pelle_chenilles: "rentres",
  pelle_rail_route: "sortis",
  chariot_elevateur: "rentres",
};
function stabs(p: ParamsSilhouette): Calage | null {
  return AVEC_STABS[p.type] ? (p.stabilisateurs ?? STABS_DEFAUT[p.type]) : null;
}

// ---------------------------------------------------------------------------
// Primitives de dessin
// ---------------------------------------------------------------------------

const poly = (pts: Pt[], fill: string, stroke: string = C.noir, sw = 1.1): Forme => ({ k: "poly", pts, fill, stroke, sw });
const boite = (x0: number, y0: number, x1: number, y1: number, fill: string, stroke: string = C.noir, sw = 1.1): Forme =>
  poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fill, stroke, sw);
const cercle = (cx: number, cy: number, r: number, fill?: string, stroke?: string, sw = 1.1): Forme => ({ k: "circle", cx, cy, r, fill, stroke, sw });
const ligne = (a: Pt, b: Pt, stroke: string, w = 1.5, dash?: string): Forme => ({ k: "line", x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke, w, dash });
/** Rectangle à coins coupés. */
const chanfrein = (x0: number, y0: number, x1: number, y1: number, c: number, fill: string, stroke: string = C.noir): Forme =>
  poly([[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]], fill, stroke);

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const norm = (a: Pt, b: Pt): Pt => {
  const d = dist(a, b) || 1;
  return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
};
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];

/** Bande de largeur variable entre `a` (largeur `wa`) et `b` (largeur `wb`). */
function bande(a: Pt, b: Pt, wa: number, wb: number): Pt[] {
  const n = norm(a, b);
  return [add(a, n, wa / 2), add(b, n, wb / 2), add(b, n, -wb / 2), add(a, n, -wa / 2)];
}


// ---------------------------------------------------------------------------
// Élévation
// ---------------------------------------------------------------------------

export interface EntreeElevation extends ParamsSilhouette {
  /** Cible de la tête de flèche (m) : x = portée, y = hauteur. */
  tete: { x: number; y: number };
}

export interface SortieElevation {
  formes: Forme[];
  /** Pied de flèche (articulation sur la tourelle). */
  pied: Pt;
  /** Point d'attache du câble (tête de flèche, chariot de grue à tour, anneau de pelle, tablier du chariot). */
  tete: Pt;
  bornes: Bornes;
  /** `true` : pas de câble (chariot élévateur) — la charge repose sur les fourches. */
  sansCable: boolean;
  /** Longueur du segment pied → tête (m). */
  longueurFlecheM: number;
  /** Angle pied → tête par rapport à l'horizontale (°), valable pour une flèche rectiligne. */
  angleDeg: number;
  indicatif: string[];
  /** Modèle et planche de cotation utilisés pour les proportions, `null` = proportions de la famille. */
  cotesModele: string | null;
}

/** Hauteur du pied de flèche et hauteur minimale de tête, à utiliser pour déduire la tête depuis la géométrie. */
export function profilElevation(type: TypeMachine, dims?: DimsMachine | null): { hauteurPiedM: number; piedXM: number; hauteurTeteMinM: number; sansCable: boolean } {
  const d = resoudreDims(type, dims);
  if (type === "grue_tour") return { hauteurPiedM: 0, piedXM: 0, hauteurTeteMinM: 6, sansCable: false };
  if (type === "chariot_elevateur") return { hauteurPiedM: 0, piedXM: 0, hauteurTeteMinM: 0.1, sansCable: true };
  if (type.startsWith("pelle")) return { hauteurPiedM: d.hauteurPiedM, piedXM: 0, hauteurTeteMinM: 0.4, sansCable: false };
  const piedXM = type === "grue_mobile" || type === "grue_mobile_chenilles" ? d.piedXM : 0;
  return { hauteurPiedM: d.hauteurPiedM, piedXM, hauteurTeteMinM: d.hauteurPiedM + 1, sansCable: false };
}

export function silhouetteElevation(e: EntreeElevation): SortieElevation {
  const dm = resoudreDims(e.type, e.dims);
  const st = stabs(e);
  const tete: Pt = [Number.isFinite(e.tete.x) ? e.tete.x : 0, Number.isFinite(e.tete.y) ? e.tete.y : 0];
  let r: { formes: Forme[]; pied: Pt; tete: Pt; sansCable?: boolean };
  switch (e.type) {
    case "grue_mobile":
      r = dm.gabarit?.silhouette === "pick_and_carry" ? elevPickCarry(dm, tete) : elevGrueMobile(dm, st, tete);
      break;
    case "grue_mobile_chenilles":
      r = elevGrueChenilles(dm, tete);
      break;
    case "grue_tour":
      r = dm.gabarit?.silhouette === "grue_automotrice_a_tour" ? elevGrueAutomotriceTour(dm, st ?? "sortis", tete) : elevGrueTour(dm, tete);
      break;
    case "grue_auxiliaire":
      r = elevCamionBras(dm, st, tete);
      break;
    case "telescopique_fixe":
      r = elevTelescopique(dm, st, tete, e.accessoire ?? null, false);
      break;
    case "telescopique_rotatif":
      r = elevTelescopique(dm, st, tete, e.accessoire ?? null, true);
      break;
    case "pelle_pneus":
    case "pelle_chenilles":
    case "pelle_rail_route":
      r = elevPelle(e.type, dm, st, tete);
      break;
    case "chariot_elevateur":
      r = elevChariot(dm, tete);
      break;
  }
  const dx = r.tete[0] - r.pied[0];
  const dy = r.tete[1] - r.pied[1];
  const formes = r.formes;
  return {
    formes,
    pied: r.pied,
    tete: r.tete,
    bornes: calculerBornes(formes),
    sansCable: r.sansCable ?? false,
    longueurFlecheM: Math.hypot(dx, dy),
    angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
    indicatif: dm.indicatif,
    cotesModele: dm.gabarit ? `${dm.gabarit.modele}, ${dm.gabarit.source}` : null,
  };
}

/** Silhouette de présentation (vignettes) : flèche à ~58° ou posture type de la famille. */
export function silhouetteVignette(type: TypeMachine, dims?: DimsMachine | null): SortieElevation {
  const { hauteurPiedM } = profilElevation(type, dims);
  let tete: { x: number; y: number };
  if (type === "grue_tour") tete = { x: 7, y: 9 };
  else if (type === "chariot_elevateur") tete = { x: 1.5, y: 1.0 };
  else if (type.startsWith("pelle")) tete = { x: 4.8, y: 2.6 };
  else if (type.startsWith("telescopique")) tete = { x: 4.5, y: hauteurPiedM + 3.5 };
  else if (type === "grue_auxiliaire") tete = { x: 5, y: hauteurPiedM + 5 };
  else tete = { x: 6.5, y: hauteurPiedM + 10.5 };
  return silhouetteElevation({ type, tete, dims });
}

// ---------------------------------------------------------------------------
// Moufle / crochet (dessiné par la vue, à la position pilotée par la géométrie)
// ---------------------------------------------------------------------------

/** Moufle + crochet dont le point d'attache (haut) est en (x, y). Hauteur 1,25 m. */
export function formesCrochet(x: number, y: number): Forme[] {
  return moufleCrochet(x, y);
}

// ---------------------------------------------------------------------------
// Plan (vue de dessus)
// ---------------------------------------------------------------------------

export interface EntreePlan extends ParamsSilhouette {
  /** Direction de la flèche (°, 0 = haut, sens horaire). */
  azimutDeg: number;
  /** Portée de la position affichée (m), pour la longueur de flèche en plan ; `null` = longueur indicative. */
  porteeM: number | null;
}

export interface SortiePlan {
  formes: Forme[];
  bornes: Bornes;
  indicatif: string[];
  /** Emprise (rectangle) des appuis dessinés, pour information. */
  emprise: Bornes | null;
}

const tourne = (p: Pt, deg: number): Pt => {
  const a = (deg * Math.PI) / 180;
  return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
};
const tournerFormes = (formes: Forme[], deg: number): Forme[] =>
  formes.map((f): Forme => {
    if (f.k === "poly") return { ...f, pts: f.pts.map((p) => tourne(p, deg)) };
    if (f.k === "circle") {
      const [cx, cy] = tourne([f.cx, f.cy], deg);
      return { ...f, cx, cy };
    }
    const [x1, y1] = tourne([f.x1, f.y1], deg);
    const [x2, y2] = tourne([f.x2, f.y2], deg);
    return { ...f, x1, y1, x2, y2 };
  });

/** Longueur de flèche en plan : portée si connue, sinon proportion indicative. */
const longueurPlan = (e: EntreePlan, dm: DimsResolues): number => {
  const l = e.porteeM !== null && Number.isFinite(e.porteeM) && e.porteeM > 0 ? e.porteeM : (dm.longueurFlecheM ?? 8) * 0.8;
  return Math.max(l, 1.5);
};

/** Tracé de flèche en plan (local : part de l'origine vers le haut, y négatif). */
function flecheEnPlan(len: number, largeur: number, lattice: boolean): Forme[] {
  const a: Pt = [0, 0];
  const b: Pt = [0, -len];
  const f = lattice ? treillis(a, b, largeur, largeur * 0.45, 1.2) : flecheTelescopique(a, b, largeur, 4);
  return [...f, cercle(0, -len, largeur * 0.3, C.flecheFonce, C.noir)];
}

/** Patte de stabilisateur en plan : poutre + semelle. */
function stabPlan(x: number, y: number, lateral: number, sorti: boolean): Forme[] {
  const s = Math.sign(lateral) || 1;
  const xe = sorti ? lateral : s * (Math.abs(x) + 0.35);
  return [ligne([x, y], [xe, y], C.corps, 4), boite(xe - 0.45, y - 0.45, xe + 0.45, y + 0.45, C.noir, C.noir, 1)];
}

export function silhouettePlan(e: EntreePlan): SortiePlan {
  const dm = resoudreDims(e.type, e.dims);
  const st = stabs(e);
  const az = Number.isFinite(e.azimutDeg) ? e.azimutDeg : 0;
  const len = longueurPlan(e, dm);
  let formes: Forme[] = [];
  let emprise: Bornes | null = null;
  const sorti = st === "sortis";
  const demiL = dm.calage.largeurM / 2;
  const demiLong = dm.calage.longueurM / 2;
  const pattes = (ys: number[], largeurCorps: number): Forme[] =>
    st === null ? [] : ys.flatMap((y) => [-1, 1].flatMap((s) => stabPlan(s * (largeurCorps / 2), y, s * demiL, sorti)));

  switch (e.type) {
    case "grue_mobile": {
      const L = dm.longueurPorteurM;
      const W = dm.largeurPorteurM;
      const f: Forme[] = [];
      f.push(...pattes([-demiLong, demiLong], W));
      f.push(boite(-W / 2, -L / 2 + 2.0, W / 2, L / 2, C.corps));
      f.push(chanfrein(-W / 2 + 0.05, -L / 2, W / 2 - 0.05, -L / 2 + 2.15, 0.3, C.acier));
      f.push(boite(-W / 2 + 0.3, -L / 2 + 0.35, W / 2 - 0.3, -L / 2 + 0.95, C.vitre, C.noir, 0.8));
      for (const y of [-L / 2 + 1.3, -L / 2 + 2.75, L / 2 - 2.9, L / 2 - 1.5])
        for (const s of [-1, 1]) f.push(boite(s * (W / 2 + 0.05) - 0.2, y - 0.62, s * (W / 2 + 0.05) + 0.2, y + 0.62, C.noir, C.noir, 0.8));
      const haut: Forme[] = [
        chanfrein(-1.55, -1.7, 1.55, 3.0, 0.45, C.corps),
        chanfrein(-1.2, 1.9, 1.2, 3.2, 0.2, C.organe),
        boite(-1.5, -1.45, -0.55, -0.1, C.corps),
        boite(-1.4, -1.3, -0.65, -0.3, C.vitre, C.noir, 0.8),
        cercle(0, 0, 0.5, C.clair, C.noir),
        ...flecheEnPlan(len, 0.95, false),
      ];
      f.push(...tournerFormes(haut, az));
      formes = f;
      if (st !== null) emprise = { minX: -demiL, maxX: demiL, minY: -demiLong, maxY: demiLong };
      break;
    }
    case "grue_mobile_chenilles": {
      const Lt = dm.longueurPorteurM;
      const W = dm.largeurPorteurM;
      const wt = 1.3;
      const f: Forme[] = [];
      for (const s of [-1, 1]) {
        f.push(chanfrein(s * (W / 2 - wt / 2) - wt / 2, -Lt / 2, s * (W / 2 - wt / 2) + wt / 2, Lt / 2, 0.35, C.corps));
        for (let i = 0; i < 8; i++) f.push(ligne([s * (W / 2 - wt / 2) - wt / 2 + 0.1, -Lt / 2 + 0.5 + (i * (Lt - 1)) / 7], [s * (W / 2 - wt / 2) + wt / 2 - 0.1, -Lt / 2 + 0.5 + (i * (Lt - 1)) / 7], C.noir, 1));
      }
      f.push(boite(-W / 2 + wt, -1.2, W / 2 - wt, 1.2, C.organe));
      const haut: Forme[] = [
        chanfrein(-1.9, -2.6, 1.9, 3.0, 0.4, C.corps),
        chanfrein(-1.6, 3.0, 1.6, 4.4, 0.2, C.organe),
        boite(-1.8, -2.4, -0.7, -0.7, C.corps),
        boite(-1.7, -2.2, -0.8, -0.9, C.vitre, C.noir, 0.8),
        cercle(0, 0, 0.55, C.clair, C.noir),
        ...flecheEnPlan(len, 1.3, true),
      ];
      f.push(...tournerFormes(haut, az));
      formes = f;
      break;
    }
    case "grue_tour": {
      const B = dm.largeurPorteurM;
      const f: Forme[] = [];
      f.push(boite(-B / 2, -B / 2, B / 2, B / 2, C.clair, C.noir));
      f.push(ligne([-B / 2, -B / 2], [B / 2, B / 2], C.organe, 1), ligne([-B / 2, B / 2], [B / 2, -B / 2], C.organe, 1));
      const cj = Math.max(4, len * 0.3);
      const haut: Forme[] = [
        ...treillis([0, 0], [0, -(len + Math.max(3, len * 0.2))], 1.1, 0.5, 1.4),
        ...treillis([0, 0], [0, cj], 1.1, 0.6, 1.4),
        boite(-0.9, cj - 2.4, 0.9, cj - 0.3, C.corps),
        boite(0.8, -1.3, 1.9, -0.2, C.corps),
        boite(0.95, -1.15, 1.75, -0.35, C.vitre, C.noir, 0.8),
        boite(-0.75, -0.75, 0.75, 0.75, C.organe),
        boite(-0.4, -len - 0.4, 0.4, -len + 0.4, C.flecheFonce),
      ];
      f.push(...tournerFormes(haut, az));
      formes = f;
      break;
    }
    case "grue_auxiliaire": {
      const L = dm.longueurPorteurM;
      const W = dm.largeurPorteurM;
      const y0 = -5.6; // avant du camion (la colonne est à l'origine)
      const f: Forme[] = [];
      f.push(...pattes([-0.9, y0 + L - 0.9], W));
      f.push(boite(-W / 2, y0 + 2.2, W / 2, y0 + L, C.corps));
      f.push(boite(-W / 2 + 0.15, y0 + 2.5, W / 2 - 0.15, y0 + L - 0.1, C.clair, C.noir, 0.8));
      f.push(chanfrein(-W / 2 + 0.05, y0, W / 2 - 0.05, y0 + 2.2, 0.3, C.acier));
      f.push(boite(-W / 2 + 0.3, y0 + 0.4, W / 2 - 0.3, y0 + 1.0, C.vitre, C.noir, 0.8));
      for (const y of [y0 + 1.2, y0 + L - 2.6, y0 + L - 1.3]) for (const s of [-1, 1]) f.push(boite(s * (W / 2 + 0.05) - 0.2, y - 0.62, s * (W / 2 + 0.05) + 0.2, y + 0.62, C.noir, C.noir, 0.8));
      const haut: Forme[] = [boite(-0.55, -0.55, 0.55, 0.55, C.corps), cercle(0, 0, 0.3, C.clair, C.noir), ...flecheEnPlan(len, 0.6, false)];
      f.push(...tournerFormes(haut, az));
      formes = f;
      if (st !== null) emprise = { minX: -demiL, maxX: demiL, minY: -0.9, maxY: y0 + L - 0.9 };
      break;
    }
    case "telescopique_fixe":
    case "telescopique_rotatif": {
      const rotatif = e.type === "telescopique_rotatif";
      const L = dm.longueurPorteurM;
      const W = dm.largeurPorteurM;
      const f: Forme[] = [];
      const corps: Forme[] = [];
      // local : cap vers le haut, origine = pied de flèche
      const yAvant = rotatif ? -L / 2 : -(L - 0.9);
      const yArriere = rotatif ? L / 2 : 0.9;
      corps.push(...(st === null ? [] : [-1, 1].flatMap((s) => [yAvant + 0.5, yArriere - 0.5].flatMap((y) => stabPlan(s * (W / 2), y, s * demiL, sorti)))));
      corps.push(chanfrein(-W / 2, yAvant, W / 2, yArriere, 0.3, C.corps));
      for (const s of [-1, 1]) for (const y of [yAvant + 1.0, yArriere - 1.0]) corps.push(boite(s * (W / 2) - 0.2 + s * 0.05, y - 0.55, s * (W / 2) + 0.2 + s * 0.05, y + 0.55, C.noir, C.noir, 0.8));
      if (rotatif) {
        f.push(...corps);
        const haut: Forme[] = [
          chanfrein(-1.15, -1.2, 1.15, 1.7, 0.3, C.organe),
          boite(-1.15, -1.0, -0.35, 0.3, C.acier),
          boite(-1.05, -0.85, -0.45, 0.1, C.vitre, C.noir, 0.8),
          cercle(0, 0, 0.35, C.clair, C.noir),
          ...flecheEnPlan(len, 0.55, false),
        ];
        f.push(...tournerFormes(haut, az));
      } else {
        const machine: Forme[] = [
          ...corps,
          boite(-W / 2 - 0.0, yAvant + 1.6, -0.45, yAvant + 3.0, C.acier),
          boite(-W / 2 + 0.1, yAvant + 1.8, -0.55, yAvant + 2.8, C.vitre, C.noir, 0.8),
          ...flecheEnPlan(len, 0.55, false),
        ];
        // la flèche fait partie du châssis : la machine entière s'oriente à l'azimut
        f.push(...tournerFormes(machine, az));
      }
      formes = f;
      if (st !== null) emprise = { minX: -demiL, maxX: demiL, minY: -L / 2, maxY: L / 2 };
      break;
    }
    case "pelle_pneus":
    case "pelle_chenilles":
    case "pelle_rail_route": {
      const L = dm.longueurPorteurM;
      const W = dm.largeurPorteurM;
      const f: Forme[] = [];
      if (e.type === "pelle_chenilles") {
        const wt = 0.8;
        for (const s of [-1, 1]) {
          f.push(chanfrein(s * (W / 2 - wt / 2) - wt / 2, -L / 2, s * (W / 2 - wt / 2) + wt / 2, L / 2, 0.25, C.corps));
          for (let i = 0; i < 7; i++) f.push(ligne([s * (W / 2 - wt / 2) - wt / 2 + 0.08, -L / 2 + 0.4 + (i * (L - 0.8)) / 6], [s * (W / 2 - wt / 2) + wt / 2 - 0.08, -L / 2 + 0.4 + (i * (L - 0.8)) / 6], C.noir, 1));
        }
        f.push(boite(-W / 2 + wt, -L / 4, W / 2 - wt, L / 4, C.organe));
      } else {
        f.push(...pattes([-L / 2 + 0.6, L / 2 - 0.6], W - 0.3));
        f.push(boite(-0.45, -L / 2, 0.45, L / 2, C.corps));
        f.push(boite(-W / 2, -L / 2 - 0.0, W / 2, -L / 2 + 0.25, C.organe));
        for (const y of [-L / 2 + 1.1, L / 2 - 1.1]) {
          f.push(boite(-W / 2 + 0.05, y - 0.35, W / 2 - 0.05, y + 0.35, C.noir, C.noir, 0.8));
          f.push(ligne([-W / 2, y], [W / 2, y], C.organe, 3));
        }
        if (e.type === "pelle_rail_route") {
          for (const y of [-L / 2 - 0.75, L / 2 + 0.75]) {
            f.push(ligne([-0.75, y], [0.75, y], C.organe, 4));
            f.push(boite(-0.95, y - 0.1, -0.7, y + 0.1, C.noir, C.noir, 0.8), boite(0.7, y - 0.1, 0.95, y + 0.1, C.noir, C.noir, 0.8));
          }
          f.push(ligne([-0.75, -L / 2 - 2], [-0.75, L / 2 + 2], C.acier, 2), ligne([0.75, -L / 2 - 2], [0.75, L / 2 + 2], C.acier, 2));
        }
      }
      const haut: Forme[] = [
        chanfrein(-1.3, -1.6, 1.3, 2.2, 0.35, C.corps),
        chanfrein(-1.2, 1.2, 1.2, 2.5, 0.3, C.organe),
        boite(-1.25, -1.5, -0.45, -0.1, C.acier),
        boite(-1.15, -1.35, -0.55, -0.25, C.vitre, C.noir, 0.8),
        cercle(0, 0, 0.35, C.clair, C.noir),
        // flèche + balancier alignés en plan
        poly(bande([0.0, -0.4], [0, -len * 0.62], 0.55, 0.45), C.fleche, C.flecheFonce),
        poly(bande([0, -len * 0.62], [0, -len], 0.4, 0.3), C.fleche, C.flecheFonce),
        cercle(0, -len, 0.18, undefined, C.noir, 2),
      ];
      f.push(...tournerFormes(haut, az));
      formes = f;
      if (st !== null) emprise = { minX: -W / 2, maxX: W / 2, minY: -L / 2, maxY: L / 2 };
      break;
    }
    case "chariot_elevateur": {
      const L = dm.longueurPorteurM;
      const W = dm.largeurPorteurM;
      const r = e.porteeM !== null && Number.isFinite(e.porteeM) && e.porteeM > 0 ? e.porteeM : 1.05;
      // local : cap vers le haut, centre de charge à (0, −r) ; essieu avant 1,05 m derrière
      const yAx = -r + 1.05;
      const machine: Forme[] = [
        chanfrein(-W / 2, yAx - 0.3, W / 2, yAx + L - 0.9, 0.2, C.corps),
        boite(-W / 2 + 0.1, yAx + 0.5, W / 2 - 0.1, yAx + 1.6, C.vitre, C.noir, 0.8),
        boite(-W / 2 - 0.1, yAx - 0.35, -W / 2 + 0.2, yAx + 0.35, C.noir, C.noir, 0.8),
        boite(W / 2 - 0.2, yAx - 0.35, W / 2 + 0.1, yAx + 0.35, C.noir, C.noir, 0.8),
        boite(-W / 2 + 0.2, yAx - 0.65, W / 2 - 0.2, yAx - 0.3, C.organe),
        boite(-W / 2 + 0.25, yAx - 1.75, -W / 2 + 0.4, yAx - 0.65, C.corps),
        boite(W / 2 - 0.4, yAx - 1.75, W / 2 - 0.25, yAx - 0.65, C.corps),
      ];
      const f = tournerFormes(machine, az);
      formes = f;
      break;
    }
  }
  formes = formes.filter(formeValide);
  return { formes, bornes: calculerBornes(formes), indicatif: dm.indicatif, emprise };
}

function formeValide(f: Forme): boolean {
  if (f.k === "poly") return f.pts.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (f.k === "circle") return Number.isFinite(f.cx) && Number.isFinite(f.cy) && Number.isFinite(f.r);
  return [f.x1, f.y1, f.x2, f.y2].every(Number.isFinite);
}
