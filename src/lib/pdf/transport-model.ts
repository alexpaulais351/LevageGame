/**
 * Modèle de la synthèse PDF du transport d'une pièce (outil /transport). Fonction pure : aucune dépendance
 * React ni réseau ; toutes les valeurs sont déjà formatées pour l'affichage (police WinAnsi : `pdfTexte`).
 */
import { HAUTEURS, LIMITES_STANDARD, LIBELLE_CATEGORIE, SEUILS_TE, type Categorie, type EvaluationVehicule, type PieceTransport } from "@/engine/transport";
import { VERDICT } from "@/lib/design-tokens";
import { demarches } from "@/lib/transport/demarches";
import type { Demandeur, ProjetTransport } from "@/lib/transport/demande";
import { formatDateFR, formatMasse, formatNombreFR } from "@/lib/utils";

import { dateIso, slugFichier } from "./filename";
import { pdfTexte } from "./model";

export const MENTION_TRANSPORT =
  "Outil d'aide à la préparation. Le convoi, l'itinéraire et les autorisations sont à confirmer par le transporteur et le service instructeur (DDT). Caractéristiques des véhicules indicatives.";
export const CADRE_TRANSPORT = "Code de la route R.312-4 s., R.433-1 s. · Arrêté du 4 mai 2006 modifié (transports exceptionnels)";

export interface Reponse {
  question: string;
  reponse: string;
  /** true = contrainte (affichée en couleur d'alerte). */
  contrainte: boolean;
}

export interface LigneSeuil {
  critere: string;
  valeur: string;
  normal: string;
  cat1: string;
  cat2: string;
  depasse: boolean;
}

export interface TransportPdfModel {
  entete: { titre: string; projet: string; date: string; redacteur: string; entreprise: string };
  decision: { titre: string; sousTitre: string; couleur: string; fond: string; particulier: boolean };
  reponses: Reponse[];
  piece: [string, string][];
  convoi: [string, string][];
  criteres: string[];
  seuils: LigneSeuil[];
  accompagnement: string[];
  alertesHauteur: string[];
  rubriques: { titre: string; lignes: string[] }[];
  alternatives: string[][];
  conseils: string[];
  schemas: { dataUri: string; ratio: number }[];
  mention: string;
  cadre: string;
}

const m = (v: number) => pdfTexte(`${formatNombreFR(v, 2).replace(/,00$/, "")} m`);
const t = (kg: number) => pdfTexte(formatMasse(kg));

const STYLE: Record<Categorie, { couleur: string; fond: string }> = {
  standard: { couleur: VERDICT.vert, fond: VERDICT.vertBg },
  te1: { couleur: VERDICT.jaune, fond: VERDICT.jauneBg },
  te2: { couleur: VERDICT.rouge, fond: VERDICT.rougeBg },
  te3: { couleur: VERDICT.rouge, fond: VERDICT.rougeBg },
};

