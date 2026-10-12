/**
 * Transport routier des pièces avant levage — classement réglementaire et choix d'un véhicule.
 * Module PUR (aucune dépendance UI / BDD). Unités : m, kg.
 *
 * Références (voir docs/TRANSPORT.md) :
 *  - Code de la route R.312-4 à R.312-22 (gabarit et masses du « transport normal »), R.433-1 à R.433-18 (TE) ;
 *  - arrêté du 4 mai 2006 modifié : art. 3 (catégories), art. 13 (accompagnement), art. 16 (signalisation).
 * Les règles d'accompagnement de l'art. 13 ont été modifiées le 29/01/2024 : le moteur applique la lecture la
 * PLUS PRUDENTE des versions consultées (signalée dans les résultats). Outil d'aide : la décision appartient au
 * transporteur et au service instructeur (DDT).
 */
import { gt, isFiniteNumber } from "./util";

/** Limites du transport « normal » (hors convoi exceptionnel). */
export const LIMITES_STANDARD = {
  /** Largeur du véhicule et du chargement (R.312-10, R.312-20). */
  largeurM: 2.55,
  /** Porte-à-faux arrière maximal du chargement au-delà de l'extrémité du véhicule (R.312-21). */
  porteAFauxArriereM: 3,
  /** Masse totale roulante maximale, transport national, ensemble de plus de 4 essieux (R.312-4). */
  masseKg: 44_000,
} as const;

/** Seuils des catégories de TE (arrêté du 4 mai 2006, art. 3). */
export const SEUILS_TE = {
  cat1: { longueurM: 20, largeurM: 3, masseKg: 48_000 },
  cat2: { longueurM: 25, largeurM: 4, masseKg: 72_000 },
} as const;

/** Hauteurs de vigilance (aucune hauteur maximale réglementaire : étude d'itinéraire). */
export const HAUTEURS = {
  /** Gabarit courant des ouvrages : au-delà, étude d'itinéraire indispensable. */
  vigilanceM: 4,
  /** Accès autoroutier des TE (arrêté de 2006, art. 11). */
  autorouteM: 4.5,
  /** Passages à niveau : accord écrit de l'exploitant ferroviaire au-delà. */
  passageNiveauM: 4.8,
} as const;

export type Categorie = "standard" | "te1" | "te2" | "te3";

export interface FamilleVehicule {
  id: string;
  nom: string;
  description: string;
  /** Longueur de plateau utile (m) ; pour un plateau extensible, longueur repliée. */
  plateauM: number;
  /** Longueur de plateau maximale (extensible) ; égale à plateauM sinon. */
  plateauMaxM: number;
  /** Largeur de plateau (m). */
  plateauLargeurM: number;
  /** Hauteur du plancher au-dessus de la chaussée (m). */
  hauteurPlancherM: number;
  /** Charge utile indicative (kg). */
  chargeUtileKg: number;
  /** Masse à vide de l'ensemble (tracteur + remorque, ou porteur) (kg). */
  tareKg: number;
  /** Longueur hors plateau : cabine / tracteur / col de cygne (m). */
  longueurHorsPlateauM: number;
  /** Longueur maximale du gabarit normal pour ce type d'ensemble (R.312-11). */
  longueurStandardM: number;
  /** Transport debout (panneaux en pupitre / inloader) : la hauteur est mesurée depuis le plancher bas. */
  pupitre?: boolean;
  /** Silhouette pour les schémas (sans effet sur le calcul). */
  silhouette?: "porteur" | "semi" | "surbaissee" | "porte-poutres" | "modulaire" | "porte-panneaux";
}

export interface PieceTransport {
  longueurM: number;
  largeurM: number;
  hauteurM: number;
  masseKg: number;
}

export interface Encombrement {
  longueurM: number;
  largeurM: number;
  hauteurM: number;
  masseKg: number;
  /** Porte-à-faux arrière du chargement au-delà du plateau (m). */
  porteAFauxM: number;
  /** Longueur de plateau retenue (m), extension comprise. */
  plateauRetenuM: number;
}

export interface Accompagnement {
  pilote: boolean;
  protectionArriere: boolean;
  guidage: boolean;
  /** Explications (une par règle déclenchée). */
  motifs: string[];
}

export interface EvaluationVehicule {
  vehicule: FamilleVehicule;
  /** Le véhicule peut-il porter la pièce (charge utile, longueur extensible, porte-à-faux) ? */
  possible: boolean;
  raisonsImpossible: string[];
  encombrement: Encombrement | null;
  categorie: Categorie | null;
  /** Critères qui fixent la catégorie (longueur, largeur, masse, porte-à-faux). */
  criteres: string[];
  accompagnement: Accompagnement | null;
  alertesHauteur: string[];
}

const RANG: Record<Categorie, number> = { standard: 0, te1: 1, te2: 2, te3: 3 };

