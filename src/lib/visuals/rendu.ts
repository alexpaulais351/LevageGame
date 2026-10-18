/**
 * Rendu « illustration technique constructeur » des engins (vue de profil) : matières en dégradés, ombres portées,
 * reflets métalliques, contours fins et organes réutilisables (roues, vérins, cabines, chenilles, flèches…).
 *
 * Fonctions PURES en coordonnées MÉTRIQUES (x vers la droite, y vers le haut, 0 = sol). Les couleurs sont toutes
 * issues de la charte (`VINCI`, `VERDICT`) ; le relief vient des dégradés et de l'opacité, jamais d'une teinte hors palette.
 */
import { VERDICT, VINCI } from "@/lib/design-tokens";

import type { Arret, Degrade, Forme, Peinture, Pt } from "./silhouettes";

export const GRIS_FONCE = "#5A5A5A"; // texte secondaire charte VINCI
export const GRIS_MOYEN = "#B5ABA1"; // gris VINCI
const BORDURE = VINCI.tableBorder; // #DCDCDC
const BLANC = VINCI.blanc;
const NOIR = VINCI.noir;

/** Épaisseur des contours (px) : fins, comme une planche constructeur. */
export const TRAIT = 0.55;

// ---------------------------------------------------------------------------
// Géométrie
// ---------------------------------------------------------------------------

export const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Normale unitaire (rotation +90°) du segment a → b. */
export const norm = (a: Pt, b: Pt): Pt => {
  const d = dist(a, b) || 1;
  return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
};
/** Normale orientée vers le haut (y ≥ 0). */
export const normHaut = (a: Pt, b: Pt): Pt => {
  const n = norm(a, b);
  return n[1] < 0 || (n[1] === 0 && n[0] > 0) ? [-n[0], -n[1]] : n;
};
export const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];
export const unit = (a: Pt, b: Pt): Pt => {
  const d = dist(a, b) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
};

/** Bande de largeur variable entre `a` (largeur `wa`) et `b` (largeur `wb`). */
export function bande(a: Pt, b: Pt, wa: number, wb: number): Pt[] {
  const n = norm(a, b);
  return [add(a, n, wa / 2), add(b, n, wb / 2), add(b, n, -wb / 2), add(a, n, -wa / 2)];
}

/** Bande le long d'une polyligne, largeur par sommet (normales moyennées). */
export function bandePolyligne(pts: Pt[], w: number[]): Pt[] {
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

/** Points d'un arc de cercle (degrés, sens trigonométrique). */
export function arc(c: Pt, r: number, a0: number, a1: number, n = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return out;
}

export function ellipse(c: Pt, rx: number, ry: number, n = 32): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    out.push([c[0] + rx * Math.cos(a), c[1] + ry * Math.sin(a)]);
  }
  return out;
}

/** Rectangle à coins arrondis (rayon borné à la demi-dimension). */
export function rectArrondi(x0: number, y0: number, x1: number, y1: number, r: number): Pt[] {
  const k = Math.max(0, Math.min(r, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2));
  if (k === 0) return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  return [
    ...arc([x1 - k, y0 + k], k, 270, 360, 4),
    ...arc([x1 - k, y1 - k], k, 0, 90, 4),
    ...arc([x0 + k, y1 - k], k, 90, 180, 4),
    ...arc([x0 + k, y0 + k], k, 180, 270, 4),
  ];
}

/** Symétrie horizontale autour de `xc` (dégradés compris) : dessine un organe « vers l'avant » puis le retourne. */
export function miroirX(formes: readonly Forme[], xc: number): Forme[] {
  const X = (x: number) => 2 * xc - x;
  const P = (p: Pt): Pt => [X(p[0]), p[1]];
  const peint = (f?: Peinture): Peinture | undefined =>
    f === undefined || typeof f === "string" ? f : f.k === "lin" ? { ...f, a: P(f.a), b: P(f.b) } : { ...f, c: P(f.c) };
  return formes.map((f): Forme => {
    if (f.k === "poly") return { ...f, pts: f.pts.map(P), fill: peint(f.fill) };
    if (f.k === "circle") return { ...f, cx: X(f.cx), fill: peint(f.fill) };
    return { ...f, x1: X(f.x1), x2: X(f.x2) };
  });
}

// ---------------------------------------------------------------------------
// Matières (arrêts de dégradé — palette de la charte uniquement)
// ---------------------------------------------------------------------------

