/**
 * Types de l'état d'une étude (saisie utilisateur). Aucune dépendance React / réseau.
 * Les nombres vides sont `null` ; les unités internes sont kg, m, kN, kPa, degrés.
 */
import type { AccessoireType, LoadChart } from "@/engine";

export type Sollicitation = "brin" | "ensemble";

export interface AccessoireSaisie {
  id: string;
  type: AccessoireType;
  label: string;
  /** Masse propre de l'accessoire (kg), comptée dans la charge totale. */
  masseKg: number | null;
  /** CMU (kg) marquée pour le mode d'élingage utilisé (direct, étranglé, panier, multibrins…). */
  cmuKg: number | null;
  /** Rôle : comparé à l'effort par brin ou à la masse de l'ensemble. */
  sollicitation: Sollicitation;
}

export interface PositionSaisie {
  id: string;
  nom: string;
  porteeM: number | null;
  /** Longueur de flèche ou hauteur, selon l'axe Y de l'abaque. */
  yM: number | null;
  /** Direction de la position dans le plan (degrés, 0 = haut du plan, sens horaire) ; `null` = non saisi. */
  angleDeg?: number | null;
}

/** Obstacle saisi pour le schéma en élévation (distance depuis l'axe de rotation, hauteur au sol). */
export interface ObstacleSaisie {
  id: string;
  nom: string;
  distanceM: number | null;
  hauteurM: number | null;
}

/** Dimensions de calage (emprise des stabilisateurs), si connues pour la configuration. */
export interface CalageDimensions {
  longueurM: number;
  largeurM: number;
}

export interface MachineSelection {
  typeId: string;
  typeLabel: string;
  manufacturerId: string;
  manufacturerName: string;
  machineId: string;
  model: string;
  configurationId: string;
  configurationLabel: string;
  /** Instantané de l'abaque au moment du choix (traçabilité de l'étude). */
  chart: LoadChart | null;
  /** Emprise des stabilisateurs (paramètres de configuration), absente tant que le catalogue ne la fournit pas. */
  calage?: CalageDimensions | null;
  /** Machine personnelle de l'utilisateur (hors catalogue public). */
  personnelle?: boolean;
  /** Photo de la machine réelle (user-files/<uid>/machines/<id>/photo.*), jointe au PDF si présente. */
  photoPath?: string | null;
}

export type ModeAppui = "stabilisateurs" | "chenilles" | "non_applicable";
export type TypeSurface = "plaque" | "patin";
export type UniteVent = "ms" | "kmh";

export interface StudyData {
  operation: {
    projet: string;
    lieu: string;
    date: string;
    description: string;
    intervenants: string;
    redacteur: string;
  };
  charge: {
    designation: string;
    masseKg: number | null;
    /** Coefficient de marge appliqué à la masse de la charge (≥ 1 ; 1 = sans marge). */
    coefMarge: number | null;
    longueurM: number | null;
    largeurM: number | null;
    hauteurM: number | null;
    centreGravite: string;
    surfaceVentM2: number | null;
  };
  accessoires: {
    liste: AccessoireSaisie[];
    nbBrins: number | null;
    angleBetaDeg: number | null;
    equilibrageDeclare: boolean;
  };
  machine: {
    selection: MachineSelection | null;
    moufleCrochetKg: number | null;
    flechetteReplieeKg: number | null;
    autresKg: number | null;
  };
  geometrie: {
    positions: PositionSaisie[];
    hauteurSousCrochetM: number | null;
    obstacles: string;
    /** Obstacles chiffrés (nom, distance, hauteur) affichés sur le schéma. */
    obstaclesSaisis: ObstacleSaisie[];
  };
  sol: {
    mode: ModeAppui | null;
    effortMaxKN: number | null;
    typeSurface: TypeSurface;
    plaqueLongueurM: number | null;
    plaqueLargeurM: number | null;
    patinSurfaceM2: number | null;
    chenilleLongueurM: number | null;
    chenilleTuileM: number | null;
    portanceKPa: number | null;
    proximites: string;
  };
  environnement: {
    uniteVent: UniteVent;
    ventPrevu: number | null;
    ventLimiteMachine: number | null;
    chargeFortePriseAuVent: boolean;
    ventLimiteCharge: number | null;
    lignes: "oui" | "non" | null;
    ligneDistancePrevueM: number | null;
    ligneDistanceSeuilM: number | null;
    ligneTensionKV: number | null;
    voiesEtInterferences: string;
  };
  personnel: {
    conducteur: string;
    caces: string;
    autorisationConduite: boolean;
    chefManoeuvre: string;
    elingueur: string;
    vgpEngin: boolean;
    vgpAccessoires: boolean;
  };
  /** Seuils du verdict en pourcentage (défaut 80 / 100). */
  seuils: { vertPct: number | null; orangePct: number | null };
  reserves: { liste: { id: string; texte: string }[] };
}

export type SectionKey = keyof StudyData;
