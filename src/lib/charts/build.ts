/**
 * Abaque saisi par l'utilisateur (CSV collé/importé ou grille éditable) → points + rapport de validation.
 * Point d'entrée UNIQUE utilisé par l'aperçu (client) et par la Server Action (serveur) : mêmes règles.
 */
import type { ChartAxisY } from "../../engine/types";
import { parseChartCsv } from "./csv";
import { grilleVersPoints, type LigneGrille } from "./grid";
import { analyserAbaque, type RapportAbaque } from "./validate";

export interface AbaqueSaisi {
  mode: "csv" | "grille";
  csv: string;
  grille: LigneGrille[];
  axisY: ChartAxisY;
  unit: "kg" | "t";
  standard: string | null;
  deductionsIncluded: boolean;
  interpolationAllowed: boolean;
}

export interface SourceSaisie {
  title: string;
  reference: string | null;
  edition: string | null;
  url: string | null;
}

export function construireAbaque(a: AbaqueSaisi, source: SourceSaisie, id = "apercu"): RapportAbaque {
  const lu = a.mode === "csv" ? parseChartCsv(a.csv, a.axisY, a.unit) : grilleVersPoints(a.grille, a.axisY, a.unit);
  return analyserAbaque(
    {
      id,
      points: lu.points,
      axisY: a.axisY,
      interpolationAllowed: a.interpolationAllowed,
      standard: a.standard,
      deductionsIncluded: a.deductionsIncluded,
      source,
    },
    lu.errors,
  );
}

export interface AvertissementsClasses {
  cellulesVides: string[];
  capaciteCroissante: string[];
  autres: string[];
}

/** Regroupe les avertissements du moteur par nature pour le rapport de validation. */
export function classerAvertissements(warnings: string[]): AvertissementsClasses {
  const r: AvertissementsClasses = { cellulesVides: [], capaciteCroissante: [], autres: [] };
  for (const w of warnings) {
    if (/cellule vide/.test(w)) r.cellulesVides.push(w);
    else if (/capacité croissante/.test(w)) r.capaciteCroissante.push(w);
    else r.autres.push(w);
  }
  return r;
}