export const MAT = {
  /** Tôlerie peinte blanche, vernis satiné. */
  peinture: [[0, BLANC], [0.38, VINCI.grisLight], [0.62, BLANC], [0.86, BORDURE], [1, VINCI.gris]],
  /** Bleu VINCI métallisé (flèche, éléments structurels). */
  bleu: [[0, VINCI.bleuLight], [0.2, VINCI.bleuXLight], [0.3, VINCI.bleuLight], [0.66, VINCI.bleu], [1, VINCI.bleuDark]],
  /** Acier brut / châssis peint foncé. */
  acier: [[0, VINCI.gris], [0.3, GRIS_FONCE], [0.75, "#2A2A2A"], [1, NOIR]],
  /** Tige de vérin chromée. */
  chrome: [[0, GRIS_FONCE], [0.22, BLANC], [0.4, VINCI.grisLight], [0.72, VINCI.gris], [1, GRIS_FONCE]],
  /** Fonte de contrepoids. */
  lest: [[0, BORDURE], [0.25, VINCI.gris], [0.7, GRIS_FONCE], [1, "#2A2A2A"]],
  /** Vitrage teinté. */
  vitre: [[0, VINCI.bleuXLight, 0.95], [0.45, VINCI.bleuLight, 0.85], [1, VINCI.bleuDark, 0.95]],
  /** Gomme de pneu / patins (dégradé radial). */
  gomme: [[0, GRIS_FONCE], [0.62, "#1E1E1E"], [0.9, NOIR], [1, "#2A2A2A"]],
  /** Jante peinte (dégradé radial). */
  jante: [[0, BLANC], [0.5, VINCI.grisLight], [0.85, VINCI.gris], [1, GRIS_FONCE]],
  /** Gyrophare ambre (dégradé radial). */
  ambre: [[0, VERDICT.jauneBg], [0.35, VERDICT.jaune], [1, VERDICT.jaune]],
  /** Feu rouge / balisage. */
  rouge: [[0, VINCI.rougeXLight], [0.4, VINCI.rouge], [1, VINCI.rougeDark]],
  /** Treillis métallique galvanisé (grue à tour). */
  galva: [[0, BLANC], [0.3, VINCI.grisLight], [0.7, VINCI.gris], [1, GRIS_FONCE]],
} satisfies Record<string, readonly Arret[]>;
export type Matiere = keyof typeof MAT;

export const lin = (a: Pt, b: Pt, m: Matiere | readonly Arret[]): Degrade => ({ k: "lin", a, b, arrets: typeof m === "string" ? MAT[m] : m });
export const rad = (c: Pt, r: number, m: Matiere | readonly Arret[]): Degrade => ({ k: "rad", c, r, arrets: typeof m === "string" ? MAT[m] : m });

/** Dégradé transversal d'une pièce allongée a → b de largeur `w` (face éclairée vers le haut). */
export function travers(a: Pt, b: Pt, w: number, m: Matiere): Degrade {
  const c = lerp(a, b, 0.5);
  const n = normHaut(a, b);
  return lin(add(c, n, w / 2), add(c, n, -w / 2), m);
}

/** Dégradé vertical (haut éclairé) sur [y0, y1]. */
export const vertical = (y0: number, y1: number, m: Matiere, x = 0): Degrade => lin([x, y1], [x, y0], m);

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const piece = (pts: Pt[], fill: Peinture, stroke: string = NOIR, sw = TRAIT): Forme => ({ k: "poly", pts, fill, stroke, sw });
export const aplat = (pts: Pt[], fill: string, op: number): Forme => ({ k: "poly", pts, fill, op });
export const rond = (c: Pt, r: number, fill: Peinture | undefined, stroke: string | undefined = NOIR, sw = TRAIT): Forme => ({ k: "circle", cx: c[0], cy: c[1], r, fill, stroke, sw });
export const trait = (a: Pt, b: Pt, stroke: string, w = 1, op?: number, dash?: string): Forme => ({ k: "line", x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke, w, op, dash });
export function polyligne(pts: Pt[], stroke: string, w = 1, op?: number): Forme[] {
  const out: Forme[] = [];
  for (let i = 1; i < pts.length; i++) out.push(trait(pts[i - 1], pts[i], stroke, w, op));
  return out;
}

/** Caisson rectangulaire (coins arrondis) en dégradé vertical. */
export function caisson(x0: number, y0: number, x1: number, y1: number, m: Matiere, r = 0.04, stroke: string = NOIR): Forme {
  return piece(rectArrondi(x0, y0, x1, y1, r), vertical(y0, y1, m, x0), stroke);
}

/** Barre / profilé a → b de largeurs `wa` → `wb`, dégradé transversal. */
export function barre(a: Pt, b: Pt, wa: number, wb: number, m: Matiere, stroke: string = NOIR): Forme {
  return piece(bande(a, b, wa, wb), travers(a, b, Math.max(wa, wb), m), stroke);
}

