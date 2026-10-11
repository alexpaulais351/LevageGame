/**
 * Lecture d'abaque (courbe de charge) — règles impératives (CLAUDE.md, règles 1 et 2) :
 * - jamais d'extrapolation : hors domaine ⇒ `null` + avertissement « hors abaque » ;
 * - nœud exact ⇒ valeur du nœud ;
 * - entre nœuds : MIN des nœuds encadrants (2 à 4 nœuds), sauf `interpolationAllowed`
 *   ⇒ interpolation linéaire en portée uniquement, sur une ligne y existante ;
 *   pour un y intermédiaire, on retient le minimum des deux lignes encadrantes ;
 * - cellule vide (capacité `null`) parmi les nœuds utilisés ⇒ hors abaque.
 *
 * Domaine d'une ligne y : [x min ; x max] des nœuds de CETTE ligne (la portée max
 * varie selon la longueur de flèche). Pour un y intermédiaire, les deux lignes
 * doivent couvrir la portée demandée, sinon hors abaque.
 */
import type { Calc, CalcInput, ChartPoint, ChartValidation, LoadChart } from "./types";
import { approxEq, gt, isFiniteNumber, lt } from "./util";

export const HORS_ABAQUE = "hors abaque";

const Y_LABEL: Record<LoadChart["axisY"], string> = {
  boom_length_m: "Longueur de flèche",
  height_m: "Hauteur",
  none: "—",
};

export function chartSourceLabel(chart: LoadChart): string {
  const s = chart.source;
  const parts = [s.title, s.reference, s.edition ? `éd. ${s.edition}` : "", chart.standard, s.url].filter(
    (p) => p && p.trim() !== "",
  );
  const statut = chart.status === "verifie" ? "vérifié" : "À VÉRIFIER";
  return `Abaque ${chart.id} — ${parts.join(" · ")} — statut : ${statut}`;
}

/** Valeurs y distinctes triées (tolérance EPS). */
function distinctYs(points: ChartPoint[]): number[] {
  const ys: number[] = [];
  for (const p of points) {
    if (!isFiniteNumber(p.y)) continue;
    if (!ys.some((y) => approxEq(y, p.y as number))) ys.push(p.y);
  }
  return ys.sort((a, b) => a - b);
}

function lineAt(chart: LoadChart, y: number | null): ChartPoint[] {
  const pts =
    chart.axisY === "none"
      ? chart.points
      : chart.points.filter((p) => isFiniteNumber(p.y) && y !== null && approxEq(p.y, y));
  return pts.filter((p) => isFiniteNumber(p.x)).sort((a, b) => a.x - b.x);
}

interface LineReading {
  value: number | null;
  nodes: ChartPoint[];
  reason?: string;
}

/** Lecture sur une ligne y existante. */
function readLine(line: ChartPoint[], x: number, interpolationAllowed: boolean): LineReading {
  if (line.length === 0) return { value: null, nodes: [], reason: "ligne absente de la grille" };
  const first = line[0];
  const last = line[line.length - 1];
  if (lt(x, first.x) || gt(x, last.x)) {
    return { value: null, nodes: [], reason: `portée hors domaine de la ligne [${first.x} ; ${last.x}] m` };
  }
  const exact = line.find((p) => approxEq(p.x, x));
  if (exact) {
    if (!isFiniteNumber(exact.capacityKg)) return { value: null, nodes: [exact], reason: "cellule vide" };
    return { value: exact.capacityKg, nodes: [exact] };
  }
  let i = 0;
  while (i < line.length - 1 && !(line[i].x < x && x < line[i + 1].x)) i++;
  const lo = line[i];
  const hi = line[i + 1];
  if (!isFiniteNumber(lo.capacityKg) || !isFiniteNumber(hi.capacityKg)) {
    return { value: null, nodes: [lo, hi], reason: "cellule vide parmi les nœuds encadrants" };
  }
  if (interpolationAllowed) {
    const t = (x - lo.x) / (hi.x - lo.x);
    return { value: lo.capacityKg + t * (hi.capacityKg - lo.capacityKg), nodes: [lo, hi] };
  }
  return { value: Math.min(lo.capacityKg, hi.capacityKg), nodes: [lo, hi] };
}

