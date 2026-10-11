/**
 * Pont entre l'étude (StudyData) et les silhouettes : type de machine, dimensions connues, géométrie d'élévation.
 * Partagé par ElevationView / PlanView (écran) et schemaElevation / schemaPlan (fiche PDF) : une seule règle.
 */
import {
  profilElevation,
  silhouettePlan,
  silhouetteElevation,
  typeMachineDepuis,
  type Calage,
  type DimsMachine,
  type SortieElevation,
  type SortiePlan,
  type TypeMachine,
} from "@/lib/visuals/silhouettes";
import type { MachineSelection, StudyData } from "@/lib/study/types";

import { angleFlecheDeg, hauteurTeteM } from "./geometry";
import type { PositionVisuelle } from "./model";

/** Valeurs par défaut du schéma de charge (indicatives) lorsque la donnée n'est pas saisie. */
export const CHARGE_LARGEUR_DEFAUT_M = 1.5;
export const CHARGE_HAUTEUR_DEFAUT_M = 1;
const ELINGUE_M = 0.8;
/** Hauteur de la moufle + crochet dessinés sous le point d'attache du câble (m). */
export const HAUTEUR_MOUFLE_M = 1.25;

const TYPES_FLECHE_DROITE: readonly TypeMachine[] = [
  "grue_mobile",
  "grue_mobile_chenilles",
  "grue_auxiliaire",
  "telescopique_fixe",
  "telescopique_rotatif",
];

/** Type de machine de la sélection (déduit du libellé du type) ; `indicatif` si non reconnu (grue mobile par défaut). */
export function typeDeLaSelection(sel: MachineSelection | null | undefined): { type: TypeMachine; reconnu: boolean } {
  const t = typeMachineDepuis(null, sel?.typeLabel);
  return t ? { type: t, reconnu: true } : { type: "grue_mobile", reconnu: false };
}

export function dimsDeLaSelection(sel: MachineSelection | null | undefined, longueurFlecheM: number | null): DimsMachine {
  return { calage: sel?.calage ?? null, longueurFlecheM };
}

/** Stabilisateurs sortis / rentrés d'après le mode d'appui saisi ou l'emprise connue ; `null` = défaut du type. */
export function calageDeLEtude(data: StudyData): Calage | null {
  if (data.sol.mode === "stabilisateurs" || data.machine.selection?.calage) return "sortis";
  if (data.sol.mode === "chenilles") return "rentres";
  return null;
}

export interface GeoElevation {
  type: TypeMachine;
  typeReconnu: boolean;
  sil: SortieElevation;
  hPied: number;
  /** Portée utilisée (m). */
  r: number;
  teteY: number;
  teteIndicative: boolean;
  angle: number | null;
  sansCable: boolean;
  chargeL: number;
  chargeH: number;
  chargeIndicative: boolean;
  elingue: number;
  /** Hauteur du crochet (m) : point bas de la moufle d'où partent les élingues. */
  crochetY: number;
  crochetIndicatif: boolean;
}