/** Liseré de reflet (blanc translucide) le long d'une pièce. */
export const reflet = (a: Pt, b: Pt, w = 1.2, op = 0.55): Forme => trait(a, b, BLANC, w, op);

/** Ombre portée au sol (deux ellipses translucides, la plus dense au centre). */
export function ombre(x0: number, x1: number, ry = 0.16): Forme[] {
  const c: Pt = [(x0 + x1) / 2, 0.01];
  const rx = Math.abs(x1 - x0) / 2;
  return [aplat(ellipse(c, rx * 1.06, ry * 1.25), NOIR, 0.08), aplat(ellipse(c, rx * 0.92, ry * 0.8), NOIR, 0.14)];
}

/** Rayures de signalisation rouge / blanc dans un cadre (contrepoids, bavettes). */
export function chevrons(x0: number, y0: number, x1: number, y1: number, pas = 0.22): Forme[] {
  const out: Forme[] = [piece([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], BLANC, NOIR, TRAIT)];
  const h = y1 - y0;
  const clamp = (x: number) => Math.min(x1, Math.max(x0, x));
  for (let xa = x0 - h; xa < x1; xa += 2 * pas) {
    const pts: Pt[] = [
      [clamp(xa), y0],
      [clamp(xa + pas), y0],
      [clamp(xa + pas + h), y1],
      [clamp(xa + h), y1],
    ];
    if (Math.abs(pts[1][0] - pts[0][0]) + Math.abs(pts[2][0] - pts[3][0]) > 1e-6) out.push({ k: "poly", pts, fill: VINCI.rouge });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Organes
// ---------------------------------------------------------------------------

/** Roue (pneu + jante + moyeu) posée au sol, centre en (cx, r). `jante` = proportion du diamètre. */
export function roue(cx: number, r: number, jante = 0.56): Forme[] {
  const c: Pt = [cx, r];
  const out: Forme[] = [rond(c, r, rad([cx - r * 0.25, r * 1.25], r * 1.15, "gomme"))];
  // Sculptures visibles sur la bande de roulement
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * 2 * Math.PI;
    const u: Pt = [Math.cos(a), Math.sin(a)];
    out.push(trait(add(c, u, r * 0.9), add(c, u, r), GRIS_FONCE, 0.6, 0.9));
  }
  out.push(rond(c, r * 0.8, undefined, GRIS_FONCE, 0.5));
  out.push(rond(c, r * jante, rad([cx - r * 0.18, r * 1.18], r * jante * 1.2, "jante"), NOIR, TRAIT));
  out.push(rond(c, r * jante * 0.78, lin([cx, r + r * jante], [cx, r - r * jante], "acier"), GRIS_FONCE, 0.4));
  out.push(rond(c, r * jante * 0.42, rad([cx - r * 0.06, r * 1.06], r * jante * 0.5, "chrome"), NOIR, 0.4));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * Math.PI;
    out.push(rond([cx + Math.cos(a) * r * jante * 0.6, r + Math.sin(a) * r * jante * 0.6], r * 0.035, VINCI.grisLight, GRIS_FONCE, 0.3));
  }
  out.push(rond(c, r * 0.07, NOIR, undefined));
  // Reflet du flanc
  out.push(aplat(bandePolyligne(arc(c, r * 0.86, 105, 165, 8), new Array(9).fill(r * 0.07)), BLANC, 0.16));
  return out;
}

/** Passage de roue (garde-boue) : arc tôlé au-dessus d'une roue de rayon r. */
export function gardeBoue(cx: number, r: number, m: Matiere = "acier"): Forme[] {
  const c: Pt = [cx, r];
  const ext = arc(c, r * 1.16, 0, 180, 14);
  const int = arc(c, r * 1.06, 180, 0, 14);
  return [piece([...ext, ...int], travers([cx, r * 2.2], [cx, r * 2.2 + 0.01], r * 0.2, m), NOIR, TRAIT)];
}

/**
 * Vérin hydraulique de `base` (fût, côté chape fixe) à `bout` (tige), diamètre `d`.
 * `course` = part de la longueur occupée par le fût. Fût peint, tige chromée, chapes, flexibles.
 */
