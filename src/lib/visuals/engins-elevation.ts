/**
 * Engins en vue de profil, rendu « illustration technique constructeur » (dégradés, ombres, reflets, contours fins).
 *
 * Proportions réelles d'une machine courante de chaque famille (voir `DIMS_DEFAUT`), cotes connues de la machine
 * utilisées en priorité. Repère : x = 0 sur l'axe de rotation, y = 0 au sol, mètres. La flèche est pilotée par la
 * géométrie (pied → tête) : le dessin suit exactement la position calculée, il ne la modifie jamais.
 */
import { VINCI } from "@/lib/design-tokens";

import {
  GRIS_FONCE,
  TRAIT,
  add,
  arc,
  bandePolyligne,
  barre,
  cabine,
  caisson,
  chenille,
  chevrons,
  cinematiquePelle,
  dist,
  echappement,
  echelle,
  feu,
  flecheTelescopique,
  gardeBoue,
  gardeCorps,
  gyrophare,
  lerp,
  lest,
  lin,
  normHaut,
  ombre,
  piece,
  polyligne,
  poulie,
  rad,
  rectArrondi,
  reflet,
  rond,
  roue,
  stabilisateur,
  trait,
  treillis,
  unit,
  vertical,
  verin,
} from "./rendu";
import type { Accessoire, Calage, DimsResolues, Forme, Pt } from "./silhouettes";

const NOIR = VINCI.noir;

export interface DessinElevation {
  formes: Forme[];
  pied: Pt;
  tete: Pt;
  sansCable?: boolean;
}

/** Persiennes (grille d'aération) dans un cadre. */
function persiennes(x0: number, y0: number, x1: number, y1: number, n = 6): Forme[] {
  const out: Forme[] = [piece(rectArrondi(x0, y0, x1, y1, 0.03), vertical(y0, y1, "acier"), NOIR, TRAIT)];
  for (let i = 1; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / (n + 1);
    out.push(trait([x0 + 0.04, y], [x1 - 0.04, y], NOIR, 1.1), trait([x0 + 0.04, y + 0.012], [x1 - 0.04, y + 0.012], VINCI.gris, 0.5));
  }
  return out;
}

/** Tambour de treuil avec spires de câble. */
function treuil(c: Pt, r: number, l = 0.8): Forme[] {
  const out: Forme[] = [piece(rectArrondi(c[0] - l / 2, c[1] - r, c[0] + l / 2, c[1] + r, r * 0.25), vertical(c[1] - r, c[1] + r, "acier"), NOIR, TRAIT)];
  for (let i = 1; i < 10; i++) {
    const x = c[0] - l / 2 + (l * i) / 10;
    out.push(trait([x - 0.02, c[1] - r * 0.9], [x + 0.02, c[1] + r * 0.9], VINCI.gris, 0.7, 0.8));
  }
  out.push(caisson(c[0] - l / 2 - 0.06, c[1] - r * 1.15, c[0] - l / 2, c[1] + r * 1.15, "peinture", 0.01), caisson(c[0] + l / 2, c[1] - r * 1.15, c[0] + l / 2 + 0.06, c[1] + r * 1.15, "peinture", 0.01));
  return out;
}

/** Câble de levage (tête de flèche ↔ treuil). */
const cable = (a: Pt, b: Pt): Forme[] => [trait(a, b, NOIR, 0.9), trait(a, b, VINCI.gris, 0.3, 0.8)];

// ---------------------------------------------------------------------------
// Grue mobile tout-terrain (porteur 4 ou 5 essieux, flèche télescopique)
// ---------------------------------------------------------------------------