/** Géométrie d'élévation pilotée par les données (portée, longueur/hauteur d'abaque, hauteur sous crochet). */
export function geometrieElevation(data: StudyData, pos: PositionVisuelle, domaineMin: number | null): GeoElevation {
  const selection = data.machine.selection;
  const { type, reconnu } = typeDeLaSelection(selection);
  const axeY = selection?.chart?.axisY ?? "none";
  const g = data.geometrie;
  const c = data.charge;
  const r = pos.porteeM ?? domaineMin ?? 0;
  const droite = TYPES_FLECHE_DROITE.includes(type);
  const longueur = droite && axeY === "boom_length_m" ? pos.yM : null;
  const dims = dimsDeLaSelection(selection, longueur);
  const profil = profilElevation(type, dims);
  const hPied = profil.hauteurPiedM;
  const chargeL = c.longueurM ?? CHARGE_LARGEUR_DEFAUT_M;
  const chargeH = c.hauteurM ?? CHARGE_HAUTEUR_DEFAUT_M;
  const chargeIndicative = c.longueurM === null || c.hauteurM === null;

  const hTete = hauteurTeteM(r, longueur);
  const angle = angleFlecheDeg(r, longueur);
  let teteY: number;
  let teteIndicative = false;
  if (hTete !== null) teteY = hPied + hTete;
  else if (axeY === "height_m" && pos.yM !== null) teteY = pos.yM;
  else {
    teteIndicative = true;
    if (type === "chariot_elevateur") teteY = Math.max(0.1, (g.hauteurSousCrochetM ?? chargeH + 0.5) - chargeH);
    else if (type.startsWith("pelle")) teteY = (g.hauteurSousCrochetM ?? 3) + 1;
    else teteY = (g.hauteurSousCrochetM ?? 6) + 2;
  }
  teteY = Math.max(teteY, profil.hauteurTeteMinM);

  const sil = silhouetteElevation({ type, dims, stabilisateurs: calageDeLEtude(data), tete: { x: r, y: teteY } });
  const elingue = sil.sansCable ? 0 : ELINGUE_M;
  const teteReelle = sil.tete[1];
  let crochetY: number;
  if (sil.sansCable) crochetY = teteReelle + chargeH;
  else {
    crochetY = g.hauteurSousCrochetM ?? chargeH + elingue;
    crochetY = Math.min(Math.max(crochetY, chargeH + elingue), teteReelle - HAUTEUR_MOUFLE_M - 0.15);
    crochetY = Math.max(crochetY, elingue);
  }
  return {
    type,
    typeReconnu: reconnu,
    sil,
    hPied,
    r,
    teteY: teteReelle,
    teteIndicative,
    angle,
    sansCable: sil.sansCable,
    chargeL,
    chargeH,
    chargeIndicative,
    elingue,
    crochetY,
    crochetIndicatif: g.hauteurSousCrochetM === null,
  };
}

/** Phrase « indicatif » commune écran / fiche. */
/** Hauteur (m) de la ligne d'axe de rotation et position de la cote d'angle (pixels non concernés). */
export function hauteurAxeM(geo: GeoElevation): number {
  return Math.max(geo.hPied + 1.2, Math.min(geo.sil.bornes.maxY * 0.9, geo.hPied + 4));
}

export function noteIndicatif(geo: GeoElevation): string {
  const liste = [...geo.sil.indicatif];
  if (!geo.typeReconnu) liste.push("type de machine non reconnu (silhouette de grue mobile)");
  const dims = liste.length > 0 ? `silhouette « ${geo.type.replace(/_/g, " ")} » avec proportions par défaut (${liste.join(", ")})` : "silhouette de la famille de machine";
  return `Schéma indicatif — ne remplace pas les plans constructeur : ${dims}`;
}

export interface GeoPlan {
  type: TypeMachine;
  typeReconnu: boolean;
  sil: SortiePlan;
  /** Demi-étendue (m) de la partie fixe de la silhouette, à inclure dans l'échelle du plan. */
  etendueM: number;
}

/**
 * Silhouette en plan de la position affichée. L'échelle du plan se base sur une silhouette de référence
 * (azimut 0°, portée maximale) pour ne pas « sauter » quand on change de position.
 */
export function geometriePlan(data: StudyData, azimutDeg: number, porteeM: number | null, porteeRefM: number): GeoPlan {
  const selection = data.machine.selection;
  const { type, reconnu } = typeDeLaSelection(selection);
  const dims = dimsDeLaSelection(selection, null);
  const stabilisateurs = calageDeLEtude(data);
  const sil = silhouettePlan({ type, dims, stabilisateurs, azimutDeg, porteeM });
  const ref = silhouettePlan({ type, dims, stabilisateurs, azimutDeg: 0, porteeM: porteeRefM });
  const b = ref.bornes;
  return { type, typeReconnu: reconnu, sil, etendueM: Math.max(Math.abs(b.minX), Math.abs(b.maxX), Math.abs(b.minY), Math.abs(b.maxY)) };
}

export function notePlanIndicatif(geo: GeoPlan): string {
  const liste = [...geo.sil.indicatif];
  if (!geo.typeReconnu) liste.push("type de machine non reconnu");
  return `Schéma indicatif — ne remplace pas les plans constructeur : silhouette « ${geo.type.replace(/_/g, " ")} »${liste.length > 0 ? `, proportions par défaut (${liste.join(", ")})` : ""}.`;
}