export function verin(base: Pt, bout: Pt, d: number, opts: { course?: number; fut?: Matiere; flexibles?: boolean } = {}): Forme[] {
  const L = dist(base, bout);
  if (L < 1e-6) return [];
  const u = unit(base, bout);
  const n = normHaut(base, bout);
  const k = Math.min(0.85, Math.max(0.3, opts.course ?? 0.55));
  const p1 = add(base, u, L * k);
  const out: Forme[] = [];
  // Tige chromée
  out.push(barre(add(p1, u, -0.05), bout, d * 0.55, d * 0.55, "chrome"));
  out.push(reflet(add(add(p1, u, 0.02), n, d * 0.12), add(add(bout, u, -d * 0.4), n, d * 0.12), 0.9, 0.85));
  // Fût
  out.push(barre(base, p1, d, d, opts.fut ?? "acier"));
  out.push(reflet(add(add(base, u, d * 0.6), n, d * 0.22), add(add(p1, u, -d * 0.35), n, d * 0.22), 1, 0.45));
  // Tête de fût (collier) et culot
  out.push(barre(add(p1, u, -Math.min(0.16, L * 0.06)), p1, d * 1.18, d * 1.18, "acier"));
  out.push(barre(base, add(base, u, Math.min(0.14, L * 0.05)), d * 1.12, d * 1.12, "acier"));
  // Chapes et axes
  for (const p of [base, bout]) {
    out.push(rond(p, d * 0.62, rad(add(p, [-1, 1], d * 0.2), d * 0.8, "acier"), NOIR, TRAIT));
    out.push(rond(p, d * 0.26, rad(add(p, [-1, 1], d * 0.08), d * 0.3, "chrome"), NOIR, 0.4));
  }
  // Flexibles hydrauliques : du culot vers la tête de fût, en boucle au-dessus du fût
  if (opts.flexibles !== false && L > d * 3) {
    const o = d * 0.62;
    const a0 = add(add(base, u, d * 0.5), n, o * 0.9);
    const a1 = add(add(base, u, L * k * 0.45), n, o * 1.35);
    const a2 = add(add(p1, u, -d * 0.6), n, o * 0.95);
    const b0 = add(add(base, u, d * 0.75), n, o * 1.2);
    const b1 = add(add(base, u, L * k * 0.5), n, o * 1.75);
    const b2 = add(add(p1, u, -d * 0.9), n, o * 1.2);
    for (const [pts, w] of [[[a0, a1, a2], 1.6], [[b0, b1, b2], 1.3]] as const) {
      out.push(...polyligne([...pts], NOIR, w));
      out.push(...polyligne([...pts].map((p) => add(p, n, d * 0.03)), GRIS_FONCE, w * 0.35, 0.9));
    }
    out.push(rond(a2, d * 0.13, lin(add(a2, n, 0.05), add(a2, n, -0.05), "chrome"), NOIR, 0.4));
  }
  return out;
}

/** Poulie (réa) de câble : jante chromée, gorge et axe. */
export function poulie(c: Pt, r: number): Forme[] {
  return [
    rond(c, r, rad(add(c, [-1, 1], r * 0.3), r * 1.2, "chrome"), NOIR, TRAIT),
    rond(c, r * 0.78, undefined, GRIS_FONCE, 0.5),
    rond(c, r * 0.32, rad(c, r * 0.4, "acier"), NOIR, 0.4),
  ];
}

/** Gyrophare ambre posé en (x, y). */
export function gyrophare(x: number, y: number, r = 0.11): Forme[] {
  const dome: Pt[] = [...arc([x, y + 0.06], r, 0, 180, 10)];
  return [
    caisson(x - r * 1.15, y, x + r * 1.15, y + 0.07, "acier", 0.01),
    piece(dome, rad([x - r * 0.3, y + 0.06 + r * 0.7], r * 1.3, "ambre"), NOIR, TRAIT),
    trait([x - r * 0.95, y + 0.06 + r * 0.35], [x + r * 0.95, y + 0.06 + r * 0.35], VERDICT.jauneBg, 0.6, 0.8),
    aplat(ellipse([x - r * 0.35, y + 0.06 + r * 0.6], r * 0.22, r * 0.14, 10), BLANC, 0.8),
  ];
}

/** Feu (signalisation) rectangulaire. */
export function feu(x0: number, y0: number, x1: number, y1: number, m: "rouge" | "ambre" | "blanc" = "rouge"): Forme[] {
  const f: Peinture = m === "blanc" ? lin([x0, y1], [x1, y0], [[0, BLANC], [0.6, VINCI.bleuXLight], [1, VINCI.gris]]) : lin([x0, y1], [x0, y0], m);
  return [piece(rectArrondi(x0, y0, x1, y1, 0.015), f, NOIR, TRAIT), aplat(rectArrondi(x0 + (x1 - x0) * 0.15, y1 - (y1 - y0) * 0.4, x0 + (x1 - x0) * 0.5, y1 - (y1 - y0) * 0.12, 0.01), BLANC, 0.6)];
}

