/**
 * Projets d'exemple créés automatiquement pour chaque compte au moment de sa validation par l'administrateur (D30).
 * Données de saisie des études (le résultat est calculé par le moteur : voir modeles.ts).
 * Tous les chantiers, adresses, personnes et entreprises sont FICTIFS.
 * Modifier ce fichier puis lancer `npm run exemples:sql` (voir README, « Projets d'exemple »).
 */
import { createInitialData } from "../../src/lib/study/defaults";
import type { AccessoireSaisie, StudyData } from "../../src/lib/study/types";

/** Configuration du catalogue public : machines.model + machine_configurations.params->>'slug'. */
export interface ConfigCatalogue {
  model: string;
  slug: string;
}

export interface ProjetExemple {
  cle: string;
  nom: string;
  adresse: string;
  client: string;
}

export interface EtudeExemple {
  projet: string;
  reference: string;
  titre: string;
  config: ConfigCatalogue;
  /** Saisie complète SANS sélection machine (injectée depuis le catalogue) ni rédacteur (nom du compte). */
  data: StudyData;
}

export const PROJETS: ProjetExemple[] = [
  { cle: "lyon", nom: "[EXEMPLE] Réhabilitation bureaux Lyon 3e – Les Acacias", adresse: "27 rue des Acacias-Fictifs, 69003 Lyon (adresse fictive)", client: "Foncière Démo Rhône (société fictive)" },
  { cle: "canalisations", nom: "[EXEMPLE] Renouvellement réseau assainissement DN800 – rue des Vignes-Fictives", adresse: "Rue des Vignes-Fictives, 34000 Montpellier (adresse fictive)", client: "Métropole d'Exemple (collectivité fictive)" },
];

const GMK_CW12_5 = { model: "GMK3060L", slug: "fleche-principale-360-cw12-5t" };
const GMK_CW13_5 = { model: "GMK3060L", slug: "fleche-principale-360-cw13-5t" };
const CAT323_COTE = { model: "323", slug: "hd-reach-5-7-r2-9-cw5-4t-600-triple-side" };

let seq = 0;
const id = () => `x${(++seq).toString(36)}${"abcdef"[seq % 6]}1`;

function acc(a: Omit<AccessoireSaisie, "id">): AccessoireSaisie {
  return { id: id(), ...a };
}
const chaine4 = (masseKg = 30) =>
  acc({ type: "elingue", label: "Élingue chaîne 4 brins G80 Ø10 mm (mode 4 brins, 0-45°)", masseKg, cmuDirectKg: 3150, facteurMode: 2.1, sollicitation: "ensemble" });
const palonnier = (label: string, masseKg: number, cmu: number) =>
  acc({ type: "palonnier", label, masseKg, cmuDirectKg: cmu, facteurMode: 1, sollicitation: "ensemble" });
const manilles = (label: string, masseKg: number, cmu: number) =>
  acc({ type: "manille", label, masseKg, cmuDirectKg: cmu, facteurMode: 1, sollicitation: "brin" });

function pos(nom: string, porteeM: number, yM: number, angleDeg: number) {
  return { id: id(), nom, porteeM, yM, angleDeg };
}

interface Spec {
  operation: { lieu: string; date: string; description: string; intervenants: string; projet: string };
  charge: Partial<StudyData["charge"]>;
  accessoires: StudyData["accessoires"];
  moufleCrochetKg: number;
  positions: StudyData["geometrie"]["positions"];
  geom: { hauteurSousCrochetM: number; obstacles: string; obstaclesSaisis: StudyData["geometrie"]["obstaclesSaisis"] };
  sol: Partial<StudyData["sol"]>;
  env: Partial<StudyData["environnement"]>;
  personnel: StudyData["personnel"];
  redacteur: string;
  reserves?: string[];
}

function build(s: Spec): StudyData {
  const d = createInitialData();
  d.operation = { ...s.operation, redacteur: s.redacteur };
  d.charge = { ...d.charge, ...s.charge };
  d.accessoires = s.accessoires;
  d.machine = { selection: null, moufleCrochetKg: s.moufleCrochetKg, flechetteReplieeKg: null, autresKg: null };
  d.geometrie = { positions: s.positions, hauteurSousCrochetM: s.geom.hauteurSousCrochetM, obstacles: s.geom.obstacles, obstaclesSaisis: s.geom.obstaclesSaisis };
  d.sol = { ...d.sol, ...s.sol };
  d.environnement = { ...d.environnement, ...s.env };
  d.personnel = s.personnel;
  d.seuils = { vertPct: 80, orangePct: 100 };
  d.reserves = { liste: (s.reserves ?? []).map((texte) => ({ id: id(), texte })) };
  return d;
}