function nodeInputs(nodes: ChartPoint[], yLabel: string): Record<string, CalcInput> {
  const out: Record<string, CalcInput> = {};
  nodes.forEach((n, k) => {
    const where = n.y === null ? `portée ${n.x} m` : `portée ${n.x} m, ${yLabel.toLowerCase()} ${n.y} m`;
    out[`noeud_${k + 1}`] = {
      value: isFiniteNumber(n.capacityKg) ? n.capacityKg : "cellule vide",
      unit: isFiniteNumber(n.capacityKg) ? "kg" : "",
      label: `Nœud (${where})`,
    };
  });
  return out;
}

/**
 * Lit la capacité de l'abaque à la portée `x` (m) et, si l'abaque a un second axe,
 * à la valeur `y` (longueur de flèche ou hauteur, m).
 */
export function readCapacity(chart: LoadChart, x: number, y?: number | null): Calc<number | null> {
  const yLabel = Y_LABEL[chart.axisY];
  const inputs: Record<string, CalcInput> = {
    portee: { value: isFiniteNumber(x) ? x : String(x), unit: "m", label: "Portée" },
  };
  if (chart.axisY !== "none") {
    inputs.y = { value: isFiniteNumber(y) ? y : "non renseigné", unit: "m", label: yLabel };
  }
  const warnings: string[] = [];
  if (chart.status === "a_verifier") warnings.push("Abaque à vérifier : valeurs non contrôlées contre le document constructeur.");
  const source = chartSourceLabel(chart);
  const modeFormule = chart.interpolationAllowed
    ? "interpolation linéaire en portée entre nœuds encadrants (autorisée par le constructeur)"
    : "valeur la plus défavorable (minimum) des nœuds encadrants";

  const out = (value: number | null, formula: string, extra: Record<string, CalcInput> = {}, w: string[] = []) => ({
    value,
    formula,
    inputs: { ...inputs, ...extra },
    source,
    warnings: [...warnings, ...w],
  });
  const horsAbaque = (raison: string, extra: Record<string, CalcInput> = {}) =>
    out(null, `Capacité = ${HORS_ABAQUE} (${raison}) — aucune extrapolation`, extra, [`${HORS_ABAQUE} : ${raison}`]);

  if (!isFiniteNumber(x)) return horsAbaque("portée non renseignée ou invalide");
  if (chart.points.length === 0) return horsAbaque("abaque vide");

  if (chart.axisY === "none") {
    const r = readLine(lineAt(chart, null), x, chart.interpolationAllowed);
    const extra = nodeInputs(r.nodes, yLabel);
    if (r.value === null) return horsAbaque(r.reason ?? "", extra);
    return out(r.value, r.nodes.length === 1 ? "Capacité = valeur du nœud" : `Capacité = ${modeFormule}`, extra);
  }

  if (!isFiniteNumber(y)) return horsAbaque(`${yLabel.toLowerCase()} non renseignée ou invalide`);
  const ys = distinctYs(chart.points);
  if (ys.length === 0) return horsAbaque("aucune ligne valide");
  if (lt(y, ys[0]) || gt(y, ys[ys.length - 1])) {
    return horsAbaque(`${yLabel.toLowerCase()} ${y} m hors des valeurs de la grille [${ys[0]} ; ${ys[ys.length - 1]}] m`);
  }

  const yExact = ys.find((v) => approxEq(v, y));
  if (yExact !== undefined) {
    const r = readLine(lineAt(chart, yExact), x, chart.interpolationAllowed);
    const extra = nodeInputs(r.nodes, yLabel);
    if (r.value === null) return horsAbaque(r.reason ?? "", extra);
    return out(r.value, r.nodes.length === 1 ? "Capacité = valeur du nœud" : `Capacité = ${modeFormule}`, extra);
  }

  // y intermédiaire : lecture sur les deux lignes encadrantes, minimum des deux.
  let j = 0;
  while (j < ys.length - 1 && !(ys[j] < y && y < ys[j + 1])) j++;
  const yLo = ys[j];
  const yHi = ys[j + 1];
  const rLo = readLine(lineAt(chart, yLo), x, chart.interpolationAllowed);
  const rHi = readLine(lineAt(chart, yHi), x, chart.interpolationAllowed);
  const extra = nodeInputs([...rLo.nodes, ...rHi.nodes], yLabel);
  if (rLo.value === null) return horsAbaque(`ligne ${yLo} m : ${rLo.reason ?? ""}`, extra);
  if (rHi.value === null) return horsAbaque(`ligne ${yHi} m : ${rHi.reason ?? ""}`, extra);
  return out(
    Math.min(rLo.value, rHi.value),
    `Capacité = min(lecture ligne ${yLo} m ; lecture ligne ${yHi} m), chaque lecture : ${modeFormule}`,
    {
      ...extra,
      ligne_inf: { value: rLo.value, unit: "kg", label: `Lecture ligne ${yLabel.toLowerCase()} ${yLo} m` },
      ligne_sup: { value: rHi.value, unit: "kg", label: `Lecture ligne ${yLabel.toLowerCase()} ${yHi} m` },
    },
  );
}