/** Échappement vertical chromé avec écran thermique et clapet. */
export function echappement(x: number, y0: number, y1: number, d = 0.12): Forme[] {
  const h = y1 - y0;
  return [
    barre([x, y0], [x, y1], d, d, "chrome"),
    barre([x, y0 + h * 0.15], [x, y0 + h * 0.7], d * 1.45, d * 1.45, "acier"),
    ...Array.from({ length: 5 }, (_, i) => trait([x - d * 0.6, y0 + h * (0.22 + i * 0.1)], [x + d * 0.6, y0 + h * (0.22 + i * 0.1)], NOIR, 0.5, 0.6)),
    piece([[x - d * 0.55, y1], [x + d * 0.75, y1 + d * 0.45], [x + d * 0.8, y1 + d * 0.3], [x - d * 0.5, y1 - d * 0.1]], lin([x, y1 + d], [x, y1], "acier"), NOIR, TRAIT),
    reflet([x - d * 0.18, y0 + h * 0.72], [x - d * 0.18, y1 - d * 0.2], 0.8, 0.9),
  ];
}

/** Garde-corps (main courante, lisse intermédiaire, potelets) de x0 à x1 sur un plancher en y. */
export function gardeCorps(x0: number, x1: number, y: number, h = 0.9, pas = 1.1): Forme[] {
  const out: Forme[] = [];
  const n = Math.max(1, Math.round(Math.abs(x1 - x0) / pas));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    out.push(trait([x, y], [x, y + h], NOIR, 1.7), trait([x, y], [x, y + h], VERDICT.jaune, 1.1));
  }
  for (const yy of [y + h, y + h * 0.5]) out.push(trait([x0, yy], [x1, yy], NOIR, 1.8), trait([x0, yy], [x1, yy], VERDICT.jaune, 1.2), trait([x0, yy + 0.01], [x1, yy + 0.01], BLANC, 0.4, 0.7));
  return out;
}

/** Marchepied / échelle d'accès (barreaux). */
export function echelle(x: number, y0: number, y1: number, l = 0.38): Forme[] {
  const out: Forme[] = [trait([x, y0], [x, y1], NOIR, 1.2), trait([x + l, y0], [x + l, y1], NOIR, 1.2)];
  for (let y = y0 + 0.18; y < y1; y += 0.3) out.push(trait([x, y], [x + l, y], GRIS_FONCE, 1.4), trait([x, y + 0.01], [x + l, y + 0.01], BLANC, 0.4, 0.6));
  return out;
}

/** Rétroviseur (bras + boîtier) accroché en (x, y), tourné vers l'avant (+x). */
export function retro(x: number, y: number): Forme[] {
  return [
    trait([x, y], [x + 0.2, y + 0.18], NOIR, 1.1),
    piece(rectArrondi(x + 0.16, y + 0.02, x + 0.27, y + 0.42, 0.03), lin([x + 0.16, y], [x + 0.27, y], "acier"), NOIR, TRAIT),
    trait([x + 0.25, y + 0.06], [x + 0.25, y + 0.38], BLANC, 0.5, 0.7),
  ];
}

/**
 * Cabine vitrée (vue de profil), avant vers +x : tôlerie, pare-brise incliné, montants, vitres de porte,
 * reflets, poignée, essuie-glace, rétroviseur. `avant = "gauche"` retourne la cabine.
 */
