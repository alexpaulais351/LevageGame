import type { ChartAxisY, ChartPoint } from "../../engine/types";

export const CSV_HEADER = "radius_m,y,capacity";

export interface CsvResult {
  points: ChartPoint[];
  errors: string[];
}

/** Nombre strict : "12.5", "-3" ; refuse "", "1,5", "abc", "Infinity". Retourne NaN sinon. */
function num(s: string): number {
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

/**
 * Parse un CSV d'abaque (en-tête `radius_m,y,capacity`, virgule, décimale point).
 * Capacité vide => null (cellule vide). Capacité convertie en kg si unit = 't'.
 * y doit valoir 0 si axisY = 'none'.
 */
export function parseChartCsv(text: string, axisY: ChartAxisY, unit: "kg" | "t"): CsvResult {
  const errors: string[] = [];
  const points: ChartPoint[] = [];
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length === 0 || lines[0].trim() !== CSV_HEADER) {
    errors.push(`en-tête attendu « ${CSV_HEADER} »`);
    return { points, errors };
  }
  const factor = unit === "t" ? 1000 : 1;
  lines.slice(1).forEach((raw, idx) => {
    const ln = idx + 2;
    if (raw.trim() === "") {
      errors.push(`ligne ${ln} : ligne vide`);
      return;
    }
    const cells = raw.split(",").map((c) => c.trim());
    if (cells.length !== 3) {
      errors.push(`ligne ${ln} : 3 colonnes attendues (${cells.length} trouvées)`);
      return;
    }
    const [xs, ys, cs] = cells;
    const x = num(xs);
    const y = num(ys);
    if (Number.isNaN(x)) errors.push(`ligne ${ln} : radius_m illisible « ${xs} »`);
    if (Number.isNaN(y)) errors.push(`ligne ${ln} : y illisible « ${ys} »`);
    else if (axisY === "none" && y !== 0) errors.push(`ligne ${ln} : y doit valoir 0 quand axis_y = none`);
    let capacityKg: number | null;
    if (cs === "") capacityKg = null;
    else {
      const c = num(cs);
      capacityKg = Number.isNaN(c) ? NaN : Number((c * factor).toFixed(6));
      if (Number.isNaN(c)) errors.push(`ligne ${ln} : capacity illisible « ${cs} »`);
    }
    points.push({ x, y: axisY === "none" ? null : y, capacityKg });
  });
  return { points, errors };
}