const perso = (conducteur: string, caces: string, chef: string, eling: string) => ({
  conducteur, caces, autorisationConduite: true, chefManoeuvre: chef, elingueur: eling, vgpEngin: true, vgpAccessoires: true,
});

export const ETUDES: EtudeExemple[] = [];

// ---------------------------------------------------------------- Lyon : CTA (ADEQUAT)
ETUDES.push({
  projet: "lyon", reference: "ADQ-001", titre: "Levage d'une CTA en toiture-terrasse", config: GMK_CW13_5,
  data: build({
    operation: {
      projet: PROJETS[0].nom, lieu: PROJETS[0].adresse, date: "2026-07-22",
      description: "Levage d'une centrale de traitement d'air double flux (2 modules de 3,4 t) depuis la rue vers la toiture-terrasse R+6, avec grue mobile 60 t installée sur la chaussée neutralisée.",
      intervenants: "Entreprise de CVC Démo Thermique (fictive) ; entreprise de levage Démo Levage SAS (fictive) ; coordonnateur SPS : Cabinet Exemple Sécurité (fictif).",
    },
    charge: { designation: "CTA double flux – module n° 1 (carter + ventilateurs)", masseKg: 3400, longueurM: 3.2, largeurM: 1.4, hauteurM: 1.6, centreGravite: "Centré, repères peints sur le châssis ; vérifié à la pesée constructeur", surfaceVentM2: 5.1 },
    accessoires: {
      liste: [
        palonnier("Palonnier tubulaire 4 points 6 t", 180, 6000),
        chaine4(30),
        manilles("Manilles lyre droites 2 t (x4)", 6, 2000),
      ],
      nbBrins: 4, angleBetaDeg: 30, equilibrageDeclare: true,
    },
    moufleCrochetKg: 520,
    positions: [pos("Prise (rue)", 6, 28.8, 200), pos("Rotation", 11, 28.8, 250), pos("Pose (toiture)", 16, 28.8, 300)],
    geom: { hauteurSousCrochetM: 29, obstacles: "Acrotère de la toiture-terrasse ; façade voisine à 6 m.", obstaclesSaisis: [{ id: id(), nom: "Acrotère toiture-terrasse R+6", distanceM: 15, hauteurM: 24.5 }] },
    sol: { mode: "stabilisateurs", effortMaxKN: 340, typeSurface: "plaque", plaqueLongueurM: 1.5, plaqueLargeurM: 1.5, portanceKPa: 250, proximites: "Parking sous trottoir : dalle justifiée par le BET (fictif) ; plaques de répartition 1,5 x 1,5 m disposées sur la zone vérifiée." },
    env: { uniteVent: "ms", ventPrevu: 8, ventLimiteMachine: 12.5, chargeFortePriseAuVent: false, lignes: "non", voiesEtInterferences: "Rue neutralisée par arrêté municipal fictif n° DEMO-2026-041 ; balisage, homme-trafic, cheminement piétons dévié." },
    personnel: perso("Marc Exemplaire", "CACES R483 catégorie A – valide jusqu'en 03/2029", "Julie Démonstration", "Karim Maquette"),
    redacteur: "",
  }),
});