export function cabine(x0: number, y0: number, x1: number, y1: number, opts: { avant?: "droite" | "gauche"; peinture?: Matiere; retroviseur?: boolean; ceinture?: number; inclinaison?: number } = {}): Forme[] {
  const W = x1 - x0;
  const H = y1 - y0;
  const out: Forme[] = [];
  const ceint = y0 + H * (opts.ceinture ?? 0.4);
  const xf = x1 - W * (opts.inclinaison ?? 0.16);
  const r = Math.min(0.12, W * 0.08);
  // Coque
  const coque: Pt[] = [[x0, y0], ...arc([x0 + r, y1 - r], r, 180, 90, 4), [xf - r, y1], [xf + r * 0.3, y1 - r * 0.5], [x1, ceint], [x1, y0]];
  out.push(piece(coque, lin([x0, y1], [x0 + W * 0.25, y0], opts.peinture ?? "peinture")));
  // Vitrage (bordé), puis montants
  const g = Math.min(0.07, W * 0.05);
  const pente = (xf - x1) / (y1 - ceint || 1);
  const xAvant = (y: number) => x1 - g + (y - ceint) * pente;
  const yh = y1 - g * 1.2;
  const yb = ceint + g * 0.6;
  const verre: Pt[] = [[x0 + g, yb], [x0 + g, yh - r * 0.5], [x0 + g + r * 0.5, yh], [xAvant(yh) - g * 0.3, yh], [xAvant(yb), yb]];
  out.push(piece(verre, lin([x0 + g, yh], [x1, yb], "vitre"), NOIR, TRAIT));
  // Reflets obliques
  const hv = yh - yb;
  for (const [t, l, op] of [[0.18, 0.12, 0.38], [0.36, 0.05, 0.28], [0.7, 0.1, 0.22]] as const) {
    const xa = x0 + g + W * t;
    out.push(aplat([[xa, yb + hv * 0.08], [xa + W * l, yb + hv * 0.08], [xa + W * l + hv * 0.5, yh - hv * 0.06], [xa + hv * 0.5, yh - hv * 0.06]].map(([x, y]) => [Math.min(x, xAvant(y) - 0.02), y] as Pt), BLANC, op));
  }
  // Montants : arrière, milieu (porte), pare-brise
  const mont = Math.max(0.05, W * 0.045);
  const xb = x0 + W * 0.5;
  out.push(piece([[xb - mont / 2, yb - 0.01], [xb + mont / 2, yb - 0.01], [xb + mont / 2, yh + 0.01], [xb - mont / 2, yh + 0.01]], lin([xb - mont, 0], [xb + mont, 0], "acier"), NOIR, 0.35));
  out.push(piece([[xAvant(yb) - mont * 0.9, yb], [xAvant(yb) + 0.005, yb], [xAvant(yh) - g * 0.3 + 0.005, yh], [xAvant(yh) - g * 0.3 - mont * 0.9, yh]], lin([x1 - mont, 0], [x1, 0], "acier"), NOIR, 0.35));
  // Essuie-glace, joint de porte, poignée, marchepied
  out.push(trait([xAvant(yb) - mont, yb + 0.03], [xAvant(yb + hv * 0.55) - mont, yb + hv * 0.55], NOIR, 0.9));
  out.push(trait([xb, y0 + 0.06], [xb, yb], NOIR, 0.5, 0.8), trait([x0 + W * 0.07, y0 + 0.06], [x0 + W * 0.07, yb], NOIR, 0.4, 0.5));
  out.push(piece(rectArrondi(xb - W * 0.16, ceint - H * 0.1, xb - W * 0.05, ceint - H * 0.07, 0.01), lin([0, ceint], [0, ceint - 0.1], "chrome"), NOIR, 0.35));
  out.push(trait([x0 + 0.02, y1 - 0.015], [xf - r, y1 - 0.015], BLANC, 0.7, 0.8));
  if (opts.retroviseur !== false) out.push(...retro(x1 - 0.02, ceint + 0.02));
  return opts.avant === "gauche" ? miroirX(out, (x0 + x1) / 2) : out;
}