export function elevGrueMobile(d: DimsResolues, st: Calage | null, tete: Pt): DessinElevation {
  const f: Forme[] = [];
  const L = d.longueurPorteurM;
  const x0 = -L / 2;
  const x1 = L / 2;
  const hp = d.hauteurPiedM;
  const pied: Pt = [0, hp];
  const sorti = st === "sortis";
  const jackX = Math.max(d.calage.longueurM / 2, 1.5);
  const rr = 0.68;
  const nbAxes = L > 12 ? 5 : 4;
  const arriere = Array.from({ length: nbAxes - 2 }, (_, i) => x1 - 1.45 - (nbAxes - 3 - i) * 1.65);
  const axes = [x0 + 1.45, x0 + 3.0, ...arriere];

  f.push(...ombre(Math.min(x0, sorti ? -jackX - 0.6 : x0) - 0.2, Math.max(x1, sorti ? jackX + 0.6 : x1) + 0.2));
  // Châssis porteur
  f.push(caisson(x0 + 0.3, 0.92, x1 - 0.1, 1.42, "acier", 0.03));
  for (const x of axes) f.push(...roue(x, rr));
  // Carrosserie de plate-forme : coffres, passages de roue, échelle, feux arrière
  f.push(caisson(x0 + 2.15, 1.38, x1, 1.88, "peinture", 0.04));
  f.push(trait([x0 + 2.2, 1.6], [x1 - 0.05, 1.6], GRIS_FONCE, 0.5, 0.7), reflet([x0 + 2.25, 1.84], [x1 - 0.1, 1.84], 1, 0.9));
  for (const x of axes) f.push(...gardeBoue(x, rr, "peinture"));
  for (let i = 0; i < 4; i++) {
    const xa = x0 + 4.1 + i * 1.25;
    if (xa + 0.9 < x1 - 0.3 && axes.every((x) => Math.abs(x - (xa + 0.45)) > 1.0)) f.push(piece(rectArrondi(xa, 1.0, xa + 0.9, 1.36, 0.03), vertical(1.0, 1.36, "peinture"), NOIR, TRAIT), trait([xa + 0.3, 1.3], [xa + 0.6, 1.3], NOIR, 1));
  }
  f.push(...echelle(x0 + 2.2, 0.55, 1.85, 0.32));
  f.push(...chevrons(x1 - 0.12, 0.95, x1 + 0.02, 1.85, 0.1), ...feu(x1 - 0.06, 1.0, x1 + 0.04, 1.18, "rouge"));
  // Stabilisateurs (côté visible)
  // Caissons de stabilisateurs : derrière les essieux avant et en bout de châssis (hors des roues)
  if (st !== null) for (const x of [axes[1] + rr + 0.55, axes[axes.length - 1] + rr + 0.5]) f.push(...stabilisateur(x, 1.42, sorti, 0.9));
  // Cabine du porteur (avant à gauche), pare-chocs, phares, échappement, gyrophare
  f.push(caisson(x0 - 0.06, 0.72, x0 + 2.1, 1.12, "acier", 0.05));
  f.push(...feu(x0 - 0.08, 0.86, x0 + 0.06, 1.02, "blanc"), ...feu(x0 - 0.08, 0.76, x0 + 0.06, 0.84, "ambre"));
  f.push(...cabine(x0 + 0.02, 1.1, x0 + 2.1, 3.42, { avant: "gauche", ceinture: 0.42, inclinaison: 0.1 }));
  f.push(...gyrophare(x0 + 1.55, 3.42, 0.1));
  f.push(...echappement(x0 + 2.32, 1.88, 3.55, 0.11));
  // Couronne d'orientation
  f.push(caisson(-1.45, 1.88, 1.45, 2.06, "acier", 0.02));
  for (let i = 0; i < 12; i++) f.push(trait([-1.4 + i * 0.25, 1.9], [-1.4 + i * 0.25, 2.04], GRIS_FONCE, 0.5));
  // Contrepoids à l'arrière de la tourelle
  f.push(...lest(-3.25, 2.06, -2.2, 3.25, 3));
  // Tourelle : flasques, capot moteur, persiennes
  f.push(piece([[-2.25, 2.06], [1.55, 2.06], [1.55, 2.55], [0.55, hp + 0.42], [-2.25, hp + 0.42]], lin([0, hp + 0.42], [0.4, 2.06], "peinture")));
  f.push(...persiennes(-1.95, 2.25, -1.1, 3.05, 5));
  f.push(trait([-2.2, hp + 0.38], [0.5, hp + 0.38], NOIR, 0.5), reflet([-2.15, hp + 0.36], [0.45, hp + 0.36], 1, 0.9));
  f.push(...gardeCorps(-2.2, -0.85, hp + 0.42, 0.62, 0.7));
  // Treuil de levage et câble jusqu'à la tête
  const tambour: Pt = [-1.25, hp + 0.78];
  f.push(...treuil(tambour, 0.3, 0.75));
  // Vérin de relevage (sous la flèche)
  const Lf = dist(pied, tete);
  const attache = add(lerp(pied, tete, 0.36), normHaut(pied, tete), -0.42);
  f.push(...verin([1.0, 2.2], attache, 0.34, { course: Math.min(0.8, 0.5 + 6 / Math.max(Lf, 1) * 0.1) }));
  // Flèche télescopique
  const w0 = 1.0;
  f.push(...cable(add(tambour, [0, 1], 0.3), add(tete, normHaut(pied, tete), w0 * 0.3)));
  f.push(...flecheTelescopique(pied, tete, w0, Lf > 30 ? 5 : 4));
  f.push(rond(pied, 0.24, rad(add(pied, [-1, 1], 0.08), 0.3, "chrome"), NOIR, TRAIT));
  // Cabine de grue (côté flèche, au premier plan)
  f.push(...cabine(0.3, 2.08, 1.78, 3.55, { avant: "droite", ceinture: 0.3, inclinaison: 0.2, retroviseur: false }));
  f.push(...gyrophare(0.75, 3.55, 0.08));
  return { formes: f, pied, tete };
}

// ---------------------------------------------------------------------------
// Grue sur chenilles (flèche treillis, portique et haubans)
// ---------------------------------------------------------------------------

