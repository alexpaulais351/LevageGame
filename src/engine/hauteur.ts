/**
 * Hauteur sous crochet nécessaire, déduite des points d'appui (prise / pose) saisis.
 * H = max(hauteur d'appui) + hauteur de la charge + hauteur d'élingage + garde.
 * Aucune valeur par défaut : élingage et garde non saisis valent 0 et le résultat le signale.
 */
import type { Calc, CalcInput } from "./types";
import { isFiniteNumber } from "./util";

export interface HookHeightInput {
  /** Hauteurs des points d'appui (m, par rapport au sol de la machine), par position. */
  appuis: { nom: string; hauteurM: number | null }[];
  hauteurChargeM: number | null;
  /** Hauteur entre le crochet et le dessus de la charge (élingues, palonnier, manilles). */
  hauteurElingageM: number | null;
  /** Garde de franchissement au-dessus de l'appui le plus haut. */
  gardeM: number | null;
}

export function hookHeight(input: HookHeightInput): Calc<number | null> {
  const appuis = input.appuis.filter((a): a is { nom: string; hauteurM: number } => isFiniteNumber(a.hauteurM) && a.hauteurM >= 0);
  const warnings: string[] = [];
  if (appuis.length === 0) warnings.push("Donnée manquante : hauteur du point de prise ou de pose.");
  const hc = isFiniteNumber(input.hauteurChargeM) && input.hauteurChargeM > 0 ? input.hauteurChargeM : null;
  if (hc === null) warnings.push("Donnée manquante : hauteur de la charge (étape Charge).");
  const he = isFiniteNumber(input.hauteurElingageM) && input.hauteurElingageM >= 0 ? input.hauteurElingageM : 0;
  if (!isFiniteNumber(input.hauteurElingageM)) warnings.push("Hauteur d'élingage non saisie : comptée 0 m.");
  const garde = isFiniteNumber(input.gardeM) && input.gardeM >= 0 ? input.gardeM : 0;

  const haut = appuis.reduce<{ nom: string; hauteurM: number } | null>((m, a) => (m === null || a.hauteurM > m.hauteurM ? a : m), null);
  const inputs: Record<string, CalcInput> = {
    Ha: { value: haut ? haut.hauteurM : "non saisi", unit: "m", label: haut ? `Point d'appui le plus haut (${haut.nom})` : "Point d'appui le plus haut" },
    Hc: { value: hc ?? "non saisi", unit: "m", label: "Hauteur de la charge" },
    He: { value: he, unit: "m", label: "Hauteur d'élingage (crochet → dessus de charge)" },
    g: { value: garde, unit: "m", label: "Garde de franchissement" },
  };
  const value = haut && hc !== null ? haut.hauteurM + hc + he + garde : null;
  return { value, formula: "Hauteur sous crochet H = Ha + Hc + He + g", inputs, source: "Hauteurs saisies", warnings };
}
