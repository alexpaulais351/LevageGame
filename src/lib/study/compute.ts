/** Calcul complet d'une étude à partir de l'état saisi (pur ; utilisé en useMemo côté UI). */
import {
  checkCrawlerPressure,
  checkOutriggerPressure,
  checkPowerLine,
  checkRigging,
  checkWind,
  computeVerdict,
  totalLoad,
  type Calc,
  type Check,
  type GroundResult,
  type PowerLineResult,
  type RiggingResult,
  type VerdictResult,
  type WindResult,
} from "@/engine";

import {
  crawlerInput,
  outriggerInput,
  powerLineInput,
  reservesDocumentaires,
  riggingInput,
  totalLoadInput,
  verdictInput,
  windInput,
} from "./mapping";
import { ETAPES, completudeEtapes } from "./schemas";
import type { StudyData } from "./types";

export interface StudyResult {
  chargeTotale: Calc<number | null>;
  elingage: Check<RiggingResult>;
  sol: Check<GroundResult> | null;
  vent: Check<WindResult>;
  ligne: Check<PowerLineResult> | null;
  verdict: Calc<VerdictResult>;
  completude: boolean[];
  /** Nombre de données manquantes parmi les points bloquants. */
  nbDonneesManquantes: number;
}

/** Étapes documentaires dont l'incomplétude génère une réserve (le reste est déjà couvert par le moteur). */
const ETAPES_DOCUMENTAIRES = [0, 7];

export function computeStudy(d: StudyData): StudyResult {
  const completude = completudeEtapes(d);
  const chargeTotale = totalLoad(totalLoadInput(d));
  const elingage = checkRigging(riggingInput(d));
  const sol =
    d.sol.mode === "stabilisateurs"
      ? checkOutriggerPressure(outriggerInput(d))
      : d.sol.mode === "chenilles"
        ? checkCrawlerPressure(crawlerInput(d))
        : null;
  const vent = checkWind(windInput(d));
  const ligne = d.environnement.lignes === "oui" ? checkPowerLine(powerLineInput(d)) : null;

  const incompletes = ETAPES_DOCUMENTAIRES.filter((i) => !completude[i]).map((i) => ETAPES[i].titre);
  const controles = [
    elingage,
    vent,
    ...(sol ? [sol] : []),
    ...(ligne ? [ligne] : []),
    { issues: reservesDocumentaires(d, incompletes) },
  ];
  const verdict = computeVerdict(verdictInput(d, chargeTotale.value, controles));
  const nbDonneesManquantes = verdict.value.bloquants.filter((i) => i.code === "DONNEE_MANQUANTE").length;
  return { chargeTotale, elingage, sol, vent, ligne, verdict, completude, nbDonneesManquantes };
}