export function elevGrueChenilles(d: DimsResolues, tete: Pt): DessinElevation {
  const f: Forme[] = [];
  const hp = d.hauteurPiedM;
  const L = d.longueurPorteurM;
  const pied: Pt = [0, hp];
  const hc = 1.3;
  f.push(...ombre(-L / 2 - 0.3, L / 2 + 0.3, 0.2));
  f.push(...chenille(-L / 2, L / 2, hc));
  // Châssis central et couronne
  f.push(caisson(-2.1, hc, 2.1, hc + 0.5, "acier", 0.03), caisson(-1.7, hc + 0.5, 1.7, hc + 0.68, "acier", 0.02));
  const y0 = hc + 0.68;
  // Contrepoids empilé
  f.push(...lest(-5.6, y0 - 0.1, -3.85, y0 + 1.95, 5));
  // Plate-forme tournante : capotage, persiennes, échappement, garde-corps
  f.push(piece([[-3.9, y0], [2.0, y0], [2.0, y0 + 0.75], [0.8, hp + 0.15], [-3.9, hp + 0.15]], lin([0, hp + 0.15], [0.5, y0], "peinture")));
  f.push(...persiennes(-3.55, y0 + 0.2, -2.2, y0 + 1.05, 6));
  f.push(reflet([-3.85, hp + 0.1], [0.75, hp + 0.1], 1, 0.9));
  f.push(...gardeCorps(-3.85, -0.4, hp + 0.15, 0.9, 1.15));
  f.push(...echappement(-2.75, hp + 0.15, hp + 1.25, 0.13));
  const tambour: Pt = [-0.95, y0 + 0.6];
  f.push(...treuil(tambour, 0.4, 0.9));
  // Portique (mât en A) et haubans de flèche
  const apex: Pt = [-1.7, hp + 2.6];
  f.push(barre([-2.9, hp + 0.15], apex, 0.2, 0.16, "bleu", VINCI.bleuDark), barre([-0.7, hp + 0.15], apex, 0.2, 0.16, "bleu", VINCI.bleuDark));
  f.push(...poulie(apex, 0.22));
  const hauban = lerp(pied, tete, 0.66);
  const nf = normHaut(pied, tete);
  for (const k of [0, 0.08]) f.push(trait(add(apex, [0, 1], k), add(hauban, nf, 0.45 + k), NOIR, 1.3));
  f.push(trait(apex, [-4.5, y0 + 1.95], NOIR, 1), trait(apex, [-4.5, y0 + 1.95], VINCI.gris, 0.3));
  // Flèche treillis + câble de levage
  f.push(...cable(add(tambour, [0, 1], 0.4), add(tete, nf, 0.3)));
  f.push(...treillis(pied, tete, 1.55, 0.62, 1.2, "bleu"));
  f.push(...poulie(tete, 0.3), rond(pied, 0.26, rad(add(pied, [-1, 1], 0.08), 0.3, "chrome"), NOIR, TRAIT));
  // Cabine
  f.push(...cabine(0.35, y0, 1.95, y0 + 1.75, { avant: "droite", ceinture: 0.3, inclinaison: 0.18, retroviseur: false }));
  f.push(...gyrophare(0.8, y0 + 1.75, 0.09));
  return { formes: f, pied, tete };
}

// ---------------------------------------------------------------------------
// Grue à tour (rotation par le haut, flèche distributrice et porte-flèche)
// ---------------------------------------------------------------------------

export function elevGrueTour(d: DimsResolues, tete: Pt): DessinElevation {
  const f: Forme[] = [];
  const H = Math.max(tete[1], 6);
  const r = Math.max(tete[0], 0);
  const jl = r + Math.max(3, r * 0.2);
  const cj = Math.max(4, jl * 0.3);
  const jb = H;
  const lb = Math.max(d.largeurPorteurM, 3);
  f.push(...ombre(-lb / 2 - 0.6, lb / 2 + 0.6, 0.18));
  // Châssis en croix et blocs de lest béton
  f.push(caisson(-lb / 2 - 0.3, 0, lb / 2 + 0.3, 0.32, "acier", 0.02));
  const nbBlocs = 3;
  for (let i = 0; i < nbBlocs; i++) {
    const xa = -lb / 2 + (i * lb) / nbBlocs;
    f.push(piece(rectArrondi(xa + 0.03, 0.32, xa + lb / nbBlocs - 0.03, 1.4, 0.04), lin([xa, 1.4], [xa + 0.4, 0.32], "galva"), NOIR, TRAIT));
    f.push(reflet([xa + 0.08, 1.35], [xa + lb / nbBlocs - 0.08, 1.35], 1, 0.8));
  }
  // Mât treillis, échelle intérieure
  const topMat = jb - 1.7;
  f.push(...polyligne([[-0.15, 1.4], [-0.15, topMat]], GRIS_FONCE, 0.6, 0.6), ...polyligne([[0.2, 1.4], [0.2, topMat]], GRIS_FONCE, 0.6, 0.6));
  for (let y = 1.7; y < topMat; y += 0.6) f.push(trait([-0.15, y], [0.2, y], GRIS_FONCE, 0.6, 0.5));
  f.push(...treillis([0, 1.4], [0, topMat], 1.65, 1.65, 1.6, "bleu"));
  // Pivot d'orientation
  f.push(caisson(-1.05, topMat, 1.05, topMat + 0.6, "peinture", 0.04), caisson(-0.9, topMat + 0.6, 0.9, jb - 0.55, "acier", 0.02));
  // Contre-flèche, treuil, contrepoids, passerelle
  f.push(...treillis([0, jb], [-cj, jb], 1.0, 0.75, 1.4, "bleu"));
  f.push(...gardeCorps(-cj + 0.2, -0.9, jb + 0.5, 0.8, 1.3));
  f.push(...treuil([-cj * 0.55, jb + 0.85], 0.38, 0.9));
  const lc = Math.min(2.4, cj * 0.5);
  f.push(...lest(-cj, jb - 2.1, -cj + lc, jb + 0.2, 4, false));
  // Flèche distributrice et chariot
  const wj = (t: number) => 1.25 + (0.6 - 1.25) * t;
  f.push(...treillis([0, jb], [jl, jb], 1.25, 0.6, 1.4, "bleu"));
  f.push(...gardeCorps(1.0, Math.min(jl - 0.5, 1.0 + Math.max(2, jl * 0.6)), jb + wj(0.3) / 2, 0.7, 1.4));
  const ybas = jb - wj(r / jl) / 2;
  f.push(...poulie([r - 0.32, ybas + 0.06], 0.1), ...poulie([r + 0.32, ybas + 0.06], 0.1));
  f.push(caisson(r - 0.6, ybas - 0.42, r + 0.6, ybas - 0.04, "peinture", 0.04));
  f.push(...poulie([r - 0.25, ybas - 0.3], 0.09), ...poulie([r + 0.25, ybas - 0.3], 0.09));
  // Porte-flèche, tirants, balisage, anémomètre
  const apex: Pt = [0, H + Math.max(2.5, jl * 0.1)];
  f.push(barre([-0.65, jb + 0.5], apex, 0.18, 0.12, "bleu", VINCI.bleuDark), barre([0.65, jb + 0.5], apex, 0.18, 0.12, "bleu", VINCI.bleuDark));
  for (let y = jb + 1.1; y < apex[1] - 0.4; y += 0.9) {
    const k = 1 - (y - (jb + 0.5)) / (apex[1] - (jb + 0.5));
    f.push(trait([-0.65 * k, y], [0.65 * k, y], VINCI.bleuDark, 0.9));
  }
  f.push(trait(apex, [jl * 0.72, jb + wj(0.72) / 2], NOIR, 1.3), trait(apex, [-cj + 0.3, jb + 0.4], NOIR, 1.3));
  f.push(...feu(-0.08, apex[1] + 0.02, 0.08, apex[1] + 0.2, "rouge"), ...feu(jl - 0.08, jb + 0.3, jl + 0.08, jb + 0.48, "rouge"));
  f.push(trait([0.1, apex[1]], [0.1, apex[1] + 0.6], NOIR, 0.8), ...[-0.12, 0.12].map((dx) => rond([0.1 + dx, apex[1] + 0.62], 0.05, VINCI.gris, NOIR, 0.4)));
  // Cabine du grutier
  f.push(...cabine(1.0, jb - 2.6, 2.45, jb - 1.0, { avant: "droite", ceinture: 0.22, inclinaison: 0.14, retroviseur: false }));
  return { formes: f, pied: [0, jb], tete: [r, ybas - 0.42] };
}