export function buildTransportPdfModel(args: {
  ev: EvaluationVehicule;
  classement: EvaluationVehicule[];
  piece: PieceTransport;
  typePiece: string;
  designation: string | null;
  indivisible: boolean;
  conseils: string[];
  demandeur: Demandeur;
  projet: ProjetTransport | null;
  schemas: { dataUri: string; ratio: number }[];
  date?: Date;
}): TransportPdfModel {
  const { ev, piece } = args;
  const e = ev.encombrement!;
  const v = ev.vehicule;
  const cat = ev.categorie!;
  const a = ev.accompagnement!;
  const particulier = cat !== "standard";
  const hauteurHaute = e.hauteurM > HAUTEURS.vigilanceM;
  const demarche = cat === "standard" ? "Aucune" : cat === "te1" && args.indivisible ? "Déclaration (réseau 1TE) ou autorisation" : "Autorisation préfectorale";

  const reponses: Reponse[] = [
    { question: "Transport particulier (convoi exceptionnel) ?", reponse: particulier ? `Oui — ${LIBELLE_CATEGORIE[cat].replace("Convoi exceptionnel ", "")}` : "Non — transport normal", contrainte: particulier },
    {
      question: "Voiture pilote / accompagnement ?",
      reponse: a.guidage ? "Oui — pilote, protection arrière et guidage" : a.pilote && a.protectionArriere ? "Oui — pilote et protection arrière" : a.pilote ? "Oui — véhicule pilote" : "Non",
      contrainte: a.pilote || a.protectionArriere || a.guidage,
    },
    { question: "Démarche administrative ?", reponse: demarche, contrainte: particulier },
    { question: "Signalisation « convoi exceptionnel » ?", reponse: particulier ? "Oui — panneaux, feux tournants, feux d'encombrement" : "Non (signaler un éventuel porte-à-faux)", contrainte: particulier },
    { question: "Étude d'itinéraire (hauteur, ouvrages) ?", reponse: hauteurHaute ? `Oui — hauteur ${m(e.hauteurM)} > 4 m` : cat === "te2" || cat === "te3" ? "Oui — itinéraire à valider avec la DDT" : "Non requise par le gabarit", contrainte: hauteurHaute || cat === "te2" || cat === "te3" },
  ];

  const seuil = (critere: string, valeur: number, normal: number, c1: number, c2: number, fmt: (x: number) => string): LigneSeuil => ({
    critere,
    valeur: fmt(valeur),
    normal: pdfTexte(`≤ ${fmt(normal)}`),
    cat1: pdfTexte(`≤ ${fmt(c1)}`),
    cat2: pdfTexte(`≤ ${fmt(c2)}`),
    depasse: valeur > normal + 1e-9,
  });

  return {
    entete: {
      titre: "SYNTHÈSE TRANSPORT",
      projet: pdfTexte(args.projet?.nom ?? "—"),
      date: formatDateFR(args.date ?? new Date()),
      redacteur: pdfTexte(args.demandeur.nom || "—"),
      entreprise: pdfTexte(args.demandeur.entreprise ?? ""),
    },
    decision: {
      titre: particulier ? `TRANSPORT PARTICULIER NÉCESSAIRE — ${LIBELLE_CATEGORIE[cat].toUpperCase()}` : "TRANSPORT NORMAL — AUCUN TRANSPORT PARTICULIER",
      sousTitre: pdfTexte(`${args.designation ? `${args.designation} (${args.typePiece})` : args.typePiece} · ${v.nom} · convoi ${m(e.longueurM)} x ${m(e.largeurM)} x ${m(e.hauteurM)}, ${t(e.masseKg)}`),
      ...STYLE[cat],
      particulier,
    },
    reponses: reponses.map((r) => ({ ...r, question: pdfTexte(r.question), reponse: pdfTexte(r.reponse) })),
    piece: [
      ["Type", pdfTexte(args.typePiece)],
      ["Désignation", pdfTexte(args.designation || "—")],
      ["Longueur", m(piece.longueurM)],
      ["Largeur", m(piece.largeurM)],
      ["Hauteur", m(piece.hauteurM)],
      ["Masse", t(piece.masseKg)],
      ["Charge indivisible", args.indivisible ? "Oui" : "Non"],
      ["Chantier de destination", pdfTexte(args.projet ? [args.projet.nom, args.projet.adresse].filter(Boolean).join(" — ") : "—")],
    ],
    convoi: [
      ["Véhicule retenu", pdfTexte(v.nom)],
      ["Plateau", pdfTexte(`${m(e.plateauRetenuM)} x ${m(v.plateauLargeurM)}${v.plateauMaxM > v.plateauM ? ` (extensible ${m(v.plateauM)} à ${m(v.plateauMaxM)})` : ""}`)],
      ["Hauteur du plancher", m(v.hauteurPlancherM)],
      ["Longueur hors tout", m(e.longueurM)],
      ["Largeur hors tout", m(e.largeurM)],
      ["Hauteur en charge", m(e.hauteurM)],
      ["Masse totale (estimée)", pdfTexte(`${t(e.masseKg)} (tare indicative ${t(v.tareKg)})`)],
      ["Porte-à-faux arrière", e.porteAFauxM > 0 ? m(e.porteAFauxM) : "Aucun"],
    ],
    criteres: ev.criteres.map(pdfTexte),
    seuils: [
      seuil("Longueur", e.longueurM, v.longueurStandardM, SEUILS_TE.cat1.longueurM, SEUILS_TE.cat2.longueurM, m),
      seuil("Largeur", e.largeurM, LIMITES_STANDARD.largeurM, SEUILS_TE.cat1.largeurM, SEUILS_TE.cat2.largeurM, m),
      seuil("Masse totale", e.masseKg, LIMITES_STANDARD.masseKg, SEUILS_TE.cat1.masseKg, SEUILS_TE.cat2.masseKg, t),
      { critere: "Porte-à-faux arrière", valeur: m(e.porteAFauxM), normal: pdfTexte(`≤ ${m(LIMITES_STANDARD.porteAFauxArriereM)}`), cat1: "—", cat2: "—", depasse: e.porteAFauxM > LIMITES_STANDARD.porteAFauxArriereM + 1e-9 },
      { critere: "Hauteur (vigilance)", valeur: m(e.hauteurM), normal: pdfTexte("≤ 4 m (ouvrages)"), cat1: "—", cat2: "—", depasse: hauteurHaute },
    ],
    accompagnement: a.motifs.map(pdfTexte),
    alertesHauteur: ev.alertesHauteur.map(pdfTexte),
    rubriques: demarches(cat, e, { chargeIndivisible: args.indivisible }).map((r) => ({ titre: pdfTexte(r.titre), lignes: r.lignes.map(pdfTexte) })),
    alternatives: args.classement
      .filter((x) => x.possible && x.vehicule.id !== v.id)
      .slice(0, 4)
      .map((x) => [pdfTexte(x.vehicule.nom), pdfTexte(LIBELLE_CATEGORIE[x.categorie!]), m(x.encombrement!.longueurM), m(x.encombrement!.hauteurM), t(x.encombrement!.masseKg)]),
    conseils: args.conseils.map(pdfTexte),
    schemas: args.schemas,
    mention: MENTION_TRANSPORT,
    cadre: CADRE_TRANSPORT,
  };
}

/** Nom de fichier : transport_<projet|pièce>_<AAAA-MM-JJ>.pdf (ASCII). */
export function nomFichierSyntheseTransport(args: { projet?: string | null; piece: string; date: Date }): string {
  const base = slugFichier(args.projet ?? "") || slugFichier(args.piece) || "piece";
  return `transport_${base}_${dateIso(args.date)}.pdf`;
}