/** Train de chenilles (vue de profil) entre x0 et x1, hauteur h : patins, carter, galets, barbotin, poulie de tension. */
export function chenille(x0: number, x1: number, h: number): Forme[] {
  const out: Forme[] = [];
  const R = h / 2;
  const cg: Pt = [x0 + R, R];
  const cd: Pt = [x1 - R, R];
  const bord = [...arc(cd, R, -90, 90, 14), ...arc(cg, R, 90, 270, 14)];
  out.push(piece(bord, lin([x0, h], [x0, 0], [[0, GRIS_FONCE], [0.15, "#2A2A2A"], [0.85, NOIR], [1, "#2A2A2A"]]), NOIR, TRAIT));
  // Patins (tuiles) : arêtes sur le brin inférieur, le brin supérieur et autour des roues
  const pas = Math.max(0.17, h * 0.17);
  for (let x = cg[0]; x <= cd[0]; x += pas) {
    out.push(trait([x, 0], [x, h * 0.1], GRIS_FONCE, 1), trait([x, h], [x, h * 0.9], GRIS_FONCE, 1));
  }
  for (const [c, a0, a1] of [[cd, -90, 90], [cg, 90, 270]] as const) {
    const n = Math.max(4, Math.round((Math.PI * R) / pas));
    for (let i = 1; i < n; i++) {
      const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
      const u: Pt = [Math.cos(a), Math.sin(a)];
      out.push(trait(add(c, u, R), add(c, u, R * 0.8), GRIS_FONCE, 1));
    }
  }
  // Longeron (carter) entre les roues
  const yc0 = h * 0.24;
  const yc1 = h * 0.78;
  out.push(piece([[cg[0] + R * 0.4, yc0], [cd[0] - R * 0.4, yc0], [cd[0] - R * 0.1, yc1], [cg[0] + R * 0.1, yc1]], vertical(yc0, yc1, "acier"), NOIR, TRAIT));
  out.push(reflet([cg[0] + R * 0.2, yc1 - 0.02], [cd[0] - R * 0.2, yc1 - 0.02], 1.1, 0.5));
  // Galets inférieurs et rouleaux porteurs
  const nb = Math.max(4, Math.round((cd[0] - cg[0]) / (h * 0.75)));
  for (let i = 1; i < nb; i++) {
    const x = cg[0] + ((cd[0] - cg[0]) * i) / nb;
    out.push(rond([x, h * 0.2], h * 0.13, rad([x - h * 0.03, h * 0.24], h * 0.16, "chrome"), NOIR, TRAIT), rond([x, h * 0.2], h * 0.05, GRIS_FONCE, NOIR, 0.3));
  }
  for (const t of [0.33, 0.67]) {
    const x = cg[0] + (cd[0] - cg[0]) * t;
    out.push(rond([x, h * 0.84], h * 0.07, rad([x, h * 0.86], h * 0.09, "chrome"), NOIR, 0.4));
  }
  // Barbotin (arrière, denté) et poulie de tension (avant)
  const dents: Pt[] = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * 2 * Math.PI;
    const rr = i % 2 === 0 ? R * 0.86 : R * 0.72;
    dents.push([cg[0] + Math.cos(a) * rr, cg[1] + Math.sin(a) * rr]);
  }
  out.push(piece(dents, rad(add(cg, [-1, 1], R * 0.25), R, "acier"), NOIR, TRAIT));
  out.push(rond(cg, R * 0.55, rad(add(cg, [-1, 1], R * 0.15), R * 0.6, "lest"), NOIR, TRAIT), rond(cg, R * 0.2, rad(cg, R * 0.25, "chrome"), NOIR, 0.4));
  out.push(rond(cd, R * 0.8, rad(add(cd, [-1, 1], R * 0.25), R, "lest"), NOIR, TRAIT));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 2 * Math.PI;
    out.push(rond([cd[0] + Math.cos(a) * R * 0.5, cd[1] + Math.sin(a) * R * 0.5], R * 0.1, GRIS_FONCE, NOIR, 0.3));
  }
  out.push(rond(cd, R * 0.22, rad(cd, R * 0.25, "chrome"), NOIR, 0.4));
  return out;
}

/** Stabilisateur vu de profil à l'abscisse x : caisson de poutre, vérin vertical, semelle (sorti) — ou caisson seul. */
export function stabilisateur(x: number, yHaut: number, sorti: boolean, l = 0.9): Forme[] {
  const out: Forme[] = [caisson(x - l / 2, yHaut - 0.4, x + l / 2, yHaut, "peinture", 0.03), ...chevrons(x - l / 2 + 0.04, yHaut - 0.34, x + l / 2 - 0.04, yHaut - 0.24, 0.09)];
  if (!sorti) return out;
  out.push(...verin([x, yHaut - 0.35], [x, 0.17], 0.24, { course: 0.45, flexibles: false }));
  out.push(piece(rectArrondi(x - l * 0.62, 0, x + l * 0.62, 0.12, 0.03), vertical(0, 0.12, "acier"), NOIR, TRAIT));
  out.push(piece([[x - 0.16, 0.12], [x + 0.16, 0.12], [x + 0.1, 0.2], [x - 0.1, 0.2]], vertical(0.12, 0.2, "acier"), NOIR, TRAIT));
  return out;
}

/**
 * Flèche télescopique à caissons : éléments emboîtés (dégradé métallisé), colliers de sortie, liseré de reflet,
 * ombre sous l'arête inférieure et tête à réas centrée sur `b`.
 */