// ---------------------------------------------------------------------------
// Grue auxiliaire (camion-bras articulé)
// ---------------------------------------------------------------------------

export function elevCamionBras(d: DimsResolues, st: Calage | null, tete: Pt): DessinElevation {
  const f: Forme[] = [];
  const hp = d.hauteurPiedM;
  const L = d.longueurPorteurM;
  const x0 = -5.6;
  const x1 = x0 + L;
  const pied: Pt = [0, hp];
  const sorti = st === "sortis";
  const rr = 0.53;
  const axes = [x0 + 1.4, x1 - 2.35, x1 - 1.0];
  f.push(...ombre(x0 - 0.15, x1 + 0.15));
  f.push(caisson(x0 + 0.2, 0.78, x1, 1.14, "acier", 0.02));
  for (const x of axes) f.push(...roue(x, rr, 0.6));
  // Réservoir, coffre batteries
  f.push(piece(rectArrondi(x0 + 2.5, 0.5, x0 + 3.5, 1.04, 0.2), lin([0, 1.04], [0, 0.5], "chrome"), NOIR, TRAIT), trait([x0 + 2.7, 0.52], [x0 + 2.7, 1.02], GRIS_FONCE, 0.5), trait([x0 + 3.3, 0.52], [x0 + 3.3, 1.02], GRIS_FONCE, 0.5));
  f.push(caisson(x0 + 3.65, 0.6, x0 + 4.25, 1.04, "acier", 0.02));
  // Plateau et ridelles
  f.push(caisson(0.85, 1.14, x1, 1.34, "acier", 0.01));
  f.push(caisson(0.85, 1.34, x1, 1.95, "peinture", 0.02));
  for (let x = 0.85 + 0.9; x < x1 - 0.2; x += 0.9) f.push(trait([x, 1.36], [x, 1.93], GRIS_FONCE, 0.6, 0.8));
  f.push(reflet([0.9, 1.9], [x1 - 0.05, 1.9], 1, 0.9));
  for (const x of axes.slice(1)) f.push(...gardeBoue(x, rr, "acier"));
  f.push(...chevrons(x1 - 0.1, 0.8, x1 + 0.02, 1.3, 0.08), ...feu(x1 - 0.06, 1.0, x1 + 0.04, 1.15, "rouge"));
  // Stabilisateurs
  if (st !== null) for (const x of [-0.95, x1 - 0.45]) f.push(...stabilisateur(x, 1.14, sorti, 0.75));
  // Cabine (cabine avancée), pare-chocs, phares, échappement, gyrophare
  f.push(caisson(x0 - 0.06, 0.55, x0 + 0.95, 1.08, "acier", 0.05), ...feu(x0 - 0.08, 0.78, x0 + 0.05, 0.95, "blanc"));
  f.push(...cabine(x0, 1.05, x0 + 2.25, 3.3, { avant: "gauche", ceinture: 0.45, inclinaison: 0.05 }));
  f.push(...gardeBoue(axes[0], rr, "peinture"));
  f.push(...echelle(x0 + 1.75, 0.45, 1.05, 0.3));
  f.push(...gyrophare(x0 + 1.2, 3.3, 0.1), ...echappement(x0 + 2.4, 1.2, 3.42, 0.1));
  // Embase, colonne, poste de commande
  f.push(caisson(-0.8, 1.14, 0.8, 1.62, "peinture", 0.04));
  f.push(piece([[-0.48, 1.62], [0.48, 1.62], [0.4, hp + 0.12], [-0.4, hp + 0.12]], lin([-0.48, 0], [0.48, 0], [[0, VINCI.bleuDark], [0.3, VINCI.bleuLight], [0.45, VINCI.bleuXLight], [0.6, VINCI.bleu], [1, VINCI.bleuDark]]), VINCI.bleuDark));
  for (let i = 0; i < 4; i++) f.push(trait([0.5 + i * 0.07, 1.25], [0.55 + i * 0.07, 1.6], NOIR, 1), rond([0.55 + i * 0.07, 1.62], 0.025, VINCI.rouge, NOIR, 0.3));
  // Bras articulé : bras principal, vérin de levage, genou, bras secondaire télescopique, vérin de genou
  const dd = dist(pied, tete) || 1;
  const m = lerp(pied, tete, 0.42);
  const coude: Pt = add(m, normHaut(pied, tete), Math.min(0.18 * dd, 1.2));
  const u2 = unit(coude, tete);
  const n2 = normHaut(coude, tete);
  const n1 = normHaut(pied, coude);
  f.push(...verin([0.22, 1.85], add(lerp(pied, coude, 0.55), n1, -0.28), 0.22, { course: 0.55 }));
  f.push(barre(pied, coude, 0.6, 0.48, "bleu", VINCI.bleuDark), reflet(add(pied, n1, 0.22), add(coude, n1, 0.18), 1, 0.7));
  const levier = add(add(coude, u2, -0.55), n2, 0.25);
  f.push(...verin(add(lerp(pied, coude, 0.35), n1, 0.32), levier, 0.18, { course: 0.6 }));
  f.push(barre(add(coude, u2, -0.6), coude, 0.5, 0.48, "bleu", VINCI.bleuDark));
  f.push(...flecheTelescopique(coude, tete, 0.46, 3));
  f.push(rond(coude, 0.26, rad(add(coude, [-1, 1], 0.08), 0.3, "chrome"), NOIR, TRAIT), rond(pied, 0.2, rad(add(pied, [-1, 1], 0.06), 0.25, "chrome"), NOIR, TRAIT));
  return { formes: f, pied, tete };
}