export const LIBELLE_CATEGORIE: Record<Categorie, string> = {
  standard: "Transport normal",
  te1: "Convoi exceptionnel 1re catégorie",
  te2: "Convoi exceptionnel 2e catégorie",
  te3: "Convoi exceptionnel 3e catégorie",
};

/** Nombre au format français pour les messages (virgule décimale). */
const fr = (n: number): string => String(n).replace(".", ",");

/** Valide une pièce : dimensions et masse strictement positives. */
export function erreursPiece(p: Partial<PieceTransport>): string[] {
  const e: string[] = [];
  const champ = (v: unknown, libelle: string) => {
    if (!isFiniteNumber(v) || v <= 0) e.push(`${libelle} : valeur > 0 attendue.`);
  };
  champ(p.longueurM, "Longueur");
  champ(p.largeurM, "Largeur");
  champ(p.hauteurM, "Hauteur");
  champ(p.masseKg, "Masse");
  return e;
}

/** Catégorie réglementaire d'un encombrement (la caractéristique la plus forte l'emporte). */
export function categorieConvoi(enc: Pick<Encombrement, "longueurM" | "largeurM" | "masseKg" | "porteAFauxM">, longueurStandardM: number): {
  categorie: Categorie;
  criteres: string[];
} {
  const criteres: string[] = [];
  const horsGabarit =
    gt(enc.longueurM, longueurStandardM) ||
    gt(enc.largeurM, LIMITES_STANDARD.largeurM) ||
    gt(enc.masseKg, LIMITES_STANDARD.masseKg) ||
    gt(enc.porteAFauxM, LIMITES_STANDARD.porteAFauxArriereM);
  if (!horsGabarit) return { categorie: "standard", criteres: ["Gabarit et masse du transport normal respectés."] };

  if (gt(enc.longueurM, longueurStandardM)) criteres.push(`longueur > ${fr(longueurStandardM)} m (gabarit normal de l'ensemble)`);
  if (gt(enc.largeurM, LIMITES_STANDARD.largeurM)) criteres.push(`largeur > ${fr(LIMITES_STANDARD.largeurM)} m`);
  if (gt(enc.masseKg, LIMITES_STANDARD.masseKg)) criteres.push(`masse > ${fr(LIMITES_STANDARD.masseKg / 1000)} t`);
  if (gt(enc.porteAFauxM, LIMITES_STANDARD.porteAFauxArriereM)) criteres.push(`porte-à-faux arrière > ${LIMITES_STANDARD.porteAFauxArriereM} m`);

  const niveau = (v: number, s1: number, s2: number): Categorie => (gt(v, s2) ? "te3" : gt(v, s1) ? "te2" : "te1");
  const parCritere: [string, Categorie][] = [
    ["longueur", niveau(enc.longueurM, SEUILS_TE.cat1.longueurM, SEUILS_TE.cat2.longueurM)],
    ["largeur", niveau(enc.largeurM, SEUILS_TE.cat1.largeurM, SEUILS_TE.cat2.largeurM)],
    ["masse", niveau(enc.masseKg, SEUILS_TE.cat1.masseKg, SEUILS_TE.cat2.masseKg)],
  ];
  let categorie: Categorie = "te1";
  for (const [, c] of parCritere) if (RANG[c] > RANG[categorie]) categorie = c;
  const fixent = parCritere.filter(([, c]) => c === categorie && categorie !== "te1").map(([k]) => k);
  if (fixent.length) criteres.push(`catégorie fixée par : ${fixent.join(", ")}`);
  return { categorie, criteres };
}

/**
 * Accompagnement (arrêté du 4 mai 2006, art. 13 ; lecture la plus prudente des versions 2006 et 2024) :
 *  - 1re catégorie : aucun ; 2e catégorie : véhicule pilote si largeur > 3 m ;
 *  - 3e catégorie : véhicule pilote + véhicule de protection arrière ;
 *  - guidage (forces de l'ordre / équipe de guidage agréée) si largeur > 4,50 m, longueur > 40 m ou masse > 120 t.
 */
export function accompagnement(categorie: Categorie, enc: Pick<Encombrement, "longueurM" | "largeurM" | "masseKg">): Accompagnement {
  const a: Accompagnement = { pilote: false, protectionArriere: false, guidage: false, motifs: [] };
  if (categorie === "standard" || categorie === "te1") {
    a.motifs.push(categorie === "te1" ? "1re catégorie : pas de véhicule d'accompagnement." : "Aucun accompagnement.");
    return a;
  }
  if (gt(enc.largeurM, 3)) {
    a.pilote = true;
    a.motifs.push("Largeur > 3 m : véhicule pilote à l'avant.");
  }
  if (categorie === "te3") {
    a.pilote = true;
    a.protectionArriere = true;
    a.motifs.push("3e catégorie : véhicule pilote et véhicule de protection arrière.");
  }
  if (gt(enc.largeurM, 4.5) || gt(enc.longueurM, 40) || gt(enc.masseKg, 120_000)) {
    a.guidage = true;
    a.motifs.push("Largeur > 4,50 m, longueur > 40 m ou masse > 120 t : guidage (forces de l'ordre ou équipe de guidage agréée).");
  }
  if (!a.pilote && !a.guidage) a.motifs.push("2e catégorie d'une largeur ≤ 3 m : pas de véhicule d'accompagnement.");
  return a;
}

