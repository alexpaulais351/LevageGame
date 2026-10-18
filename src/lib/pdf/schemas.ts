/**
 * Schémas de la fiche (courbe de charge, élévation, plan) sous forme de primitives vectorielles pures.
 * Les échelles et tracés viennent de `visuals/geometry` (mêmes fonctions que les visuels à l'écran) ;
 * les capacités affichées sont celles du moteur, jamais recalculées ici.
 */
import {
  aireSvg,
  appliquer,
  cheminSvg,
  domaineDeplacement,
  domaineGlobal,
  ecartAngulaire,
  graduations,
  lignesAbaque,
  lignesActives,
  polaire,
  tracerEscalier,
  type Echelle,
} from "@/components/modules/visuals/geometry";
import { couleurZone, positionSelectionnee, positionsVisuelles } from "@/components/modules/visuals/model";
import { geometrieElevation, geometriePlan, hauteurAxeM, HAUTEUR_MOUFLE_M, noteIndicatif, notePlanIndicatif } from "@/components/modules/visuals/silhouette-model";
import { VERDICT, VINCI } from "@/lib/design-tokens";
import type { StudyResult } from "@/lib/study/compute";
import { formatNombreAuto } from "@/lib/study/format";
import type { StudyData } from "@/lib/study/types";
import { formatMasse, formatNombreFR } from "@/lib/utils";
import { formesCrochet, projeter, type Forme, type Peinture } from "@/lib/visuals/silhouettes";

export type Prim =
  | { k: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; w: number; dash?: string; op?: number }
  | { k: "rect"; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number; dash?: string }
  | { k: "path"; d: string; fill?: Peinture; stroke?: string; sw?: number; dash?: string; op?: number }
  | { k: "circle"; cx: number; cy: number; r: number; fill?: Peinture; stroke?: string; sw?: number; dash?: string; op?: number }
  | { k: "text"; x: number; y: number; t: string; size: number; fill: string; anchor?: "start" | "middle" | "end"; bold?: boolean; rotate?: number };

export interface Schema {
  id: "courbe" | "elevation" | "plan";
  titre: string;
  w: number;
  h: number;
  prims: Prim[];
  /** Légende / avertissements sous le schéma. */
  notes: string[];
  /** `false` quand les données manquent : on affiche `message` à la place. */
  disponible: boolean;
  message?: string;
}

const indisponible = (id: Schema["id"], titre: string, w: number, h: number, message: string): Schema => ({
  id,
  titre,
  w,
  h,
  prims: [],
  notes: [],
  disponible: false,
  message,
});

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Formes de silhouette (déjà en pixels) → primitives de la fiche : même géométrie que l'écran. */
export function formesVersPrims(formes: readonly Forme[]): Prim[] {
  return formes.map((f): Prim => {
    if (f.k === "poly") return { k: "path", d: `M${f.pts.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" L")} Z`, fill: f.fill, stroke: f.stroke, sw: f.sw, op: f.op };
    if (f.k === "circle") return { k: "circle", cx: r2(f.cx), cy: r2(f.cy), r: r2(f.r), fill: f.fill, stroke: f.stroke, sw: f.sw, op: f.op };
    return { k: "line", x1: r2(f.x1), y1: r2(f.y1), x2: r2(f.x2), y2: r2(f.y2), stroke: f.stroke, w: f.w, dash: f.dash, op: f.op };
  });
}

// ---------------------------------------------------------------------------
// Courbe de charge
// ---------------------------------------------------------------------------