// ---------------------------------------------------------------------------
// Chariots télescopiques (fixe / rotatif)
// ---------------------------------------------------------------------------

export function elevTelescopique(d: DimsResolues, st: Calage | null, tete: Pt, acc: Accessoire | null, rotatif: boolean): DessinElevation {
  const f: Forme[] = [];
  const hp = d.hauteurPiedM;
  const L = d.longueurPorteurM;
  const x0 = rotatif ? -L / 2 : -0.9;
  const x1 = x0 + L;
  const pied: Pt = [0, hp];
  const sorti = st === "sortis";
  const rr = 0.62;
  const roues = rotatif ? [-L / 2 + 0.95, L / 2 - 0.95] : [x0 + 1.25, x1 - 1.0];
  const stabX = rotatif ? [-Math.max(d.calage.longueurM / 2 - 0.2, L / 2 - 0.25), Math.max(d.calage.longueurM / 2 - 0.2, L / 2 - 0.25)] : [x1 - 0.3];
  f.push(...ombre(x0 - 0.2, x1 + 0.2));
  // Châssis, carrosserie, roues
  f.push(caisson(x0 + 0.1, 0.5, x1 - 0.05, 0.95, "acier", 0.03));
  for (const x of roues) f.push(...roue(x, rr, 0.6));
  f.push(piece([[x0, 0.9], [x1, 0.9], [x1, 1.25], [x1 - 0.2, 1.4], [x0 + 0.15, 1.4], [x0, 1.3]], lin([0, 1.4], [0, 0.9], "peinture")));
  f.push(reflet([x0 + 0.2, 1.36], [x1 - 0.25, 1.36], 1, 0.9));
  for (const x of roues) f.push(...gardeBoue(x, rr, "acier"));
  f.push(...feu(x0 - 0.04, 1.0, x0 + 0.06, 1.15, "rouge"), ...feu(x1 - 0.06, 1.05, x1 + 0.04, 1.2, "blanc"));
  if (st !== null) for (const x of stabX) f.push(...stabilisateur(x, 0.95, sorti, 0.7));
  if (rotatif) {
    // Tourelle tournante, contrepoids, couronne
    f.push(caisson(-1.5, 1.4, 1.5, 1.55, "acier", 0.02));
    f.push(...lest(-2.55, 1.55, -1.85, hp + 0.05, 2));
    f.push(piece([[-1.9, 1.55], [1.65, 1.55], [1.65, 2.0], [0.55, hp + 0.3], [-1.9, hp + 0.3]], lin([0, hp + 0.3], [0.4, 1.55], "peinture")));
    f.push(...persiennes(-1.7, 1.7, -0.9, hp + 0.1, 4));
  } else {
    // Tour de pied de flèche à l'arrière, contrepoids
    f.push(caisson(x0 - 0.18, 0.55, x0 + 0.28, 1.45, "lest", 0.06));
    f.push(piece([[x0 + 0.1, 1.38], [0.5, 1.38], [0.38, hp + 0.3], [-0.38, hp + 0.32], [x0 + 0.1, 1.95]], lin([0, hp + 0.3], [0.3, 1.38], "peinture")));
    f.push(...echappement(x0 + 0.35, 1.38, 2.35, 0.09));
  }
  // Vérin de levage puis flèche télescopique
  const attache = add(lerp(pied, tete, 0.42), normHaut(pied, tete), -0.3);
  f.push(...verin([rotatif ? 0.9 : 1.2, rotatif ? 1.75 : 1.5], attache, 0.24, { course: 0.6 }));
  f.push(...flecheTelescopique(pied, tete, 0.64, 3));
  f.push(rond(pied, 0.2, rad(add(pied, [-1, 1], 0.06), 0.25, "chrome"), NOIR, TRAIT));
  // Cabine latérale très vitrée
  const cx0 = rotatif ? 0.45 : 0.8;
  const cy0 = rotatif ? 1.55 : 1.4;
  f.push(...cabine(cx0, cy0, cx0 + 1.15, cy0 + 1.72, { avant: "droite", ceinture: 0.2, inclinaison: 0.1 }));
  f.push(...gyrophare(cx0 + 0.35, cy0 + 1.72, 0.08));
  // Accessoire en bout de flèche
  const u = unit(pied, tete);
  if (acc === "fourches") {
    f.push(caisson(tete[0] - 0.1, tete[1] - 1.0, tete[0] + 0.1, tete[1] + 0.2, "acier", 0.02));
    for (let y = tete[1] - 0.8; y < tete[1] + 0.15; y += 0.25) f.push(trait([tete[0] + 0.1, y], [tete[0] + 0.35, y], NOIR, 1.2));
    f.push(trait([tete[0] + 0.35, tete[1] - 0.95], [tete[0] + 0.35, tete[1] + 0.15], NOIR, 1.2));
    f.push(piece([[tete[0] + 0.1, tete[1] - 1.06], [tete[0] + 1.2, tete[1] - 1.06], [tete[0] + 1.3, tete[1] - 1.01], [tete[0] + 0.18, tete[1] - 0.96], [tete[0] + 0.18, tete[1] - 0.4], [tete[0] + 0.1, tete[1] - 0.4]], lin([0, tete[1] - 0.96], [0, tete[1] - 1.06], "acier"), NOIR, TRAIT));
  } else if (acc === "potence") {
    f.push(barre(tete, add(tete, u, 0.9), 0.22, 0.14, "peinture"), ...poulie(add(tete, u, 0.9), 0.08));
  }
  return { formes: f, pied, tete };
}

