import type { AccessoireSaisie, ObstacleSaisie, PositionSaisie, SectionKey, StudyData } from "./types";

export function nouvelId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function accessoireVide(): AccessoireSaisie {
  return {
    id: nouvelId(),
    type: "elingue",
    label: "",
    masseKg: null,
    cmuKg: null,
    sollicitation: "brin",
  };
}

export function positionVide(nom = ""): PositionSaisie {
  return { id: nouvelId(), nom, porteeM: null, yM: null, angleDeg: null };
}

export function obstacleVide(): ObstacleSaisie {
  return { id: nouvelId(), nom: "", distanceM: null, hauteurM: null };
}

export function createInitialData(): StudyData {
  return {
    operation: { projet: "", lieu: "", date: "", description: "", intervenants: "", redacteur: "" },
    charge: {
      designation: "",
      masseKg: null,
      coefMarge: 1,
      longueurM: null,
      largeurM: null,
      hauteurM: null,
      centreGravite: "",
      surfaceVentM2: null,
    },
    accessoires: { liste: [], nbBrins: null, angleBetaDeg: null, equilibrageDeclare: false },
    machine: { selection: null, moufleCrochetKg: null, flechetteReplieeKg: null, autresKg: null },
    geometrie: {
      positions: [
        { id: "prise", nom: "Prise", porteeM: null, yM: null, angleDeg: null },
        { id: "rotation", nom: "Rotation", porteeM: null, yM: null, angleDeg: null },
        { id: "pose", nom: "Pose", porteeM: null, yM: null, angleDeg: null },
      ],
      hauteurSousCrochetM: null,
      obstacles: "",
      obstaclesSaisis: [],
    },
    sol: {
      mode: null,
      effortMaxKN: null,
      typeSurface: "plaque",
      plaqueLongueurM: null,
      plaqueLargeurM: null,
      patinSurfaceM2: null,
      chenilleLongueurM: null,
      chenilleTuileM: null,
      portanceKPa: null,
      proximites: "",
    },
    environnement: {
      uniteVent: "ms",
      ventPrevu: null,
      ventLimiteMachine: null,
      chargeFortePriseAuVent: false,
      ventLimiteCharge: null,
      lignes: null,
      ligneDistancePrevueM: null,
      ligneDistanceSeuilM: null,
      ligneTensionKV: null,
      voiesEtInterferences: "",
    },
    personnel: {
      conducteur: "",
      caces: "",
      autorisationConduite: false,
      chefManoeuvre: "",
      elingueur: "",
      vgpEngin: false,
      vgpAccessoires: false,
    },
    seuils: { vertPct: 90, orangePct: 100 },
    reserves: { liste: [] },
  };
}

/** Complète les sections absentes d'une sauvegarde plus ancienne avec les valeurs par défaut. */
export function fusionnerAvecDefauts(sauvegarde: Partial<StudyData> | undefined): StudyData {
  const base = createInitialData();
  if (!sauvegarde) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const k of Object.keys(base) as SectionKey[]) {
    const s = sauvegarde[k];
    if (s && typeof s === "object") out[k] = { ...(base[k] as object), ...(s as object) };
  }
  const data = out as unknown as StudyData;
  data.accessoires = { ...data.accessoires, liste: (data.accessoires.liste ?? []).map(accessoireDepuisSauvegarde) };
  return data;
}

/**
 * Accessoire d'une sauvegarde antérieure à D32 ({ cmuDirectKg, facteurMode }) → { cmuKg }.
 * CMU du mode utilisé = CMU direct × facteur de mode (CMU direct seule si le facteur n'était pas saisi).
 */
export function accessoireDepuisSauvegarde(a: AccessoireSaisie): AccessoireSaisie {
  const ancien = a as AccessoireSaisie & { cmuDirectKg?: number | null; facteurMode?: number | null };
  if (ancien.cmuKg !== undefined || !("cmuDirectKg" in ancien)) return a;
  const { cmuDirectKg, facteurMode, ...reste } = ancien;
  const cmuKg =
    typeof cmuDirectKg === "number" ? (typeof facteurMode === "number" && facteurMode > 0 ? cmuDirectKg * facteurMode : cmuDirectKg) : null;
  return { ...reste, cmuKg };
}
