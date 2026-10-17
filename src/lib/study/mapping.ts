/**
 * Mapping état de l'étude (saisie) → entrées du moteur de calcul. Fonctions pures.
 * Convention : une saisie vide (`null`) est transmise au moteur comme `undefined`,
 * ce qu'il traite comme « donnée manquante » (point bloquant), jamais comme 0.
 */
import { hookHeight } from "@/engine";
import type {
  Accessoire,
  Calc,
  CrawlerInput,
  Issue,
  LiftPosition,
  MinBearingInput,
  OutriggerInput,
  PowerLineInput,
  RiggingInput,
  Thresholds,
  TotalLoadInput,
  VerdictInput,
  WindInput,
} from "@/engine";

import { ventEnMs } from "./units";
import type { StudyData } from "./types";

/** `null` → `undefined` (donnée manquante pour le moteur). */
function m(v: number | null): number {
  return (v ?? undefined) as number;
}

function opt(v: number | null): number | undefined {
  return v ?? undefined;
}

export function totalLoadInput(d: StudyData): TotalLoadInput {
  return {
    chargeKg: m(d.charge.masseKg),
    coefMarge: m(d.charge.coefMarge),
    accessoiresKg: d.accessoires.liste.map((a) => m(a.masseKg)),
    moufleCrochetKg: m(d.machine.moufleCrochetKg),
    flechetteReplieeKg: opt(d.machine.flechetteReplieeKg),
    autresKg: opt(d.machine.autresKg),
  };
}

/** Masse suspendue sous crochet = charge × coef. de marge + accessoires (hors moufle / crochet de la machine). */
export function masseSousCrochetKg(d: StudyData): number | null {
  if (d.charge.masseKg === null || d.charge.coefMarge === null || !(d.charge.coefMarge >= 1)) return null;
  let total = d.charge.masseKg * d.charge.coefMarge;
  for (const a of d.accessoires.liste) {
    if (a.masseKg === null) return null;
    total += a.masseKg;
  }
  return total;
}

export function riggingInput(d: StudyData): RiggingInput {
  const accessoires: Accessoire[] = d.accessoires.liste.map((a, i) => ({
    id: a.id,
    label: a.label.trim() || `Accessoire ${i + 1}`,
    type: a.type,
    cmuKg: m(a.cmuKg),
    sollicitation: a.sollicitation,
  }));
  return {
    masseSousCrochetKg: m(masseSousCrochetKg(d)),
    nbBrins: m(d.accessoires.nbBrins),
    angleBetaDeg: m(d.accessoires.angleBetaDeg),
    equilibrageDeclare: d.accessoires.equilibrageDeclare,
    accessoires,
  };
}

/** Positions exploitables par le moteur (portée renseignée) ; les autres sont signalées à part. */
export function liftPositions(d: StudyData): LiftPosition[] {
  const axeY = d.machine.selection?.chart?.axisY ?? "none";
  const out: LiftPosition[] = [];
  for (const p of d.geometrie.positions) {
    if (p.porteeM === null) continue;
    if (axeY !== "none" && p.yM === null) continue;
    out.push({ id: p.id, label: p.nom.trim() || "Position", rayonM: p.porteeM, y: axeY === "none" ? null : p.yM });
  }
  return out;
}

/** Champs obligatoires manquants (positions incomplètes, choix à faire) pour le verdict. */
export function champsObligatoires(d: StudyData): { label: string; value: unknown }[] {
  const out: { label: string; value: unknown }[] = [];
  const axeY = d.machine.selection?.chart?.axisY ?? "none";
  for (const p of d.geometrie.positions) {
    const nom = p.nom.trim() || "Position";
    out.push({ label: `portée de la position « ${nom} »`, value: p.porteeM });
    if (axeY !== "none") {
      out.push({
        label: `${axeY === "height_m" ? "hauteur" : "longueur de flèche"} de la position « ${nom} »`,
        value: p.yM,
      });
    }
  }
  out.push({ label: "mode d'appui au sol", value: d.sol.mode });
  out.push({ label: "présence de lignes électriques (oui / non)", value: d.environnement.lignes });
  return out;
}

export function outriggerInput(d: StudyData): OutriggerInput {
  const s = d.sol;
  return {
    effortMaxKN: m(s.effortMaxKN),
    surface:
      s.typeSurface === "plaque"
        ? { type: "plaque", longueurM: m(s.plaqueLongueurM), largeurM: m(s.plaqueLargeurM) }
        : { type: "patin", surfaceM2: m(s.patinSurfaceM2) },
    portanceAdmissibleKPa: m(s.portanceKPa),
  };
}

/**
 * Portance minimale requise (aide à la saisie, étape Sol) : effort et surface d'appui saisis.
 * Stabilisateurs : S = plaque L × l ou patin ; chenilles : S = 2 × L × b. `null` si le mode d'appui n'est pas choisi.
 */