// ---------------------------------------------------------------------------
// Pelles hydrauliques (pneus, chenilles, rail-route)
// ---------------------------------------------------------------------------

export function elevPelle(type: "pelle_pneus" | "pelle_chenilles" | "pelle_rail_route", d: DimsResolues, st: Calage | null, tete: Pt): DessinElevation {
  const f: Forme[] = [];
  const chenilles = type === "pelle_chenilles";
  const hautTrain = chenilles ? 1.0 : 1.3;
  const sorti = st === "sortis";
  const L = d.longueurPorteurM;
  f.push(...ombre(-L / 2 - 0.3, L / 2 + 0.3, 0.16));
  if (chenilles) {
    f.push(...chenille(-L / 2, L / 2, 0.92));
    f.push(caisson(-1.3, 0.9, 1.3, hautTrain, "acier", 0.02));
  } else {
    if (type === "pelle_rail_route") {
      // Voie : traverses, rail
      for (let x = -L / 2 - 1.2; x <= L / 2 + 1.2; x += 0.6) f.push(caisson(x - 0.13, -0.02, x + 0.13, 0.1, "lest", 0.01));
      f.push(caisson(-L / 2 - 1.4, 0.1, L / 2 + 1.4, 0.26, "chrome", 0.01));
    }
    f.push(caisson(-L / 2 + 0.3, 0.72, L / 2 - 0.3, hautTrain, "acier", 0.03));
    for (const x of [-L / 2 + 1.1, L / 2 - 1.1]) f.push(...roue(x, 0.56, 0.58));
    for (const x of [-L / 2 + 1.1, L / 2 - 1.1]) f.push(...gardeBoue(x, 0.56, "acier"));
    if (st !== null) {
      // Lame avant (bouclier) et stabilisateurs arrière
      const xl = L / 2 - 0.2;
      f.push(...verin([xl - 0.7, hautTrain - 0.1], [xl + 0.35, 0.65], 0.14, { course: 0.55, flexibles: false }));
      f.push(piece([...arc([xl + 1.05, 0.65], 0.62, 145, 215, 8), [xl + 0.62, 0.2], [xl + 0.74, 0.2], [xl + 0.74, 1.05]], lin([xl + 0.3, 0], [xl + 0.8, 0], "peinture"), NOIR, TRAIT));
      f.push(caisson(xl + 0.5, 0.08, xl + 0.78, 0.2, "acier", 0.01));
      if (sorti || st === "rentres") f.push(...stabilisateur(-L / 2 - 0.05, hautTrain, sorti, 0.6));
    }
    if (type === "pelle_rail_route") {
      // Essieux rail (galets de guidage) aux deux extrémités
      for (const s of [-1, 1]) {
        const x = s * (L / 2 + 0.55);
        f.push(...verin([s * (L / 2 - 0.1), hautTrain - 0.1], [x, 0.55], 0.13, { course: 0.55, flexibles: false }));
        f.push(rond([x, 0.48], 0.24, rad([x - 0.06, 0.54], 0.3, "chrome"), NOIR, TRAIT), rond([x, 0.48], 0.17, undefined, GRIS_FONCE, 0.5), rond([x, 0.48], 0.07, GRIS_FONCE, NOIR, 0.4));
      }
    }
  }
  // Partie tournante
  const y0 = hautTrain;
  f.push(caisson(-1.5, y0, 0.95, y0 + 0.16, "acier", 0.02));
  f.push(piece([...arc([-1.75, y0 + 0.75], 0.62, 90, 270, 10)].reverse(), lin([-2.4, y0 + 1.4], [-1.6, y0 + 0.1], "lest"), NOIR, TRAIT));
  f.push(piece([[-1.75, y0 + 0.13], [0.95, y0 + 0.16], [0.95, y0 + 1.1], [-0.35, y0 + 1.55], [-1.75, y0 + 1.37]], lin([0, y0 + 1.55], [0.3, y0 + 0.16], "peinture")));
  f.push(...chevrons(-2.36, y0 + 0.55, -2.2, y0 + 0.95, 0.07));
  f.push(...persiennes(-1.55, y0 + 0.35, -0.75, y0 + 1.1, 5));
  f.push(reflet([-1.7, y0 + 1.33], [-0.4, y0 + 1.5], 1, 0.9));
  f.push(...gardeCorps(-1.7, -0.6, y0 + 1.4, 0.55, 0.55));
  f.push(...echappement(-1.0, y0 + 1.45, y0 + 2.0, 0.09));
  const pied: Pt = [0.65, y0 + 0.55];
  // Cinématique flèche + balancier
  const l2 = d.balancierM;
  const cin = cinematiquePelle(pied, tete, l2 * 1.95, l2);
  const coude = cin.coude;
  const milieu = lerp(pied, coude, 0.5);
  const nB = normHaut(pied, coude);
  const bossage = add(milieu, nB, 0.3);
  const u2 = unit(coude, tete);
  const n2 = normHaut(coude, tete);
  const arriereBal = add(coude, u2, -0.55);
  // Vérins de flèche (sous la flèche)
  f.push(...verin([0.85, y0 + 0.28], add(lerp(pied, bossage, 0.72), normHaut(pied, bossage), -0.25), 0.2, { course: 0.6 }));
  // Flèche monobloc coudée
  f.push(piece(bandePolyligne([pied, bossage, coude], [0.5, 0.72, 0.44]), lin(add(milieu, nB, 0.5), add(milieu, nB, -0.2), "bleu"), VINCI.bleuDark));
  f.push(...polyligne([add(pied, nB, 0.2), add(bossage, nB, 0.31), add(coude, normHaut(bossage, coude), 0.18)], VINCI.blanc, 1, 0.65));
  // Vérin de balancier (sur la flèche)
  f.push(...verin(add(lerp(pied, bossage, 0.85), nB, 0.42), add(arriereBal, n2, 0.14), 0.17, { course: 0.6 }));
  // Balancier
  f.push(barre(arriereBal, tete, 0.46, 0.3, "bleu", VINCI.bleuDark), reflet(add(arriereBal, n2, 0.17), add(tete, n2, 0.1), 1, 0.65));
  // Vérin de godet + biellettes
  const bielle = add(lerp(coude, tete, 0.88), n2, 0.25);
  f.push(...verin(add(lerp(coude, tete, 0.1), n2, 0.3), bielle, 0.14, { course: 0.6 }));
  f.push(trait(bielle, add(tete, n2, 0.12), NOIR, 2.4), trait(bielle, add(tete, n2, 0.12), VINCI.gris, 1));
  f.push(trait(bielle, lerp(coude, tete, 0.8), NOIR, 2.2), trait(bielle, lerp(coude, tete, 0.8), VINCI.gris, 0.9));
  f.push(rond(coude, 0.18, rad(add(coude, [-1, 1], 0.05), 0.22, "chrome"), NOIR, TRAIT), rond(pied, 0.18, rad(add(pied, [-1, 1], 0.05), 0.22, "chrome"), NOIR, TRAIT));
  // Attache rapide + crochet / anneau de levage
  f.push(piece([[tete[0] - 0.25, tete[1] + 0.08], [tete[0] + 0.25, tete[1] + 0.08], [tete[0] + 0.12, tete[1] - 0.24], [tete[0] - 0.12, tete[1] - 0.24]], lin([tete[0], tete[1] + 0.08], [tete[0], tete[1] - 0.24], "acier"), NOIR, TRAIT));
  f.push(rond(tete, 0.07, rad(tete, 0.08, "chrome"), NOIR, 0.4));
  f.push(rond([tete[0], tete[1] - 0.42], 0.13, undefined, NOIR, 2.6), rond([tete[0], tete[1] - 0.42], 0.13, undefined, VINCI.gris, 1));
  // Cabine (premier plan)
  f.push(...cabine(-0.55, y0 + 0.16, 0.95, y0 + 2.05, { avant: "droite", ceinture: 0.3, inclinaison: 0.08 }));
  f.push(...gyrophare(-0.2, y0 + 2.05, 0.08));
  return { formes: f, pied, tete: [tete[0], tete[1] - 0.42] };
}

