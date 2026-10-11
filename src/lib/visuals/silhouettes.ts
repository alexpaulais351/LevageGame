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

export type Forme =
  | { k: "poly"; pts: Pt[]; fill?: string; stroke?: string; sw?: number }
  | { k: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number }
  | { k: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; w: number; dash?: string };

/**
 * Nuances de gris neutre des silhouettes (corps, organes), en complément des gris de la charte.
 * Flèche = bleu VINCI ; câble / pneus = noir ; vitres = bleu très clair.
 */
export const GRIS_FONCE = "#5A5A5A"; // texte secondaire charte VINCI
export const GRIS_MOYEN = "#B5ABA1"; // gris VINCI
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
  return formes.map((f): Forme => {
    if (f.k === "poly") return { ...f, pts: f.pts.map(([x, y]) => [X(x), Y(y)] as Pt) };
    if (f.k === "circle") return { ...f, cx: X(f.cx), cy: Y(f.cy), r: f.r * t.s };
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
  /** Libellés des dimensions remplacées par une valeur par défaut. */
  indicatif: string[];
}

export function resoudreDims(type: TypeMachine, dims?: DimsMachine | null): DimsResolues {
  const d = DIMS_DEFAUT[type] as DimsMachine;
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
const roue = (cx: number, cy: number, r: number): Forme[] => [
  cercle(cx, cy, r, C.noir, C.noir, 1),
  cercle(cx, cy, r * 0.5, C.clair, C.corps, 1),
  cercle(cx, cy, r * 0.12, C.corps),
];
/** Rectangle à coins coupés. */
const chanfrein = (x0: number, y0: number, x1: number, y1: number, c: number, fill: string, stroke: string = C.noir): Forme =>
  poly([[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]], fill, stroke);

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
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

/** Bande le long d'une polyligne, largeur par sommet (normales moyennées). */
function bandePolyligne(pts: Pt[], w: number[]): Pt[] {
  const g: Pt[] = [];
  const d: Pt[] = [];
  pts.forEach((p, i) => {
    const n0 = i > 0 ? norm(pts[i - 1], p) : norm(p, pts[i + 1]);
    const n1 = i < pts.length - 1 ? norm(p, pts[i + 1]) : n0;
    let nx = n0[0] + n1[0];
    let ny = n0[1] + n1[1];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    g.push([p[0] + (nx * w[i]) / 2, p[1] + (ny * w[i]) / 2]);
    d.push([p[0] - (nx * w[i]) / 2, p[1] - (ny * w[i]) / 2]);
  });
  return [...g, ...d.reverse()];
}

/** Flèche télescopique segmentée : sections emboîtées de plus en plus fines vers la tête. */
function flecheTelescopique(a: Pt, b: Pt, w0: number, nbSections = 4): Forme[] {
  const out: Forme[] = [];
  const bornes = [[0, 0.5], [0.4, 0.74], [0.66, 0.92], [0.86, 1]];
  const n = Math.min(nbSections, bornes.length);
  for (let i = 0; i < n; i++) {
    const [t0, t1] = i === n - 1 ? [bornes[i][0], 1] : bornes[i];
    const wa = w0 * (1 - 0.2 * i);
    const wb = w0 * (1 - 0.2 * (i + 1) + 0.04);
    out.push(poly(bande(lerp(a, b, t0), lerp(a, b, t1), wa, Math.max(wb, w0 * 0.3)), i % 2 === 0 ? C.fleche : VINCI.bleuLight, C.flecheFonce));
  }
  out.push(cercle(b[0], b[1], w0 * 0.34, C.flecheFonce, C.noir));
  return out;
}

/** Flèche à treillis (grues sur chenilles, grues à tour). */
function treillis(a: Pt, b: Pt, wa: number, wb: number, pas = 1.1): Forme[] {
  const L = dist(a, b);
  const cellules = Math.max(3, Math.min(70, Math.round(L / pas)));
  const n = norm(a, b);
  const haut = (t: number): Pt => add(lerp(a, b, t), n, (wa + (wb - wa) * t) / 2);
  const bas = (t: number): Pt => add(lerp(a, b, t), n, -(wa + (wb - wa) * t) / 2);
  const out: Forme[] = [poly(bande(a, b, wa, wb), C.vitre, C.flecheFonce, 1)];
  out.push(ligne(haut(0), haut(1), C.fleche, 2.2), ligne(bas(0), bas(1), C.fleche, 2.2));
  for (let i = 0; i < cellules; i++) {
    const t0 = i / cellules;
    const t1 = (i + 1) / cellules;
    if (i % 2 === 0) out.push(ligne(haut(t0), bas(t1), C.fleche, 1.1));
    else out.push(ligne(bas(t0), haut(t1), C.fleche, 1.1));
  }
  out.push(ligne(haut(1), bas(1), C.flecheFonce, 2));
  return out;
}

/** Stabilisateur vu de face (vérin + semelle) à l'abscisse `x`, du châssis `yHaut` au sol. */
function stabilisateurElev(x: number, yHaut: number, sorti: boolean): Forme[] {
  if (!sorti) return [boite(x - 0.3, yHaut - 0.35, x + 0.3, yHaut, C.organe)];
  return [
    boite(x - 0.45, yHaut - 0.35, x + 0.45, yHaut, C.organe),
    boite(x - 0.11, 0.18, x + 0.11, yHaut - 0.3, C.corps),
    boite(x - 0.5, 0, x + 0.5, 0.18, C.noir),
  ];
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
}

/** Hauteur du pied de flèche et hauteur minimale de tête, à utiliser pour déduire la tête depuis la géométrie. */
export function profilElevation(type: TypeMachine, dims?: DimsMachine | null): { hauteurPiedM: number; hauteurTeteMinM: number; sansCable: boolean } {
  const d = resoudreDims(type, dims);
  if (type === "grue_tour") return { hauteurPiedM: 0, hauteurTeteMinM: 6, sansCable: false };
  if (type === "chariot_elevateur") return { hauteurPiedM: 0, hauteurTeteMinM: 0.1, sansCable: true };
  if (type.startsWith("pelle")) return { hauteurPiedM: d.hauteurPiedM, hauteurTeteMinM: 0.4, sansCable: false };
  return { hauteurPiedM: d.hauteurPiedM, hauteurTeteMinM: d.hauteurPiedM + 1, sansCable: false };
}

/**
 * Cinématique plane à deux barres : flèche L1 puis balancier L2 de P (pied) à T (tête), coude vers le haut.
 * Si T n'est pas atteignable, les deux longueurs sont mises à l'échelle (proportions conservées) : le schéma reste
 * cohérent avec le point de charge, au prix de longueurs indicatives. `k` = facteur appliqué.
 */
export function cinematiquePelle(p: Pt, t: Pt, l1: number, l2: number): { coude: Pt; l1: number; l2: number; k: number } {
  const d = Math.max(dist(p, t), 1e-6);
  const min = Math.abs(l1 - l2) * 1.08 + 1e-6;
  const max = (l1 + l2) * 0.97;
  const k = d > max ? d / max : d < min ? d / min : 1;
  const a1 = l1 * k;
  const a2 = l2 * k;
  const a = (a1 * a1 - a2 * a2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, a1 * a1 - a * a));
  const u: Pt = [(t[0] - p[0]) / d, (t[1] - p[1]) / d];
  const n: Pt = [-u[1], u[0]];
  return { coude: [p[0] + u[0] * a + n[0] * h, p[1] + u[1] * a + n[1] * h], l1: a1, l2: a2, k };
}

export function silhouetteElevation(e: EntreeElevation): SortieElevation {
  const dm = resoudreDims(e.type, e.dims);
  const st = stabs(e);
  const tete: Pt = [Number.isFinite(e.tete.x) ? e.tete.x : 0, Number.isFinite(e.tete.y) ? e.tete.y : 0];
  let r: { formes: Forme[]; pied: Pt; tete: Pt; sansCable?: boolean };
  switch (e.type) {
    case "grue_mobile":
      r = elevGrueMobile(dm, st, tete);
      break;
    case "grue_mobile_chenilles":
      r = elevGrueChenilles(dm, tete);
      break;
    case "grue_tour":
      r = elevGrueTour(dm, tete);
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
  };
}

function elevGrueMobile(d: DimsResolues, st: Calage | null, tete: Pt) {
  const f: Forme[] = [];
  const L = d.longueurPorteurM;
  const x0 = -L / 2;
  const x1 = L / 2;
  const hp = d.hauteurPiedM;
  const sorti = st === "sortis";
  const jackX = d.calage.longueurM / 2;
  if (st !== null) for (const x of [-jackX, jackX]) f.push(...stabilisateurElev(x, 1.15, sorti));
  // Châssis, cabine du porteur, aile
  f.push(boite(x0, 0.75, x1, 1.45, C.corps));
  f.push(poly([[x0, 1.45], [x0, 3.15], [x0 + 0.55, 3.55], [x0 + 1.75, 3.55], [x0 + 2.05, 1.45]], C.acier));
  f.push(poly([[x0 + 0.45, 2.15], [x0 + 0.45, 3.3], [x0 + 0.62, 3.4], [x0 + 1.5, 3.4], [x0 + 1.7, 2.15]], C.vitre));
  // Essieux : 2 à l'avant, le reste à l'arrière
  const axes = [x0 + 1.3, x0 + 2.75, x1 - 2.9, x1 - 1.5, x1 - 0.3].slice(0, 4 + (L > 12 ? 1 : 0));
  for (const x of axes) f.push(...roue(x, 0.62, 0.62));
  // Tourelle, contrepoids
  f.push(chanfrein(-1.9, 1.45, 1.8, hp + 0.15, 0.2, C.corps));
  f.push(boite(-2.9, 1.45, -1.9, hp + 0.15, C.organe));
  f.push(cercle(0, 1.5, 0.28, C.noir));
  // Flèche
  f.push(ligne([-0.2, 1.9], lerp([0, hp], tete, 0.38), C.organe, 4));
  f.push(...flecheTelescopique([0, hp], tete, 0.95, 4));
  f.push(cercle(0, hp, 0.2, C.noir, C.noir));
  // Cabine de grue, côté flèche, devant
  f.push(poly([[0.3, hp - 0.95], [0.3, hp + 0.55], [0.5, hp + 0.78], [1.45, hp + 0.78], [1.65, hp - 0.95]], C.corps));
  f.push(poly([[0.5, hp - 0.45], [0.5, hp + 0.55], [0.62, hp + 0.65], [1.38, hp + 0.65], [1.5, hp - 0.45]], C.vitre));
  return { formes: f, pied: [0, hp] as Pt, tete };
}

function elevGrueChenilles(d: DimsResolues, tete: Pt) {
  const f: Forme[] = [];
  const hp = d.hauteurPiedM;
  const L = d.longueurPorteurM;
  // Train de chenilles (vu de côté) : carter, galets, barbotin et poulie de tension
  f.push(poly([[-L / 2 - 0.1, 0.55], [-L / 2 + 0.5, 0], [L / 2 - 0.5, 0], [L / 2 + 0.1, 0.55], [L / 2 - 0.3, 1.25], [-L / 2 + 0.3, 1.25]], C.noir));
  f.push(poly([[-L / 2 + 0.4, 0.22], [L / 2 - 0.4, 0.22], [L / 2 - 0.4, 1.0], [-L / 2 + 0.4, 1.0]], C.corps, C.corps, 0.8));
  for (let i = 0; i < 6; i++) f.push(cercle(-L / 2 + 0.8 + (i * (L - 1.6)) / 5, 0.45, 0.2, C.acier, C.noir, 0.8));
  f.push(cercle(-L / 2 + 0.3, 0.62, 0.42, C.organe, C.noir), cercle(L / 2 - 0.3, 0.62, 0.42, C.organe, C.noir));
  // Châssis porteur et partie tournante
  f.push(boite(-2.2, 1.25, 2.2, 1.85, C.corps));
  f.push(chanfrein(-3.6, 1.85, 1.7, 3.25, 0.25, C.corps));
  // Contrepoids empilé à l'arrière
  f.push(chanfrein(-5.3, 1.7, -3.55, 3.4, 0.15, C.organe));
  f.push(ligne([-5.3, 2.25], [-3.55, 2.25], C.noir, 1), ligne([-5.3, 2.8], [-3.55, 2.8], C.noir, 1));
  // Mât en A + haubanage de flèche
  const mat: Pt = [-1.6, hp + 2.3];
  f.push(poly([[-2.3, 3.2], [mat[0] - 0.15, mat[1]], [mat[0] + 0.15, mat[1]], [-0.9, 3.2]], C.corps));
  f.push(ligne(mat, lerp([0, hp], tete, 0.62), C.noir, 1.2));
  // Flèche treillis
  f.push(...treillis([0, hp], tete, 1.35, 0.55, 1.15));
  f.push(cercle(tete[0], tete[1], 0.22, C.flecheFonce, C.noir), cercle(0, hp, 0.24, C.noir));
  // Cabine
  f.push(poly([[0.4, 3.25], [0.4, 4.35], [0.55, 4.5], [1.5, 4.5], [1.7, 3.25]], C.corps));
  f.push(poly([[0.58, 3.6], [0.58, 4.3], [0.7, 4.38], [1.4, 4.38], [1.52, 3.6]], C.vitre));
  return { formes: f, pied: [0, hp] as Pt, tete };
}

function elevGrueTour(d: DimsResolues, tete: Pt) {
  const f: Forme[] = [];
  const H = Math.max(tete[1], 6);
  const r = Math.max(tete[0], 0);
  const jl = r + Math.max(3, r * 0.2);
  const cj = Math.max(4, jl * 0.3);
  const jb = H; // axe de la flèche (treillis centré sur cette ligne)
  // Embase et mât treillis
  f.push(boite(-d.largeurPorteurM / 2, 0, d.largeurPorteurM / 2, 0.7, C.corps));
  f.push(...treillis([0, 0.7], [0, jb - 1.1], 1.6, 1.6, 1.3));
  f.push(boite(-0.95, jb - 1.1, 0.95, jb - 0.5, C.organe));
  // Flèche horizontale, contre-flèche et porte-flèche
  f.push(...treillis([0, jb], [jl, jb], 1.1, 0.5, 1.3));
  f.push(...treillis([0, jb], [-cj, jb], 1.1, 0.5, 1.3));
  const apex: Pt = [0, H + Math.max(2.5, jl * 0.1)];
  f.push(poly([[-0.55, jb + 0.55], [0, apex[1]], [0.55, jb + 0.55]], C.vitre, C.flecheFonce));
  f.push(ligne(apex, [jl, jb + 0.5], C.noir, 1.2), ligne(apex, [-cj, jb + 0.5], C.noir, 1.2));
  // Contrepoids, cabine, chariot
  f.push(boite(-cj, jb - 0.8, -cj + Math.min(2.4, cj * 0.5), jb + 0.05, C.corps));
  f.push(boite(0.95, jb - 1.8, 2.1, jb - 0.6, C.corps), boite(1.1, jb - 1.55, 1.95, jb - 0.85, C.vitre));
  f.push(boite(r - 0.45, jb - 0.35, r + 0.45, jb + 0.1, C.flecheFonce));
  return { formes: f, pied: [0, jb] as Pt, tete: [r, jb - 0.35] as Pt };
}

function elevCamionBras(d: DimsResolues, st: Calage | null, tete: Pt) {
  const f: Forme[] = [];
  const hp = d.hauteurPiedM;
  const L = d.longueurPorteurM;
  const x0 = -5.6;
  const x1 = x0 + L;
  const sorti = st === "sortis";
  // Stabilisateurs : sous la grue et à l'arrière
  if (st !== null) for (const x of [-0.9, x1 - 0.9]) f.push(...stabilisateurElev(x, 1.15, sorti));
  // Camion : châssis, cabine, plateau, roues
  f.push(boite(x0, 0.75, x1, 1.3, C.corps));
  f.push(poly([[x0, 1.3], [x0, 3.1], [x0 + 0.5, 3.45], [x0 + 1.7, 3.45], [x0 + 2.0, 1.3]], C.acier));
  f.push(poly([[x0 + 0.4, 2.1], [x0 + 0.4, 3.2], [x0 + 0.58, 3.3], [x0 + 1.45, 3.3], [x0 + 1.65, 2.1]], C.vitre));
  f.push(boite(x0 + 2.3, 1.3, x1, 1.55, C.organe));
  f.push(boite(x0 + 2.3, 1.55, x1, 2.1, C.clair));
  for (const x of [x0 + 1.2, x1 - 2.6, x1 - 1.3]) f.push(...roue(x, 0.62, 0.62));
  // Colonne et embase de grue
  f.push(boite(-0.55, 1.55, 0.55, hp - 0.05, C.corps));
  // Flèche articulée : bras principal, genou, bras télescopique
  const dd = dist([0, hp], tete) || 1;
  const m = lerp([0, hp], tete, 0.42);
  const n = norm([0, hp], tete);
  const coude: Pt = add(m, n[1] < 0 ? [-n[0], -n[1]] : n, Math.min(0.18 * dd, 1.2));
  f.push(ligne([0.1, 1.9], lerp([0, hp], coude, 0.5), C.organe, 4));
  f.push(poly(bande([0, hp], coude, 0.62, 0.5), C.fleche, C.flecheFonce));
  f.push(ligne(lerp([0, hp], coude, 0.75), lerp(coude, tete, 0.22), C.organe, 3.5));
  f.push(...flecheTelescopique(coude, tete, 0.46, 3));
  f.push(cercle(coude[0], coude[1], 0.3, C.flecheFonce, C.noir), cercle(0, hp, 0.2, C.noir));
  return { formes: f, pied: [0, hp] as Pt, tete };
}

function elevTelescopique(d: DimsResolues, st: Calage | null, tete: Pt, acc: Accessoire | null, rotatif: boolean) {
  const f: Forme[] = [];
  const hp = d.hauteurPiedM;
  const L = d.longueurPorteurM;
  const x0 = rotatif ? -L / 2 : -0.9;
  const x1 = x0 + L;
  const sorti = st === "sortis";
  const roues: number[] = rotatif ? [-L / 2 + 0.95, L / 2 - 0.95] : [x0 + 1.25, x1 - 1.0];
  if (st !== null) for (const x of rotatif ? [-d.calage.longueurM / 2 + 0.2, d.calage.longueurM / 2 - 0.2] : [x0 + 0.35, x1 - 0.3]) f.push(...stabilisateurElev(x, 0.95, sorti));
  // Châssis, capot, roues
  f.push(boite(x0, 0.55, x1, 1.3, C.corps));
  f.push(chanfrein(x0 + 0.1, 1.3, x1 - 0.1, rotatif ? 1.45 : 1.55, 0.1, C.corps));
  for (const x of roues) f.push(...roue(x, 0.62, 0.62));
  if (rotatif) {
    // Tourelle tournante, contrepoids, cabine côté flèche
    f.push(chanfrein(-1.9, 1.45, 1.6, hp + 0.1, 0.18, C.corps));
    f.push(boite(-2.5, 1.45, -1.9, hp, C.organe));
  } else {
    f.push(boite(x0, 1.3, x0 + 0.6, hp + 0.25, C.organe));
  }
  // Vérin de relevage + flèche télescopique
  const vx = rotatif ? 0.9 : 1.15;
  f.push(ligne([vx, rotatif ? 1.6 : 1.4], lerp([0, hp], tete, 0.42), C.organe, 4));
  f.push(...flecheTelescopique([0, hp], tete, 0.62, 3));
  f.push(cercle(0, hp, 0.2, C.noir));
  // Cabine latérale
  const cx0 = rotatif ? 0.5 : 0.85;
  const cy0 = rotatif ? 1.45 : 1.3;
  f.push(poly([[cx0, cy0], [cx0, cy0 + 1.65], [cx0 + 0.15, cy0 + 1.85], [cx0 + 1.0, cy0 + 1.85], [cx0 + 1.1, cy0]], C.acier));
  f.push(poly([[cx0 + 0.15, cy0 + 0.45], [cx0 + 0.15, cy0 + 1.6], [cx0 + 0.25, cy0 + 1.7], [cx0 + 0.9, cy0 + 1.7], [cx0 + 0.95, cy0 + 0.45]], C.vitre));
  // Accessoire en bout de flèche
  const u: Pt = [(tete[0] - 0) / (dist([0, hp], tete) || 1), (tete[1] - hp) / (dist([0, hp], tete) || 1)];
  if (acc === "fourches") {
    f.push(boite(tete[0] - 0.12, tete[1] - 1.0, tete[0] + 0.12, tete[1] + 0.1, C.corps));
    f.push(boite(tete[0] - 0.12, tete[1] - 1.0, tete[0] + 1.1, tete[1] - 0.88, C.corps));
  } else if (acc === "potence") {
    f.push(poly(bande(tete, add(tete, u, 0.9), 0.22, 0.14), C.corps));
  }
  return { formes: f, pied: [0, hp] as Pt, tete };
}

function elevPelle(type: "pelle_pneus" | "pelle_chenilles" | "pelle_rail_route", d: DimsResolues, st: Calage | null, tete: Pt) {
  const f: Forme[] = [];
  const chenilles = type === "pelle_chenilles";
  const hautTrain = chenilles ? 1.0 : 1.3;
  const sorti = st === "sortis";
  // Train de roulement
  if (chenilles) {
    const L = d.longueurPorteurM;
    f.push(poly([[-L / 2 - 0.05, 0.5], [-L / 2 + 0.45, 0], [L / 2 - 0.45, 0], [L / 2 + 0.05, 0.5], [L / 2 - 0.3, 1.0], [-L / 2 + 0.3, 1.0]], C.noir));
    f.push(cercle(-L / 2 + 0.4, 0.5, 0.36, C.organe, C.noir), cercle(L / 2 - 0.4, 0.5, 0.36, C.organe, C.noir));
    for (let i = 0; i < 5; i++) f.push(cercle(-L / 2 + 1.0 + (i * (L - 2)) / 4, 0.3, 0.17, C.acier, C.noir, 0.8));
  } else {
    const L = d.longueurPorteurM;
    f.push(boite(-L / 2 + 0.3, 0.75, L / 2 - 0.3, hautTrain, C.corps));
    for (const x of [-L / 2 + 1.1, L / 2 - 1.1]) f.push(...roue(x, 0.65, 0.65));
    if (st !== null) {
      // lame avant + stabilisateurs arrière
      f.push(poly([[L / 2 - 0.25, hautTrain], [L / 2 + 0.55, 0.2], [L / 2 + 0.75, 0.2], [L / 2 + 0.75, hautTrain - 0.1]], C.organe));
      if (sorti) f.push(...stabilisateurElev(-L / 2 - 0.1, hautTrain, true));
    }
    if (type === "pelle_rail_route") {
      // galets de guidage rail aux deux extrémités + tronçon de voie
      f.push(boite(-L / 2 - 1.2, 0, L / 2 + 1.2, 0.16, C.acier));
      for (const x of [-L / 2 - 0.55, L / 2 + 0.55]) {
        f.push(boite(x - 0.05, 0.4, x + 0.05, hautTrain, C.organe, C.organe, 0.8));
        f.push(cercle(x, 0.34, 0.2, C.organe, C.noir), cercle(x, 0.34, 0.07, C.noir));
      }
    }
  }
  // Partie tournante : contrepoids, capot, cabine
  const y0 = hautTrain;
  f.push(boite(-1.55, y0, 0.85, y0 + 0.15, C.noir));
  f.push(poly([[-2.05, y0 + 0.15], [-2.05, y0 + 1.6], [-1.6, y0 + 1.95], [-0.45, y0 + 1.95], [0.85, y0 + 1.15], [0.85, y0 + 0.15]], C.corps));
  f.push(chanfrein(-2.05, y0 + 0.25, -1.35, y0 + 1.55, 0.2, C.organe));
  const pied: Pt = [0.65, y0 + 0.55];
  // Flèche monobloc coudée + balancier (cinématique à deux barres)
  const l2 = d.balancierM;
  const cin = cinematiquePelle(pied, tete, l2 * 1.95, l2);
  const milieu = lerp(pied, cin.coude, 0.5);
  const nB = norm(pied, cin.coude);
  const bossage = add(milieu, nB[1] < 0 ? [-nB[0], -nB[1]] : nB, 0.28);
  f.push(ligne([0.1, y0 + 0.2], lerp(pied, cin.coude, 0.45), C.organe, 5));
  f.push(poly(bandePolyligne([pied, bossage, cin.coude], [0.5, 0.7, 0.45]), C.fleche, C.flecheFonce));
  f.push(ligne(lerp(pied, bossage, 0.7), lerp(cin.coude, tete, 0.18), C.organe, 4));
  f.push(poly(bande(cin.coude, tete, 0.42, 0.3), C.fleche, C.flecheFonce));
  f.push(cercle(cin.coude[0], cin.coude[1], 0.2, C.noir), cercle(pied[0], pied[1], 0.2, C.noir));
  // Attache rapide + anneau de levage
  f.push(poly([[tete[0] - 0.22, tete[1] + 0.05], [tete[0] + 0.22, tete[1] + 0.05], [tete[0], tete[1] - 0.3]], C.corps));
  f.push(cercle(tete[0], tete[1] - 0.42, 0.13, undefined, C.noir, 2));
  // Cabine (au premier plan)
  f.push(poly([[-0.05, y0 + 1.05], [-0.05, y0 + 2.2], [0.1, y0 + 2.4], [0.95, y0 + 2.4], [1.1, y0 + 1.05]], C.corps));
  f.push(poly([[0.08, y0 + 1.25], [0.08, y0 + 2.15], [0.17, y0 + 2.28], [0.9, y0 + 2.28], [1.0, y0 + 1.25]], C.vitre));
  return { formes: f, pied, tete: [tete[0], tete[1] - 0.42] as Pt };
}

function elevChariot(d: DimsResolues, tete: Pt) {
  const f: Forme[] = [];
  const forkY = Math.max(tete[1], 0.1);
  const mastH = Math.max(3.2, forkY + 1.3);
  const ax = tete[0] - 1.05; // essieu avant ; centre de charge à la portée saisie
  const xm = ax + 0.45;
  const L = d.longueurPorteurM;
  // Contrepoids, capot, plancher
  f.push(poly([[ax - L + 0.5, 0.3], [ax - L + 0.5, 1.2], [ax - L + 1.0, 1.45], [ax - 0.1, 1.0], [ax - 0.1, 0.3]], C.corps));
  f.push(chanfrein(ax - L + 0.2, 0.3, ax - L + 1.1, 1.4, 0.25, C.organe));
  // Protège-conducteur et siège
  f.push(boite(ax - 1.25, 1.0, ax - 0.55, 1.2, C.noir));
  f.push(ligne([ax - 1.2, 1.2], [ax - 1.2, 2.15], C.corps, 3), ligne([ax - 0.25, 1.15], [ax - 0.25, 2.15], C.corps, 3));
  f.push(boite(ax - 1.35, 2.15, ax - 0.1, 2.25, C.corps));
  // Roues
  f.push(...roue(ax, 0.42, 0.42), ...roue(ax - L + 0.85, 0.34, 0.34));
  // Mât et tablier, fourches
  f.push(boite(xm - 0.07, 0.35, xm + 0.07, mastH, C.corps));
  f.push(boite(xm + 0.1, 0.45, xm + 0.2, mastH - 0.2, C.organe));
  f.push(ligne([xm - 0.35, 0.8], [xm - 0.05, mastH * 0.5], C.organe, 3));
  f.push(boite(xm + 0.2, forkY - 0.05, xm + 0.32, forkY + 0.9, C.corps));
  f.push(poly([[xm + 0.2, forkY - 0.12], [xm + 1.45, forkY - 0.12], [xm + 1.55, forkY - 0.06], [xm + 0.2, forkY + 0.04]], C.corps));
  return { formes: f, pied: [xm, forkY] as Pt, tete: [tete[0], forkY] as Pt, sansCable: true };
}

/** Silhouette de présentation (vignettes) : flèche à ~58° ou posture type de la famille. */
export function silhouetteVignette(type: TypeMachine): SortieElevation {
  const { hauteurPiedM } = profilElevation(type);
  let tete: { x: number; y: number };
  if (type === "grue_tour") tete = { x: 7, y: 9 };
  else if (type === "chariot_elevateur") tete = { x: 1.5, y: 1.0 };
  else if (type.startsWith("pelle")) tete = { x: 4.8, y: 2.6 };
  else if (type.startsWith("telescopique")) tete = { x: 4.5, y: hauteurPiedM + 3.5 };
  else if (type === "grue_auxiliaire") tete = { x: 5, y: hauteurPiedM + 5 };
  else tete = { x: 6.5, y: hauteurPiedM + 10.5 };
  return silhouetteElevation({ type, tete });
}

// ---------------------------------------------------------------------------
// Moufle / crochet (dessiné par la vue, à la position pilotée par la géométrie)
// ---------------------------------------------------------------------------

/** Moufle + crochet dont le point d'attache (haut) est en (x, y). Hauteur 1,25 m. */
export function formesCrochet(x: number, y: number): Forme[] {
  return [
    boite(x - 0.3, y - 0.7, x + 0.3, y - 0.1, C.corps),
    cercle(x, y - 0.4, 0.09, C.clair, C.clair, 1),
    ligne([x, y - 0.7], [x, y - 0.9], C.noir, 3),
    { k: "poly", pts: [[x - 0.14, y - 0.9], [x + 0.14, y - 0.9], [x + 0.24, y - 1.1], [x + 0.06, y - 1.25], [x - 0.14, y - 1.2], [x - 0.24, y - 1.05]], stroke: C.noir, sw: 2.6 },
  ];
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