export function schemaCourbe(data: StudyData, result: StudyResult, seuils: { vert: number; orange: number }): Schema {
  const W = 900;
  const H = 400;
  const M = { g: 70, d: 24, h: 24, b: 58 };
  const titre = "Courbe de charge — capacité (t) selon la portée (m)";
  const chart = data.machine.selection?.chart ?? null;
  const lignes = chart ? lignesAbaque(chart) : [];
  const dom = domaineGlobal(lignes);
  if (!chart || !dom || lignes.length === 0) {
    return indisponible("courbe", titre, W, H, "Abaque non disponible : courbe de charge non tracée.");
  }
  const positions = positionsVisuelles(data, result);
  const sel = positionSelectionnee(positions, result, null);
  const charge = result.chargeTotale.value;
  const actives = lignesActives(lignes, chart.axisY === "none" ? null : (sel?.yM ?? null));
  const indicesBandes = actives.length > 0 ? actives : lignes.length === 1 ? [0] : [];

  const portees = positions.map((p) => p.porteeM).filter((v): v is number => v !== null);
  const xMin = Math.min(0, dom.min, ...portees);
  const xMax = Math.max(dom.max, ...portees) * 1.04;
  const maxCap = Math.max(0, ...lignes.flatMap((l) => l.noeuds.map((n) => n.capacityKg ?? 0)));
  const yMax = Math.max(maxCap, charge ?? 0) * 1.08 || 1;
  const ex: Echelle = { d0: xMin, d1: xMax, r0: M.g, r1: W - M.d };
  const ey: Echelle = { d0: 0, d1: yMax, r0: H - M.b, r1: M.h };
  const base = H - M.b;
  const prims: Prim[] = [];

  for (const v of graduations(0, yMax / 1000, 6).map((t) => t * 1000)) {
    const y = appliquer(ey, v);
    prims.push({ k: "line", x1: M.g, x2: W - M.d, y1: y, y2: y, stroke: VINCI.tableBorder, w: 1 });
    prims.push({ k: "text", x: M.g - 8, y: y + 5, t: formatNombreFR(v / 1000, v % 1000 === 0 ? 0 : 1), size: 15, fill: VINCI.noir, anchor: "end" });
  }
  for (const v of graduations(xMin, xMax, 8)) {
    const x = appliquer(ex, v);
    prims.push({ k: "line", x1: x, x2: x, y1: M.h, y2: base, stroke: VINCI.tableBorder, w: 1 });
    prims.push({ k: "text", x, y: base + 21, t: formatNombreFR(v, v % 1 === 0 ? 0 : 1), size: 15, fill: VINCI.noir, anchor: "middle" });
  }
  prims.push({ k: "line", x1: M.g, x2: M.g, y1: M.h, y2: base, stroke: VINCI.noir, w: 1.5 });
  prims.push({ k: "line", x1: M.g, x2: W - M.d, y1: base, y2: base, stroke: VINCI.noir, w: 1.5 });
  prims.push({ k: "text", x: (M.g + W - M.d) / 2, y: H - 10, t: "Portée (m)", size: 16, fill: VINCI.bleu, anchor: "middle", bold: true });
  prims.push({ k: "text", x: 18, y: (M.h + base) / 2, t: "Capacité (t)", size: 16, fill: VINCI.bleu, anchor: "middle", bold: true, rotate: -90 });

  const chemins = lignes.map((l) => tracerEscalier(l.noeuds, chart.interpolationAllowed));
  // Bandes de zones sous la courbe active.
  for (const i of indicesBandes) {
    for (const ch of chemins[i]) {
      const x0 = appliquer(ex, ch[0].x);
      const x1 = appliquer(ex, ch[ch.length - 1].x);
      prims.push({ k: "rect", x: x0, y: M.h, w: x1 - x0, h: base - M.h, fill: VERDICT.rougeBg });
      prims.push({ k: "path", d: aireSvg(ch, ex, ey, seuils.orange, base), fill: VERDICT.jauneBg });
      prims.push({ k: "path", d: aireSvg(ch, ex, ey, seuils.vert, base), fill: VERDICT.vertBg });
    }
  }
  // Courbes : inactives puis actives.
  for (const estActive of [false, true]) {
    lignes.forEach((l, i) => {
      const active = actives.includes(i) || (lignes.length === 1 && l.y === null);
      if (active !== estActive) return;
      chemins[i].forEach((ch, k) => {
        prims.push({ k: "path", d: cheminSvg(ch, ex, ey), stroke: active ? VINCI.bleu : VINCI.gris, sw: active ? 3.5 : 2 });
        if (ch.length === 1) prims.push({ k: "circle", cx: appliquer(ex, ch[0].x), cy: appliquer(ey, ch[0].c), r: 4, fill: active ? VINCI.bleu : VINCI.gris });
        if (k === chemins[i].length - 1 && l.y !== null) {
          const fin = ch[ch.length - 1];
          prims.push({ k: "text", x: appliquer(ex, fin.x) - 4, y: appliquer(ey, fin.c) - 8, t: `${formatNombreAuto(l.y)} m`, size: 13, fill: active ? VINCI.bleu : VINCI.noir, anchor: "end", bold: active });
        }
      });
    });
  }
  if (charge !== null) {
    const y = appliquer(ey, charge);
    prims.push({ k: "line", x1: M.g, x2: W - M.d, y1: y, y2: y, stroke: VINCI.bleuDark, w: 1.2, dash: "6 5" });
    for (const p of positions) {
      if (p.porteeM === null) continue;
      const cx = appliquer(ex, p.porteeM);
      prims.push({ k: "circle", cx, cy: y, r: 9, fill: couleurZone(p.zone), stroke: VINCI.blanc, sw: 2 });
      if (p.horsAbaque) prims.push({ k: "path", d: `M${cx - 4},${y - 4} L${cx + 4},${y + 4} M${cx + 4},${y - 4} L${cx - 4},${y + 4}`, stroke: VINCI.blanc, sw: 2 });
      prims.push({ k: "text", x: cx, y: y - 16, t: p.nom, size: 14, fill: VINCI.noir, anchor: "middle", bold: true });
    }
  }
  const uniteY = chart.axisY === "height_m" ? "Hauteur" : "Flèche";
  const notes = [
    `Courbe(s) : ${lignes.map((l) => (l.y === null ? "courbe unique" : `${uniteY} ${formatNombreAuto(l.y)} m`)).join(", ")}${actives.length > 0 ? " — courbe(s) active(s) en bleu" : ""}.`,
    `Zones : vert sous ${formatNombreFR(seuils.vert * 100, 0)} %, orange jusqu'à ${formatNombreFR(seuils.orange * 100, 0)} %, rouge au-delà ou hors abaque.`,
    `Tracé en escalier : entre deux nœuds, valeur la plus défavorable${chart.interpolationAllowed ? " (interpolation autorisée par le constructeur : segments droits)" : ""} ; aucune extrapolation. Points : charge totale ${charge === null ? "non calculable" : formatMasse(charge)} à la portée de chaque position.`,
  ];
  return { id: "courbe", titre, w: W, h: H, prims, notes, disponible: true };
}