// ---------------------------------------------------------------------------
// Chariot élévateur frontal (contrepoids)
// ---------------------------------------------------------------------------

export function elevChariot(d: DimsResolues, tete: Pt): DessinElevation {
  const f: Forme[] = [];
  const forkY = Math.max(tete[1], 0.1);
  const mastH = Math.max(3.2, forkY + 1.3);
  const ax = tete[0] - 1.05; // essieu avant ; centre de charge à la portée saisie
  const xm = ax + 0.45;
  const L = d.longueurPorteurM;
  const xr = ax - L + 0.5;
  f.push(...ombre(xr - 0.2, xm + 1.5, 0.12));
  // Châssis, contrepoids arrondi, carrosserie
  f.push(caisson(xr + 0.3, 0.25, ax + 0.25, 0.7, "acier", 0.03));
  f.push(...roue(ax, 0.42, 0.55), ...roue(ax - L + 0.85, 0.34, 0.55));
  const contrepoids: Pt[] = [[xr + 0.9, 0.3], [xr + 0.9, 1.42], ...arc([xr + 0.45, 0.95], 0.48, 90, 230, 10), [xr + 0.12, 0.3]];
  f.push(piece(contrepoids, lin([xr, 1.42], [xr + 0.5, 0.3], "lest"), NOIR, TRAIT));
  f.push(...chevrons(xr - 0.02, 0.45, xr + 0.1, 0.95, 0.07), ...feu(xr + 0.05, 1.05, xr + 0.15, 1.2, "rouge"));
  f.push(piece([[xr + 0.85, 0.65], [ax - 0.1, 0.65], [ax + 0.25, 0.95], [ax + 0.2, 1.05], [xr + 0.85, 1.12]], lin([0, 1.12], [0, 0.65], "peinture")));
  // Siège, volant, protège-conducteur
  f.push(piece([[ax - 1.25, 1.1], [ax - 0.75, 1.1], [ax - 0.7, 1.22], [ax - 1.05, 1.24], [ax - 1.12, 1.65], [ax - 1.25, 1.65]], lin([ax - 1.25, 1.65], [ax - 0.7, 1.1], "acier"), NOIR, TRAIT));
  f.push(trait([ax - 0.25, 1.05], [ax - 0.45, 1.5], NOIR, 1.6), piece([[ax - 0.62, 1.5], [ax - 0.28, 1.56], [ax - 0.3, 1.6], [ax - 0.64, 1.54]], "#2A2A2A", NOIR, 0.4));
  const gardeH = 2.18;
  f.push(barre([ax - 1.3, 1.1], [ax - 1.22, gardeH], 0.08, 0.07, "acier"), barre([ax - 0.05, 1.0], [ax - 0.3, gardeH], 0.08, 0.07, "acier"));
  f.push(caisson(ax - 1.42, gardeH, ax - 0.2, gardeH + 0.08, "acier", 0.02));
  for (let i = 1; i < 6; i++) f.push(trait([ax - 1.42 + i * 0.2, gardeH + 0.01], [ax - 1.42 + i * 0.2, gardeH + 0.07], VINCI.gris, 0.5));
  f.push(...gyrophare(ax - 1.1, gardeH + 0.08, 0.07));
  // Mât double, vérin d'inclinaison, vérin de levée, tablier, fourches
  f.push(...verin([ax - 0.25, 0.85], [xm - 0.06, 1.25], 0.1, { course: 0.6, flexibles: false }));
  f.push(caisson(xm - 0.09, 0.32, xm + 0.05, mastH, "acier", 0.01), reflet([xm - 0.07, 0.4], [xm - 0.07, mastH - 0.05], 0.9, 0.6));
  f.push(caisson(xm + 0.05, 0.42, xm + 0.17, Math.min(mastH + 0.9, Math.max(mastH - 0.1, forkY + 1.0)), "acier", 0.01));
  f.push(barre([xm - 0.02, 0.4], [xm - 0.02, mastH * 0.55], 0.07, 0.07, "chrome"));
  f.push(...poulie([xm + 0.11, Math.min(mastH + 0.9, Math.max(mastH - 0.1, forkY + 1.0)) - 0.08], 0.07));
  f.push(caisson(xm + 0.17, forkY - 0.06, xm + 0.3, forkY + 0.88, "acier", 0.01));
  for (let y = forkY + 0.3; y < forkY + 1.25; y += 0.2) f.push(trait([xm + 0.3, y], [xm + 0.38, y], NOIR, 1));
  f.push(trait([xm + 0.38, forkY + 0.2], [xm + 0.38, forkY + 1.25], NOIR, 1.1));
  f.push(piece([[xm + 0.18, forkY - 0.12], [xm + 1.45, forkY - 0.12], [xm + 1.55, forkY - 0.08], [xm + 0.26, forkY - 0.02], [xm + 0.26, forkY + 0.55], [xm + 0.18, forkY + 0.55]], lin([0, forkY - 0.02], [0, forkY - 0.12], "acier"), NOIR, TRAIT));
  return { formes: f, pied: [xm, forkY], tete: [tete[0], forkY], sansCable: true };
}

