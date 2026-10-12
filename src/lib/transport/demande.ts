/**
 * Données du projet de demande (Word) à partir de l'état de l'outil Transport. Fonctions pures.
 */
import { LIBELLE_CATEGORIE, type EvaluationVehicule, type PieceTransport } from "@/engine/transport";
import { formatDateFR, formatMasse, formatNombreFR } from "@/lib/utils";

import type { DonneesDemande, ImagePng } from "./demande-docx";
import { demarches } from "./demarches";

export interface Demandeur {
  nom: string;
  fonction: string | null;
  entreprise: string | null;
  adresse: string | null;
  siret: string | null;
  telephone: string | null;
  email: string | null;
}

export interface ProjetTransport {
  id: string;
  nom: string;
  adresse: string | null;
  client: string | null;
}

export interface Trajet {
  depart: string;
  dates: string;
  voyages: string;
}

const m = (v: number) => `${formatNombreFR(v, 2).replace(/,00$/, "")} m`;

export function donneesDemande(args: {
  ev: EvaluationVehicule;
  piece: PieceTransport;
  typePiece: string;
  designation: string | null;
  indivisible: boolean;
  demandeur: Demandeur;
  projet: ProjetTransport | null;
  trajet: Trajet;
  schemas: ImagePng[];
  date?: Date;
}): DonneesDemande {
  const { ev, piece } = args;
  const e = ev.encombrement!;
  const v = ev.vehicule;
  const cat = ev.categorie!;
  const nature: DonneesDemande["nature"] = cat === "standard" ? "aucune" : cat === "te1" && args.indivisible ? "declaration" : "autorisation";
  return {
    date: formatDateFR(args.date ?? new Date()),
    titre: cat === "standard" ? "Note de transport" : "Projet de demande de transport exceptionnel",
    demandeur: args.demandeur,
    projet: args.projet ? { nom: args.projet.nom, adresse: args.projet.adresse, client: args.projet.client } : null,
    piece: {
      type: args.typePiece,
      designation: args.designation,
      longueur: m(piece.longueurM),
      largeur: m(piece.largeurM),
      hauteur: m(piece.hauteurM),
      masse: formatMasse(piece.masseKg),
      indivisible: args.indivisible,
    },
    convoi: {
      vehicule: v.nom,
      plateau: `${m(e.plateauRetenuM)} × ${m(v.plateauLargeurM)}${v.plateauMaxM > v.plateauM ? ` (extensible ${m(v.plateauM)} à ${m(v.plateauMaxM)})` : ""}`,
      plancher: m(v.hauteurPlancherM),
      longueur: m(e.longueurM),
      largeur: m(e.largeurM),
      hauteur: m(e.hauteurM),
      masse: `${formatMasse(e.masseKg)} (tare indicative ${formatMasse(v.tareKg)} + pièce)`,
      porteAFaux: e.porteAFauxM > 0 ? m(e.porteAFauxM) : "aucun",
      categorie: LIBELLE_CATEGORIE[cat],
      criteres: ev.criteres,
      accompagnement: ev.accompagnement!.motifs,
      alertesHauteur: ev.alertesHauteur,
    },
    nature,
    trajet: { depart: args.trajet.depart || null, arrivee: args.projet?.adresse ?? null, dates: args.trajet.dates || null, voyages: args.trajet.voyages || null },
    rubriques: demarches(cat, e, { chargeIndivisible: args.indivisible }),
    schemas: args.schemas,
  };
}

/** Nom du fichier : « Demande transport - <projet ou pièce> - aaaa-mm-jj.docx » (ASCII). */
export function nomFichierDemande(projet: string | null, piece: string, date = new Date()): string {
  // Caractères simples uniquement : certains navigateurs ignorent un nom contenant des accents ou un tiret long.
  const base = (projet || piece)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9 ._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `Demande transport - ${base} - ${iso}.docx`;
}
