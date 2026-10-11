/** Formatage d'affichage des valeurs de calcul (jamais toLocaleString). */
import type { CalcInput } from "@/engine";
import { formatMasse, formatNombreFR } from "@/lib/utils";

/** Nombre français avec le moins de décimales possible (max `maxDec`). */
export function formatNombreAuto(n: number, maxDec = 3): string {
  if (!Number.isFinite(n)) return "";
  for (let d = 0; d <= maxDec; d++) {
    if (Math.abs(Number(n.toFixed(d)) - n) < 1e-9) return formatNombreFR(n, d);
  }
  return formatNombreFR(n, maxDec);
}

/** Valeur d'un CalcInput avec son unité ; les masses en kg passent par formatMasse. */
export function formatCalcValue(input: CalcInput): string {
  const { value, unit } = input;
  if (typeof value === "string") return unit ? `${value} ${unit}` : value;
  if (unit === "kg") return formatMasse(value);
  const v = formatNombreAuto(value);
  return unit ? `${v} ${unit}` : v;
}

/** Taux (ratio) → "85,3 %". */
export function formatTaux(ratio: number | null): string {
  if (ratio === null) return "—";
  if (!Number.isFinite(ratio)) return "> 100 %";
  return `${formatNombreFR(ratio * 100, 1)} %`;
}