// ---------------------------------------------------------------------------
// Moufle / crochet
// ---------------------------------------------------------------------------

/** Moufle (flasques, réa, signalisation) + émerillon + crochet forgé à linguet ; attache (haut) en (x, y), hauteur 1,25 m. */
export function moufleCrochet(x: number, y: number): Forme[] {
  const f: Forme[] = [];
  f.push(piece(rectArrondi(x - 0.3, y - 0.72, x + 0.3, y - 0.08, 0.1), lin([x - 0.3, y - 0.08], [x + 0.1, y - 0.72], "lest"), NOIR, TRAIT));
  f.push(...poulie([x, y - 0.27], 0.16));
  f.push(...chevrons(x - 0.27, y - 0.66, x + 0.27, y - 0.5, 0.06));
  f.push(reflet([x - 0.22, y - 0.12], [x + 0.18, y - 0.12], 0.9, 0.7));
  f.push(barre([x, y - 0.72], [x, y - 0.9], 0.11, 0.11, "chrome"), caisson(x - 0.09, y - 0.84, x + 0.09, y - 0.78, "acier", 0.01));
  const c: Pt = [x + 0.06, y - 1.08];
  const ext = arc(c, 0.17, 160, 385, 16);
  const int = arc(c, 0.085, 375, 95, 14);
  const pts: Pt[] = [[x - 0.06, y - 0.9], [x - 0.06, y - 0.98], ...ext, add(c, [Math.cos((392 * Math.PI) / 180), Math.sin((392 * Math.PI) / 180)], 0.13), ...int, [x + 0.06, y - 0.97], [x + 0.06, y - 0.9]];
  f.push(piece(pts, lin([x - 0.1, y - 0.9], [x + 0.2, y - 1.25], "acier"), NOIR, TRAIT));
  f.push(trait([x - 0.07, y - 1.0], [x - 0.08, y - 1.12], VINCI.blanc, 0.6, 0.6));
  f.push(trait([x + 0.06, y - 0.95], add(c, [Math.cos((388 * Math.PI) / 180), Math.sin((388 * Math.PI) / 180)], 0.12), VINCI.rouge, 1));
  return f;
}