// ---------------------------------------------------------------- Lyon : groupe froid (RESERVES, zone orange)
ETUDES.push({
  projet: "lyon", reference: "ADQ-002", titre: "Dépose du groupe froid existant (toiture vers camion)", config: GMK_CW12_5,
  data: build({
    operation: {
      projet: PROJETS[0].nom, lieu: PROJETS[0].adresse, date: "2026-07-29",
      description: "Dépose d'un groupe froid de 5,6 t en toiture-terrasse et chargement sur semi-remorque stationnée en rue ; levage à portée élevée, taux d'utilisation proche de la limite.",
      intervenants: "Entreprise de CVC Démo Thermique (fictive) ; Démo Levage SAS (fictive).",
    },
    charge: { designation: "Groupe froid existant (désolidarisé, fluides récupérés)", masseKg: 5600, longueurM: 3.6, largeurM: 1.9, hauteurM: 1.7, centreGravite: "Décentré côté compresseurs (≈ 0,3 m) – pesée sur site avant levage", surfaceVentM2: 6.1 },
    accessoires: {
      liste: [
        palonnier("Palonnier tubulaire 4 points 8 t", 220, 8000),
        acc({ type: "elingue", label: "Élingue chaîne 4 brins G80 Ø13 mm (mode 4 brins, 0-45°)", masseKg: 55, cmuDirectKg: 5300, facteurMode: 2.1, sollicitation: "ensemble" }),
        manilles("Manilles lyre droites 3,25 t (x4)", 10, 3250),
      ],
      nbBrins: 4, angleBetaDeg: 30, equilibrageDeclare: true,
    },
    moufleCrochetKg: 520,
    positions: [pos("Prise (toiture)", 16, 28.8, 300), pos("Rotation", 12, 28.8, 250), pos("Pose (camion)", 10, 28.8, 200)],
    geom: { hauteurSousCrochetM: 29, obstacles: "Acrotère ; branches d'un platane voisin à 11 m de l'axe.", obstaclesSaisis: [{ id: id(), nom: "Acrotère toiture-terrasse R+6", distanceM: 15, hauteurM: 24.5 }] },
    sol: { mode: "stabilisateurs", effortMaxKN: 350, typeSurface: "plaque", plaqueLongueurM: 1.5, plaqueLargeurM: 1.5, portanceKPa: 250, proximites: "Mêmes appuis que l'étude ADQ-001 (zone de dalle justifiée)." },
    env: { uniteVent: "ms", ventPrevu: 7, ventLimiteMachine: 12.5, chargeFortePriseAuVent: false, lignes: "non", voiesEtInterferences: "Rue neutralisée (arrêté fictif DEMO-2026-041) ; circulation du tramway à plus de 40 m." },
    personnel: perso("Marc Exemplaire", "CACES R483 catégorie A – valide jusqu'en 03/2029", "Julie Démonstration", "Karim Maquette"),
    redacteur: "",
    reserves: ["Taux d'utilisation en zone orange : lever sans à-coups, arrêt immédiat si le vent dépasse 10 m/s.", "Peser le groupe froid avant la dépose ; si la masse dépasse 5,6 t, reprendre l'étude."],
  }),
});

// ---------------------------------------------------------------- Canalisations : tuyaux béton, pelle (ADEQUAT)
ETUDES.push({
  projet: "canalisations", reference: "ADQ-001", titre: "Pose de tuyaux béton DN800 à la pelle en levage", config: CAT323_COTE,
  data: build({
    operation: {
      projet: PROJETS[1].nom, lieu: PROJETS[1].adresse, date: "2026-10-06",
      description: "Pose de tuyaux en béton armé DN800 (2,2 t, longueur utile 2,5 m) en tranchée à la pelle sur chenilles équipée d'une attache de levage ; configuration transversale la plus défavorable retenue.",
      intervenants: "Entreprise de canalisations Démo Réseaux (fictive) ; maître d'ouvrage : Métropole d'Exemple (fictive).",
    },
    charge: { designation: "Tuyau béton armé DN800, longueur 2,5 m, à emboîtement", masseKg: 2200, longueurM: 2.5, largeurM: 1.05, hauteurM: 1.05, centreGravite: "Au milieu du fût", surfaceVentM2: 2.6 },
    accessoires: {
      liste: [
        acc({ type: "elingue", label: "Élingue chaîne 2 brins G80 Ø8 mm (mode 2 brins, 0-45°)", masseKg: 18, cmuDirectKg: 2000, facteurMode: 1.4, sollicitation: "ensemble" }),
        manilles("Manilles lyre droites 2 t (x2)", 3, 2000),
      ],
      nbBrins: 2, angleBetaDeg: 30, equilibrageDeclare: false,
    },
    moufleCrochetKg: 90,
    positions: [pos("Prise (stock)", 4.5, 1.5, 270), pos("Rotation", 6, 1.5, 0), pos("Pose (tranchée)", 6, 1.5, 90)],
    geom: { hauteurSousCrochetM: 1.5, obstacles: "Étais de la tranchée (blindage) ; réseau d'eau potable en parallèle à 1,2 m.", obstaclesSaisis: [{ id: id(), nom: "Blindage de la tranchée", distanceM: 6, hauteurM: 0 }] },
    sol: { mode: "chenilles", effortMaxKN: 260, chenilleLongueurM: 3.65, chenilleTuileM: 0.6, portanceKPa: 100, proximites: "Chaussée existante décaissée, sol en place (limons graveleux) ; bord de tranchée à plus de 1,5 m des chenilles." },
    env: { uniteVent: "kmh", ventPrevu: 40, ventLimiteMachine: 60, chargeFortePriseAuVent: false, lignes: "non", voiesEtInterferences: "Rue barrée à la circulation, déviation locale ; riverains informés, accès pompiers maintenu." },
    personnel: perso("Maëlle Banc-d'Essai", "CACES R482 catégorie B1 + autorisation de conduite en levage", "Ibrahim Témoin", "Clara Gabarit"),
    redacteur: "",
  }),
});
