/** Évaluation d'une configuration alternative pour le même levage — pure, ne modifie jamais l'étude. */
import type { LoadChart } from "@/engine";
import { computeStudy, type StudyResult } from "@/lib/study/compute";
import type { MachineSelection, StudyData } from "@/lib/study/types";

export interface Alternative {
  selection: MachineSelection;
  /** Masse moufle / crochet propre à la configuration, si le catalogue la donne. */
  moufleCrochetKg: number | null;
}

/** Copie de l'étude avec la machine alternative (charge, accessoires et positions inchangés). */
export function etudeAvecAlternative(data: StudyData, alt: Alternative): StudyData {
  return {
    ...data,
    machine: {
      ...data.machine,
      selection: alt.selection,
      moufleCrochetKg: alt.moufleCrochetKg ?? data.machine.moufleCrochetKg,
    },
  };
}

export function evaluerAlternative(data: StudyData, alt: Alternative): StudyResult {
  return computeStudy(etudeAvecAlternative(data, alt));
}

/** Les positions saisies sont-elles exploitables avec l'axe Y du nouvel abaque ? */
export function axeYIncompatible(data: StudyData, chart: LoadChart | null): boolean {
  if (!chart || chart.axisY === "none") return false;
  return data.geometrie.positions.some((p) => p.yM === null);
}