/**
 * Hauteur sous crochet retenue : valeur forcée si saisie, sinon calculée depuis les hauteurs d'appui
 * (point le plus haut + hauteur de charge + élingage + garde).
 */
export function hauteurSousCrochet(d: StudyData): { valeurM: number | null; mode: "saisie" | "calculee" | null; calc: Calc<number | null> } {
  const g = d.geometrie;
  const calc = hookHeight({
    appuis: g.positions.map((p, i) => ({ nom: p.nom.trim() || `Position ${i + 1}`, hauteurM: p.hauteurAppuiM ?? null })),
    hauteurChargeM: d.charge.hauteurM,
    hauteurElingageM: g.hauteurElingageM ?? null,
    gardeM: g.gardeM ?? null,
  });
  if (g.hauteurSousCrochetM !== null) return { valeurM: g.hauteurSousCrochetM, mode: "saisie", calc };
  return { valeurM: calc.value, mode: calc.value === null ? null : "calculee", calc };
}

export function minBearingInput(d: StudyData): MinBearingInput | null {
  const s = d.sol;
  const prod = (...v: (number | null)[]) => (v.every((x) => x !== null) ? v.reduce<number>((a, x) => a * (x as number), 1) : Number.NaN);
  const surfaceM2 =
    s.mode === "stabilisateurs"
      ? s.typeSurface === "plaque"
        ? prod(s.plaqueLongueurM, s.plaqueLargeurM)
        : prod(s.patinSurfaceM2)
      : s.mode === "chenilles"
        ? prod(2, s.chenilleLongueurM, s.chenilleTuileM)
        : null;
  if (surfaceM2 === null) return null;
  return { effortKN: s.effortMaxKN ?? Number.NaN, surfaceM2 };
}

export function crawlerInput(d: StudyData): CrawlerInput {
  const s = d.sol;
  return {
    effortKN: m(s.effortMaxKN),
    longueurAppuiM: m(s.chenilleLongueurM),
    largeurTuileM: m(s.chenilleTuileM),
    portanceAdmissibleKPa: m(s.portanceKPa),
  };
}

function enMs(v: number | null, d: StudyData): number {
  return v === null ? m(v) : ventEnMs(v, d.environnement.uniteVent);
}

export function windInput(d: StudyData): WindInput {
  const e = d.environnement;
  return {
    ventPrevuMs: enMs(e.ventPrevu, d),
    limiteMachineMs: enMs(e.ventLimiteMachine, d),
    chargeFortePriseAuVent: e.chargeFortePriseAuVent,
    limiteChargeMs: e.chargeFortePriseAuVent ? enMs(e.ventLimiteCharge, d) : undefined,
  };
}

export function powerLineInput(d: StudyData): PowerLineInput {
  const e = d.environnement;
  return {
    distancePrevueM: m(e.ligneDistancePrevueM),
    distanceSeuilM: m(e.ligneDistanceSeuilM),
    tensionKV: opt(e.ligneTensionKV),
    label: "ligne électrique",
  };
}

export function thresholds(d: StudyData): Thresholds {
  const nan = Number.NaN;
  return {
    greenMax: d.seuils.vertPct === null ? nan : d.seuils.vertPct / 100,
    orangeMax: d.seuils.orangePct === null ? nan : d.seuils.orangePct / 100,
  };
}

/**
 * Réserves (jamais bloquantes) liées au personnel, aux documents et aux étapes documentaires
 * incomplètes : elles empêchent un verdict « ADÉQUAT » sans réserve tant que le dossier est lacunaire.
 */
export function reservesDocumentaires(d: StudyData, etapesIncompletes: string[]): Issue[] {
  const r = (message: string): Issue => ({ code: "DONNEE_MANQUANTE", severity: "reserve", message });
  const out: Issue[] = [];
  const p = d.personnel;
  if (!p.autorisationConduite) out.push(r("Autorisation de conduite du conducteur non confirmée."));
  if (!p.vgpEngin) out.push(r("VGP de l'engin non confirmée à jour."));
  if (!p.vgpAccessoires) out.push(r("VGP des accessoires de levage non confirmée à jour."));
  for (const e of etapesIncompletes) out.push(r(`Étape « ${e} » incomplète.`));
  return out;
}

export function verdictInput(
  d: StudyData,
  chargeTotaleKg: number | null,
  controles: { issues: Issue[] }[],
): VerdictInput {
  return {
    chart: d.machine.selection?.chart ?? null,
    positions: liftPositions(d),
    chargeTotaleKg,
    thresholds: thresholds(d),
    controles,
    champsObligatoires: champsObligatoires(d),
  };
}