/** Alertes de hauteur totale (plancher + pièce). */
export function alertesHauteur(hauteurTotaleM: number): string[] {
  const a: string[] = [];
  if (gt(hauteurTotaleM, HAUTEURS.passageNiveauM)) a.push(`Hauteur > ${fr(HAUTEURS.passageNiveauM)} m : accord écrit de l'exploitant ferroviaire pour chaque passage à niveau.`);
  if (gt(hauteurTotaleM, HAUTEURS.autorouteM)) a.push(`Hauteur > ${fr(HAUTEURS.autorouteM)} m : accès autoroutier à vérifier (arrêté de 2006, art. 11).`);
  if (gt(hauteurTotaleM, HAUTEURS.vigilanceM)) a.push(`Hauteur > ${fr(HAUTEURS.vigilanceM)} m : étude d'itinéraire indispensable (ponts, portiques, lignes, feux).`);
  return a;
}

/** Évalue un véhicule pour une pièce : faisabilité, encombrement du convoi, catégorie, accompagnement. */
export function evaluerVehicule(piece: PieceTransport, v: FamilleVehicule): EvaluationVehicule {
  const raisons: string[] = [];
  if (gt(piece.masseKg, v.chargeUtileKg)) raisons.push(`charge utile insuffisante (${fr(v.chargeUtileKg / 1000)} t)`);
  // Le plateau s'allonge jusqu'à la longueur de la pièce ; au-delà, porte-à-faux arrière (3 m max. hors TE).
  const plateau = Math.min(Math.max(piece.longueurM, v.plateauM), v.plateauMaxM);
  const porteAFaux = Math.max(0, piece.longueurM - plateau);
  // Porte-à-faux : jusqu'à 3 m en transport normal, au-delà convoi exceptionnel ; plus de 6 m : véhicule inadapté.
  if (gt(porteAFaux, LIMITES_STANDARD.porteAFauxArriereM * 2)) raisons.push(`pièce trop longue (plateau max. ${fr(v.plateauMaxM)} m)`);
  if (v.pupitre && gt(piece.largeurM, 0.6)) raisons.push("transport en pupitre réservé aux panneaux minces posés sur chant (épaisseur ≤ 0,60 m)");
  const possible = raisons.length === 0;
  const enc: Encombrement = {
    longueurM: v.longueurHorsPlateauM + plateau + porteAFaux,
    largeurM: Math.max(piece.largeurM, v.plateauLargeurM),
    hauteurM: v.hauteurPlancherM + piece.hauteurM,
    masseKg: v.tareKg + piece.masseKg,
    porteAFauxM: porteAFaux,
    plateauRetenuM: plateau,
  };
  const { categorie, criteres } = categorieConvoi(enc, v.longueurStandardM);
  return {
    vehicule: v,
    possible,
    raisonsImpossible: raisons,
    encombrement: enc,
    categorie,
    criteres,
    accompagnement: accompagnement(categorie, enc),
    alertesHauteur: alertesHauteur(enc.hauteurM),
  };
}

/**
 * Contrainte d'un convoi (plus petit = plus simple) : rang de catégorie (0 à 3), + 1 si la hauteur totale dépasse
 * 4 m (étude d'itinéraire), comme un cran de catégorie supplémentaire.
 */
export function contrainte(e: EvaluationVehicule): number {
  if (!e.categorie || !e.encombrement) return 99;
  return RANG[e.categorie] + (gt(e.encombrement.hauteurM, HAUTEURS.vigilanceM) ? 1 : 0);
}

/**
 * Classe tous les véhicules : d'abord les possibles, par contrainte croissante, puis par masse totale ;
 * les impossibles ensuite (avec leurs raisons). `prioritaires` : familles habituelles du type de pièce,
 * placées devant à contrainte égale.
 */
export function classerVehicules(piece: PieceTransport, vehicules: FamilleVehicule[], prioritaires: string[] = []): EvaluationVehicule[] {
  const ev = vehicules.map((v) => evaluerVehicule(piece, v));
  const habituel = (e: EvaluationVehicule) => (prioritaires.includes(e.vehicule.id) ? 0 : 1);
  return ev.sort(
    (a, b) =>
      Number(b.possible) - Number(a.possible) ||
      contrainte(a) - contrainte(b) ||
      habituel(a) - habituel(b) ||
      (a.encombrement?.masseKg ?? 0) - (b.encombrement?.masseKg ?? 0),
  );
}