// ---------------------------------------------------------------------------
// Élévation (position la plus défavorable)
// ---------------------------------------------------------------------------

export function schemaElevation(data: StudyData, result: StudyResult): Schema {
  const W = 900;
  const H = 470;
  const PAD = { g: 40, d: 30, h: 30, b: 84 };
  const titre = "Élévation — position la plus défavorable";
  const positions = positionsVisuelles(data, result);
  const sel = positionSelectionnee(positions, result, result.verdict.value.positionDefavorable?.id ?? null);
  if (!sel) return indisponible("elevation", titre, W, H, "Aucune position de levage : élévation non tracée.");

  const chart = data.machine.selection?.chart ?? null;
  const lignes = chart ? lignesAbaque(chart) : [];
  const axeY = chart?.axisY ?? "none";
  const domaine = domaineDeplacement(lignes, axeY === "none" ? null : sel.yM);
  const g = data.geometrie;
  const c = data.charge;
  const geo = geometrieElevation(data, sel, domaine?.min ?? null);
  const { sil, r, angle, chargeL, chargeH, chargeIndicative, elingue, crochetY, teteIndicative } = geo;
  const teteY = geo.teteY;
  const obstacles = (g.obstaclesSaisis ?? []).filter((o) => o.distanceM !== null && o.hauteurM !== null);
  const LARG_OBST = 0.8;
  const xMin = Math.min(-4.5, sil.bornes.minX - 0.5);
  const xMax = Math.max(domaine?.max ?? 0, r, sil.bornes.maxX + 0.5, ...obstacles.map((o) => (o.distanceM ?? 0) + LARG_OBST)) + 2.5;
  const appuiH = sel.hauteurAppuiM !== null && sel.hauteurAppuiM > 0 ? sel.hauteurAppuiM : null;
  const appuiL = Math.max(chargeL + 1, 2);
  const yMax = Math.max(teteY, sil.bornes.maxY, appuiH ?? 0, ...obstacles.map((o) => o.hauteurM ?? 0)) + 1.5;
  const s = Math.min((W - PAD.g - PAD.d) / (xMax - xMin), (H - PAD.h - PAD.b) / yMax);
  const sx = (m: number) => PAD.g + (m - xMin) * s;
  const sy = (m: number) => H - PAD.b - m * s;
  const xPivot = sx(0);
  const prims: Prim[] = [];
  const couleur = couleurZone(sel.zone);

  prims.push({ k: "rect", x: PAD.g - 20, y: sy(0), w: W - PAD.g - PAD.d + 40, h: H - sy(0) - 20, fill: VINCI.grisLight });
  prims.push({ k: "line", x1: PAD.g - 20, x2: W - PAD.d + 20, y1: sy(0), y2: sy(0), stroke: VINCI.noir, w: 2 });
  for (const t of graduations(0, xMax, 8)) {
    prims.push({ k: "line", x1: sx(t), x2: sx(t), y1: sy(0), y2: sy(0) + 6, stroke: VINCI.noir, w: 1 });
    prims.push({ k: "text", x: sx(t), y: sy(0) + 22, t: formatNombreFR(t, 0), size: 14, fill: VINCI.noir, anchor: "middle" });
  }
  prims.push({ k: "text", x: W - PAD.d, y: sy(0) + 60, t: "distance à l'axe de rotation (m)", size: 14, fill: VINCI.noir, anchor: "end" });
  if (domaine) {
    prims.push({ k: "line", x1: sx(domaine.min), x2: sx(domaine.max), y1: sy(0) + 72, y2: sy(0) + 72, stroke: VINCI.bleu, w: 4 });
    prims.push({ k: "text", x: sx(domaine.min) - 6, y: sy(0) + 77, t: "plage de l'abaque", size: 13, fill: VINCI.bleu, anchor: "end" });
  }
  if (appuiH !== null) {
    prims.push({ k: "rect", x: sx(r - appuiL / 2), y: sy(appuiH), w: appuiL * s, h: appuiH * s, fill: VINCI.grisLight, stroke: VINCI.gris, sw: 2 });
    prims.push({ k: "line", x1: sx(r - appuiL / 2), x2: sx(r + appuiL / 2), y1: sy(appuiH), y2: sy(appuiH), stroke: VINCI.bleuDark, w: 3 });
    prims.push({ k: "text", x: sx(r + appuiL / 2) + 8, y: sy(appuiH) + 5, t: `${sel.nom} : appui à ${formatNombreAuto(appuiH)} m`, size: 13, fill: VINCI.bleuDark, bold: true });
  }
  for (const o of obstacles) {
    const hx = o.hauteurM as number;
    prims.push({ k: "rect", x: sx(o.distanceM as number), y: sy(hx), w: LARG_OBST * s, h: hx * s, fill: VINCI.rougeXLight, stroke: VINCI.rouge, sw: 2 });
    prims.push({ k: "text", x: sx(o.distanceM as number) + (LARG_OBST * s) / 2, y: sy(hx) - 6, t: `${o.nom.trim() || "Obstacle"} ${formatNombreAuto(hx)} m`, size: 13, fill: VINCI.rougeDark, anchor: "middle" });
  }
  const yAxe = hauteurAxeM(geo);
  prims.push({ k: "line", x1: xPivot, x2: xPivot, y1: sy(0), y2: sy(yAxe), stroke: VINCI.gris, w: 1.5, dash: "5 4" });
  prims.push({ k: "text", x: xPivot - 8, y: sy(yAxe) + 4, t: "axe de rotation", size: 13, fill: VINCI.noir, anchor: "end" });
  // Silhouette de la machine (indicative), pilotée par la même géométrie que l'écran
  prims.push(...formesVersPrims(projeter(sil.formes, { ox: xPivot, oy: sy(0), s, flipY: true })));
  const piedX = sx(sil.pied[0]);
  const piedY = sy(sil.pied[1]);
  const tetePx = sx(sil.tete[0]);
  const tetePy = sy(teteY);
  // Câble, moufle, élingues, charge
  const hookY = sy(crochetY);
  if (!geo.sansCable) {
    prims.push({ k: "line", x1: tetePx, y1: tetePy, x2: tetePx, y2: sy(crochetY + HAUTEUR_MOUFLE_M), stroke: VINCI.noir, w: 2 });
    prims.push(...formesVersPrims(projeter(formesCrochet(r, crochetY + HAUTEUR_MOUFLE_M), { ox: xPivot, oy: sy(0), s, flipY: true })));
    prims.push({ k: "line", x1: tetePx, y1: hookY, x2: tetePx - (chargeL * s) / 2, y2: sy(crochetY - elingue), stroke: VINCI.noir, w: 1.5 });
    prims.push({ k: "line", x1: tetePx, y1: hookY, x2: tetePx + (chargeL * s) / 2, y2: sy(crochetY - elingue), stroke: VINCI.noir, w: 1.5 });
  }
  prims.push({ k: "rect", x: tetePx - (chargeL * s) / 2, y: sy(crochetY - elingue), w: chargeL * s, h: chargeH * s, fill: VINCI.grisLight, stroke: VINCI.noir, sw: 2, dash: chargeIndicative ? "6 4" : undefined });
  prims.push({ k: "circle", cx: tetePx, cy: hookY, r: 9, fill: couleur, stroke: VINCI.bleuDark, sw: 3 });
  prims.push({ k: "text", x: tetePx + (chargeL * s) / 2 + 8, y: sy(crochetY - elingue - chargeH / 2) + 5, t: c.masseKg !== null ? formatMasse(c.masseKg) : "charge", size: 13, fill: VINCI.noir });
  // Cote de portée
  prims.push({ k: "line", x1: xPivot, x2: tetePx, y1: sy(0) + 38, y2: sy(0) + 38, stroke: couleur, w: 2.5 });
  prims.push({ k: "text", x: (xPivot + tetePx) / 2, y: sy(0) + 43, t: `portée ${formatNombreAuto(r)} m`, size: 15, fill: VINCI.noir, anchor: "middle", bold: true });
  if (angle !== null) prims.push({ k: "text", x: piedX + (tetePx - piedX) * 0.25 - 14, y: piedY + (tetePy - piedY) * 0.25 - 4, anchor: "end", t: `${formatNombreFR(angle, 1)} °`, size: 14, fill: VINCI.bleuDark, bold: true });

  const notes = [
    `Position « ${sel.nom} » : portée ${sel.porteeM === null ? "non saisie" : `${formatNombreAuto(sel.porteeM)} m`}, ${sel.horsAbaque ? "hors abaque" : sel.capaciteKg === null ? "capacité non lue" : `capacité ${formatMasse(sel.capaciteKg)}`}.`,
    `${noteIndicatif(geo)}${chargeIndicative ? ", dimensions de charge par défaut en pointillé" : ""}${teteIndicative ? ", hauteur de tête de flèche non déductible des données saisies" : ""}${geo.crochetIndicatif ? ", hauteur du crochet par défaut" : ""}.`,
  ];
  return { id: "elevation", titre, w: W, h: H, prims, notes, disponible: true };
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export function schemaPlan(data: StudyData, result: StudyResult): Schema {
  const W = 640;
  const H = 520;
  const CX = W / 2;
  const CY = H / 2 + 6;
  const R_MAX_PX = 215;
  const titre = "Vue en plan — rayon de giration, balayage et emprise";
  const chart = data.machine.selection?.chart ?? null;
  const positions = positionsVisuelles(data, result);
  if (positions.every((p) => p.porteeM === null)) return indisponible("plan", titre, W, H, "Aucune portée saisie : vue en plan non tracée.");
  const calage = data.machine.selection?.calage ?? null;
  const dom = chart ? domaineGlobal(lignesAbaque(chart)) : null;
  const portees = positions.map((p) => p.porteeM).filter((v): v is number => v !== null);
  const repli = (i: number) => -50 + 50 * i;
  const selP = positionSelectionnee(positions, result, result.verdict.value.positionDefavorable?.id ?? null);
  const iSel = Math.max(0, positions.findIndex((p) => p.id === selP?.id));
  const geo = geometriePlan(data, selP ? (selP.angleDeg ?? repli(iSel)) : 0, selP?.porteeM ?? null, Math.max(dom?.max ?? 0, ...portees, 1));
  const rMax = Math.max(dom?.max ?? 0, ...portees, calage ? Math.max(calage.longueurM, calage.largeurM) / 2 : 0, geo.etendueM * 0.85, 1) * 1.05;
  const px = R_MAX_PX / rMax;
  const placees = positions.map((p, i) => {
    const manuel = p.angleDeg !== null;
    const a = p.angleDeg ?? repli(i);
    return { ...p, manuel, a, pt: p.porteeM === null ? null : polaire(a, p.porteeM * px) };
  });
  const avecAngle = placees.filter((p) => p.manuel && p.porteeM !== null);
  const prise = avecAngle[0];
  const pose = avecAngle.length >= 2 ? avecAngle[avecAngle.length - 1] : null;
  const sansAngle = placees.some((p) => p.porteeM !== null && !p.manuel);
  const prims: Prim[] = [];

  for (const t of graduations(0, rMax, 5).filter((v) => v > 0)) {
    prims.push({ k: "circle", cx: CX, cy: CY, r: t * px, stroke: VINCI.tableBorder, sw: 1 });
    prims.push({ k: "text", x: CX + 4, y: CY + t * px + 13, t: `${formatNombreFR(t, 0)} m`, size: 12, fill: VINCI.noir });
  }
  if (dom) {
    prims.push({ k: "circle", cx: CX, cy: CY, r: dom.max * px, stroke: VINCI.bleu, sw: 1.5, dash: "2 5" });
    prims.push({ k: "text", x: CX - 6, y: CY + dom.max * px + 14, t: `portée max. abaque ${formatNombreAuto(dom.max)} m`, size: 12, fill: VINCI.bleu, anchor: "end" });
  }
  if (calage) {
    const lw = calage.largeurM * px;
    const lh = calage.longueurM * px;
    prims.push({ k: "rect", x: CX - lw / 2, y: CY - lh / 2, w: lw, h: lh, stroke: VINCI.rougeDark, sw: 2.5, dash: "8 4" });
    prims.push({ k: "text", x: CX + lw / 2 + 6, y: CY + lh / 2, t: `calage ${formatNombreAuto(calage.longueurM)} × ${formatNombreAuto(calage.largeurM)} m`, size: 12, fill: VINCI.rougeDark });
  }
  let balayage = false;
  if (prise && pose) {
    balayage = true;
    const delta = ecartAngulaire(prise.a, pose.a);
    const sweep = delta > 0 ? 1 : 0;
    const large = Math.abs(delta) > 180 ? 1 : 0;
    const rp = (prise.porteeM as number) * px;
    const rq = (pose.porteeM as number) * px;
    const rOut = Math.max(rp, rq);
    const s0 = polaire(prise.a, rOut);
    const s1 = polaire(pose.a, rOut);
    prims.push({ k: "path", d: `M${CX},${CY} L${r2(CX + s0.x)},${r2(CY + s0.y)} A${r2(rOut)},${r2(rOut)} 0 ${large} ${sweep} ${r2(CX + s1.x)},${r2(CY + s1.y)} Z`, fill: VINCI.bleuXLight });
    for (const [a, rr] of [[prise.a, rp], [pose.a, rq]] as const) {
      const a0 = polaire(prise.a, rr);
      const a1 = polaire(pose.a, rr);
      prims.push({ k: "path", d: `M${r2(CX + a0.x)},${r2(CY + a0.y)} A${r2(rr)},${r2(rr)} 0 ${large} ${sweep} ${r2(CX + a1.x)},${r2(CY + a1.y)}`, stroke: VINCI.bleu, sw: 3 });
      const e = polaire(a, rr);
      prims.push({ k: "line", x1: CX, y1: CY, x2: CX + e.x, y2: CY + e.y, stroke: VINCI.bleu, w: 1.5 });
    }
  }
  prims.push(...formesVersPrims(projeter(geo.sil.formes, { ox: CX, oy: CY, s: px, flipY: false })));
  for (const p of placees) {
    if (p.pt === null) continue;
    prims.push({ k: "circle", cx: CX, cy: CY, r: (p.porteeM as number) * px, stroke: couleurZone(p.zone), sw: 1.8, dash: "6 4" });
  }
  for (const p of placees) {
    if (p.pt === null) continue;
    prims.push({ k: "circle", cx: CX + p.pt.x, cy: CY + p.pt.y, r: 10, fill: p.manuel ? couleurZone(p.zone) : VINCI.blanc, stroke: couleurZone(p.zone), sw: 3 });
    prims.push({ k: "text", x: CX + p.pt.x, y: CY + p.pt.y - 16, t: `${p.nom} · ${formatNombreAuto(p.porteeM as number)} m`, size: 13, fill: VINCI.noir, anchor: "middle", bold: true });
  }
  prims.push({ k: "circle", cx: CX, cy: CY, r: 9, fill: VINCI.bleuDark });
  prims.push({ k: "text", x: CX + 14, y: CY + 24, t: "axe de rotation", size: 12, fill: VINCI.noir });
  prims.push({ k: "path", d: `M${W - 40},${62} L${W - 40},${26} M${W - 48},${36} L${W - 40},${26} L${W - 32},${36}`, stroke: VINCI.noir, sw: 2 });
  prims.push({ k: "text", x: W - 40, y: 80, t: "0°", size: 12, fill: VINCI.noir, anchor: "middle" });

  const notes = [
    `${notePlanIndicatif(geo)} Angles : 0° = haut du plan, sens horaire.`,
    balayage ? "Le balayage suit l'arc le plus court entre la première et la dernière position." : "Arc de balayage tracé uniquement si l'angle de la prise et celui de la pose sont saisis.",
    ...(sansAngle ? ["Les positions sans angle saisi sont posées à titre indicatif sur leur cercle (pastille creuse)."] : []),
  ];
  return { id: "plan", titre, w: W, h: H, prims, notes, disponible: true };
}

export function construireSchemas(data: StudyData, result: StudyResult, seuils: { vert: number; orange: number }): Schema[] {
  return [schemaCourbe(data, result, seuils), schemaElevation(data, result), schemaPlan(data, result)];
}
