/**
 * Modèle commun des visuels : positions enrichies des résultats du moteur (capacité, taux, zone).
 * Fonctions pures — les visuels n'affirment jamais une capacité, ils affichent celle du moteur.
 */
import type { Zone } from "@/engine";
import { VERDICT, VINCI } from "@/lib/design-tokens";
import type { StudyResult } from "@/lib/study/compute";
import type { StudyData } from "@/lib/study/types";

export interface PositionVisuelle {
  id: string;
  nom: string;
  porteeM: number | null;
  yM: number | null;
  angleDeg: number | null;
  capaciteKg: number | null;
  /** `true` quand le moteur a lu l'abaque et conclu « hors abaque ». */
  horsAbaque: boolean;
  taux: number | null;
  zone: Zone | null;
}

export function positionsVisuelles(data: StudyData, result: StudyResult): PositionVisuelle[] {
  const parId = new Map(result.verdict.value.positions.map((p) => [p.id, p]));
  return data.geometrie.positions.map((p, i) => {
    const r = parId.get(p.id);
    return {
      id: p.id,
      nom: p.nom.trim() || `Position ${i + 1}`,
      porteeM: p.porteeM,
      yM: p.yM,
      angleDeg: p.angleDeg ?? null,
      capaciteKg: r?.capacite.value ?? null,
      horsAbaque: r !== undefined && r.capacite.value === null,
      taux: r?.taux ?? null,
      zone: r ? (r.capacite.value === null ? "rouge" : r.zone) : null,
    };
  });
}

/** Couleur de zone (tokens VERDICT) ; gris neutre si la zone est inconnue. */
export function couleurZone(z: Zone | null): string {
  return z === "vert" ? VERDICT.vert : z === "orange" ? VERDICT.jaune : z === "rouge" ? VERDICT.rouge : VINCI.gris;
}

export const LIBELLE_ZONE: Record<Zone, string> = { vert: "vert", orange: "orange", rouge: "rouge" };

/** Position sélectionnée : celle demandée si elle existe, sinon la plus défavorable, sinon la première. */
export function positionSelectionnee(
  positions: PositionVisuelle[],
  result: StudyResult,
  id: string | null,
): PositionVisuelle | null {
  const direct = positions.find((p) => p.id === id);
  if (direct) return direct;
  const worst = result.verdict.value.positionDefavorable?.id;
  return positions.find((p) => p.id === worst) ?? positions[0] ?? null;
}

export interface PropsVue {
  data: StudyData;
  result: StudyResult;
  seuils: { vert: number; orange: number };
  /** Position sélectionnée (id) et sélecteur. */
  selectionId: string | null;
  onSelect: (id: string) => void;
  /** Déplace la portée d'une position (met à jour le store → recalcul). */
  onPortee: (id: string, porteeM: number) => void;
}