export function flecheTelescopique(a: Pt, b: Pt, w0: number, nb = 4, m: Matiere = "bleu"): Forme[] {
  const out: Forme[] = [];
  const L = dist(a, b);
  const u = unit(a, b);
  const n = normHaut(a, b);
  const cut = nb <= 3 ? [0, 0.45, 0.75, 1] : [0, 0.4, 0.64, 0.84, 1];
  const k = cut.length - 1;
  for (let i = 0; i < k; i++) {
    const t0 = i === 0 ? -Math.min(0.04, (w0 * 0.45) / Math.max(L, 1e-6)) : cut[i] - Math.min(0.04, (w0 * 0.6) / Math.max(L, 1e-6));
    const t1 = cut[i + 1];
    const w = w0 * (1 - 0.16 * i);
    const pa = add(a, u, L * t0);
    const pb = add(a, u, L * t1 - (i < k - 1 ? 0 : w * 0.35));
    out.push(barre(pa, pb, w, w * 0.97, m, VINCI.bleuDark));
    // ombre sous l'arête et liseré
    out.push(aplat(bande(add(pa, n, -w * 0.36), add(pb, n, -w * 0.35), w * 0.18, w * 0.17), NOIR, 0.16));
    out.push(reflet(add(pa, n, w * 0.33), add(pb, n, w * 0.32), 1, 0.7));
    // collier de sortie
    if (i < k - 1) out.push(barre(add(pb, u, -Math.min(0.25, L * 0.03)), pb, w * 1.04, w * 1.04, m, VINCI.bleuDark), trait(add(pb, n, w * 0.5), add(pb, n, -w * 0.5), VINCI.bleuDark, 0.8));
  }
  // Tête : flasques et réas
  const wt = w0 * (1 - 0.16 * (k - 1));
  const tete = [add(add(b, u, -wt * 0.9), n, wt * 0.55), add(add(b, u, wt * 0.15), n, wt * 0.42), add(add(b, u, wt * 0.32), n, -wt * 0.05), add(add(b, u, wt * 0.05), n, -wt * 0.5), add(add(b, u, -wt * 0.9), n, -wt * 0.5)];
  out.push(piece(tete, travers(add(b, u, -wt), b, wt, m), VINCI.bleuDark));
  out.push(...poulie(b, wt * 0.36));
  return out;
}

/** Flèche / mât en treillis : membrures tubulaires en dégradé, diagonales, montants d'extrémité. */
export function treillis(a: Pt, b: Pt, wa: number, wb: number, pas = 1.1, m: Matiere = "bleu"): Forme[] {
  const L = dist(a, b);
  const cellules = Math.max(3, Math.min(80, Math.round(L / pas)));
  const n = norm(a, b);
  const haut = (t: number): Pt => add(lerp(a, b, t), n, (wa + (wb - wa) * t) / 2);
  const bas = (t: number): Pt => add(lerp(a, b, t), n, -(wa + (wb - wa) * t) / 2);
  const fonce = m === "galva" ? GRIS_FONCE : VINCI.bleuDark;
  const diag = m === "galva" ? VINCI.gris : VINCI.bleuLight;
  const out: Forme[] = [];
  const ep = Math.max(0.06, Math.min(0.16, wa * 0.1));
  for (let i = 0; i < cellules; i++) {
    const t0 = i / cellules;
    const t1 = (i + 1) / cellules;
    const [p, q] = i % 2 === 0 ? [haut(t0), bas(t1)] : [bas(t0), haut(t1)];
    out.push(trait(p, q, fonce, 1.6), trait(p, q, diag, 0.8));
    // diagonales de la face arrière, en retrait
    out.push(trait(i % 2 === 0 ? bas(t0) : haut(t0), i % 2 === 0 ? haut(t1) : bas(t1), fonce, 0.6, 0.35));
    out.push(trait(haut(t0), bas(t0), fonce, 0.9));
  }
  for (const f of [haut, bas]) out.push(barre(f(0), f(1), ep, ep * 0.85, m, fonce), reflet(add(f(0), n, ep * 0.2), add(f(1), n, ep * 0.2), 0.7, 0.75));
  out.push(barre(haut(1), bas(1), ep * 1.2, ep * 1.2, m, fonce), barre(haut(0), bas(0), ep * 1.2, ep * 1.2, m, fonce));
  return out;
}

/** Contrepoids en dalles empilées (fonte), avec bande de signalisation sur la face arrière. */
export function lest(x0: number, y0: number, x1: number, y1: number, dalles: number, chevronsArriere = true): Forme[] {
  const out: Forme[] = [];
  const h = (y1 - y0) / dalles;
  for (let i = 0; i < dalles; i++) {
    const ya = y0 + i * h;
    out.push(piece(rectArrondi(x0, ya + 0.01, x1, ya + h - 0.01, 0.05), lin([x0, ya + h], [x0 + (x1 - x0) * 0.3, ya], "lest"), NOIR, TRAIT));
    out.push(reflet([x0 + 0.06, ya + h - 0.05], [x1 - 0.06, ya + h - 0.05], 0.8, 0.45));
  }
  if (chevronsArriere) out.push(...chevrons(x0, y0 + 0.05, x0 + Math.min(0.16, (x1 - x0) * 0.12), y1 - 0.05, 0.12));
  return out;
}

/** Cinématique plane à deux barres (pelles) : flèche L1 puis balancier L2 de P (pied) à T (tête), coude vers le haut. */
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
