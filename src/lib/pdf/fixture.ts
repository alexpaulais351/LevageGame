/**
 * Étude FICTIVE (tests et génération de PDF d'essai). Toutes les valeurs, y compris l'abaque,
 * sont inventées pour les besoins du test : elles ne doivent JAMAIS servir à une adéquation réelle.
 */
import type { LoadChart } from "@/engine";
import { computeStudy } from "@/lib/study/compute";
import { createInitialData } from "@/lib/study/defaults";
import type { StudyData } from "@/lib/study/types";

export function abaqueFictif(statut: LoadChart["status"] = "a_verifier"): LoadChart {
  const lignes: [number, [number, number | null][]][] = [
    [20, [[3, 30000], [4, 26000], [5, 22000], [6, 19000], [8, 14000], [10, 10500], [12, 8000], [14, 6200], [16, 5000]]],
    [30, [[4, 18000], [6, 14500], [8, 11000], [10, 8500], [12, 6500], [14, 5200], [16, 4200], [18, 3400]]],
    [40, [[6, 9500], [8, 8000], [10, 6500], [12, 5200], [14, 4300], [16, null], [18, 2800], [20, 2300]]],
  ];
  return {
    id: "FICTIF-ABAQUE-001",
    axisX: "radius_m",
    axisY: "boom_length_m",
    points: lignes.flatMap(([y, noeuds]) => noeuds.map(([x, c]) => ({ x, y, capacityKg: c }))),
    interpolationAllowed: false,
    status: statut,
    standard: "EN 13000 (FICTIF)",
    source: {
      title: "FICTIF — Tableau de charges grue mobile exemple",
      reference: "DOC-FICTIF-0001",
      edition: "01/2026",
      url: "https://exemple.invalid/abaque-fictif.pdf",
    },
    deductionsIncluded: false,
  };
}

export function etudeFictive(statut: LoadChart["status"] = "a_verifier"): StudyData {
  const d = createInitialData();
  d.operation = {
    projet: "FICTIF — Lot 3 Charpente métallique, Tour Exemple",
    lieu: "12 rue de l'Exemple, 69000 Lyon (fictif)",
    date: "2026-10-14",
    description: "FICTIF — Pose d'une poutre treillis de 4,2 t depuis l'aire de stockage vers la façade nord, après rotation de 70°.",
    intervenants: "FICTIF — Chef de chantier : M. Dupont ; coordinateur SPS : Mme Martin ; entreprise de levage : Levage Exemple SARL.",
    redacteur: "A. Rédacteur (fictif)",
  };
  d.charge = { designation: "Poutre treillis PT-12 (FICTIF)", masseKg: 4200, longueurM: 6, largeurM: 0.8, hauteurM: 1.2, centreGravite: "Au milieu de la poutre (fictif)", surfaceVentM2: 7.5 };
  d.accessoires = {
    liste: [
      { id: "a1", type: "elingue", label: "Élingue câble 2 brins Ø16", masseKg: 35, cmuDirectKg: 5000, facteurMode: 1.4, sollicitation: "brin" },
      { id: "a2", type: "manille", label: "Manille lyre 6,5 t", masseKg: 2, cmuDirectKg: 6500, facteurMode: 1, sollicitation: "ensemble" },
      { id: "a3", type: "palonnier", label: "Palonnier 6 m", masseKg: 180, cmuDirectKg: 3000, facteurMode: 1, sollicitation: "ensemble" },
    ],
    nbBrins: 2,
    angleBetaDeg: 30,
    equilibrageDeclare: false,
  };
  d.machine = {
    selection: {
      typeId: "grue-mobile",
      typeLabel: "Grue mobile (FICTIF)",
      manufacturerId: "fictif",
      manufacturerName: "Constructeur Fictif",
      machineId: "m1",
      model: "GMK-F 4100",
      configurationId: "c1",
      configurationLabel: "Stabilisateurs 100 %, contrepoids 12 t, 360° (fictif)",
      chart: abaqueFictif(statut),
      calage: { longueurM: 7.2, largeurM: 7.8 },
    },
    moufleCrochetKg: 320,
    flechetteReplieeKg: null,
    autresKg: null,
  };
  d.geometrie = {
    positions: [
      { id: "prise", nom: "Prise", porteeM: 8, yM: 30, angleDeg: 20 },
      { id: "rotation", nom: "Rotation", porteeM: 11, yM: 30, angleDeg: 55 },
      { id: "pose", nom: "Pose", porteeM: 14, yM: 35, angleDeg: 90 },
    ],
    hauteurSousCrochetM: 9,
    obstacles: "Bâtiment voisin R+3 côté est (fictif).",
    obstaclesSaisis: [{ id: "o1", nom: "Immeuble voisin", distanceM: 17, hauteurM: 12 }],
  };
  d.sol = {
    mode: "stabilisateurs",
    effortMaxKN: 180,
    typeSurface: "plaque",
    plaqueLongueurM: 1.2,
    plaqueLargeurM: 1.2,
    patinSurfaceM2: null,
    chenilleLongueurM: null,
    chenilleTuileM: null,
    portanceKPa: 200,
    proximites: "Fouille à 4 m côté ouest ; réseau enterré à repérer avant calage (fictif).",
  };
  d.environnement = {
    uniteVent: "kmh",
    ventPrevu: 40,
    ventLimiteMachine: 72,
    chargeFortePriseAuVent: true,
    ventLimiteCharge: 50,
    lignes: "oui",
    ligneDistancePrevueM: 6,
    ligneDistanceSeuilM: 5,
    ligneTensionKV: 20,
    voiesEtInterferences: "Voie pompiers à maintenir libre ; grue à tour voisine : zone d'interférence à baliser (fictif).",
  };
  d.personnel = {
    conducteur: "J. Conducteur (fictif)",
    caces: "R482 cat. D (fictif)",
    autorisationConduite: true,
    chefManoeuvre: "P. Manœuvre (fictif)",
    elingueur: "L. Élingueur (fictif)",
    vgpEngin: true,
    vgpAccessoires: false,
  };
  d.reserves = { liste: [{ id: "r1", texte: "FICTIF — Vérifier la portance du sol par essai à la plaque avant levage." }] };
  return d;
}

export function resultatFictif(statut: LoadChart["status"] = "a_verifier") {
  const data = etudeFictive(statut);
  return { data, result: computeStudy(data) };
}