/**
 * Contrôle de cohérence d'un abaque.
 * Erreurs : grille vide, NaN/infini, valeurs négatives, doublons, y manquant, plusieurs y pour axisY 'none'.
 * Avertissements : capacité qui croît avec la portée à y constant, cellules vides, source incomplète.
 */
export function validateChart(chart: LoadChart): ChartValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!chart.points || chart.points.length === 0) {
    return { valid: false, errors: ["Grille vide : aucun point."], warnings };
  }
  chart.points.forEach((p, i) => {
    const id = `point ${i + 1} (x=${p.x}, y=${p.y})`;
    if (!isFiniteNumber(p.x)) errors.push(`${id} : portée non numérique (NaN/infini).`);
    else if (p.x < 0) errors.push(`${id} : portée négative.`);
    if (chart.axisY !== "none") {
      if (!isFiniteNumber(p.y)) errors.push(`${id} : ${Y_LABEL[chart.axisY].toLowerCase()} manquante ou non numérique.`);
      else if (p.y < 0) errors.push(`${id} : ${Y_LABEL[chart.axisY].toLowerCase()} négative.`);
    }
    if (p.capacityKg === null) warnings.push(`${id} : cellule vide (lecture « hors abaque » à ce nœud).`);
    else if (!isFiniteNumber(p.capacityKg)) errors.push(`${id} : capacité non numérique (NaN/infini).`);
    else if (p.capacityKg < 0) errors.push(`${id} : capacité négative.`);
  });

  if (chart.axisY === "none" && distinctYs(chart.points).length > 1) {
    errors.push("Abaque sans second axe mais plusieurs valeurs y distinctes.");
  }

  const ys = chart.axisY === "none" ? [null] : distinctYs(chart.points);
  for (const y of ys) {
    const line = lineAt(chart, y);
    const lbl = y === null ? "ligne unique" : `ligne y=${y} m`;
    for (let i = 1; i < line.length; i++) {
      if (approxEq(line[i].x, line[i - 1].x)) errors.push(`${lbl} : doublon à la portée ${line[i].x} m.`);
    }
    let prev: ChartPoint | undefined;
    for (const p of line) {
      if (!isFiniteNumber(p.capacityKg)) continue;
      if (prev && isFiniteNumber(prev.capacityKg) && gt(p.capacityKg, prev.capacityKg) && gt(p.x, prev.x)) {
        warnings.push(
          `${lbl} : capacité croissante avec la portée (${prev.capacityKg} kg à ${prev.x} m → ${p.capacityKg} kg à ${p.x} m) — à contrôler.`,
        );
      }
      prev = p;
    }
  }

  const s = chart.source;
  if (!s || !s.title?.trim() || !s.reference?.trim()) warnings.push("Source incomplète (titre / référence).");
  if (!chart.standard?.trim()) warnings.push("Norme de calcul non renseignée.");

  return { valid: errors.length === 0, errors, warnings };
}
