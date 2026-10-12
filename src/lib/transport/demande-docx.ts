/**
 * Projet de demande de transport exceptionnel au format Word (.docx), généré côté navigateur.
 * Document PRÉPARATOIRE : il rassemble les éléments du projet, de la pièce et du convoi, à reporter sur le
 * formulaire officiel (Cerfa) ou la téléprocédure du service instructeur (DDT du département de départ).
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import { VINCI } from "@/lib/design-tokens";

const hex = (c: string) => c.replace("#", "").toUpperCase();
const BLEU = hex(VINCI.bleu);
const BLEU_FONCE = hex(VINCI.bleuDark);
const GRIS = hex(VINCI.gris);
const GRIS_CLAIR = hex(VINCI.grisLight);
const BORD = hex(VINCI.tableBorder);
const ROUGE = hex(VINCI.rouge);
const POLICE = "Arial";
const A_COMPLETER = "à compléter";

export interface ImagePng {
  png: Uint8Array;
  largeur: number;
  hauteur: number;
}

export interface DonneesDemande {
  /** Date du document (jj/mm/aaaa). */
  date: string;
  titre: string;
  demandeur: { nom: string; fonction?: string | null; entreprise?: string | null; adresse?: string | null; siret?: string | null; telephone?: string | null; email?: string | null };
  projet: { nom: string; adresse?: string | null; client?: string | null } | null;
  piece: { type: string; designation?: string | null; longueur: string; largeur: string; hauteur: string; masse: string; indivisible: boolean };
  convoi: {
    vehicule: string;
    plateau: string;
    plancher: string;
    longueur: string;
    largeur: string;
    hauteur: string;
    masse: string;
    porteAFaux: string;
    categorie: string;
    criteres: string[];
    accompagnement: string[];
    alertesHauteur: string[];
  };
  /** Nature pré-cochée : déclaration 1re catégorie ou autorisation au voyage. */
  nature: "declaration" | "autorisation" | "aucune";
  trajet: { depart?: string | null; arrivee?: string | null; dates?: string | null; voyages?: string | null };
  rubriques: { titre: string; lignes: string[] }[];
  schemas: ImagePng[];
}

const t = (texte: string, o: { gras?: boolean; couleur?: string; taille?: number; italique?: boolean } = {}) =>
  new TextRun({ text: texte, bold: o.gras, color: o.couleur, size: o.taille ?? 20, italics: o.italique, font: POLICE });

const valeur = (v: string | null | undefined) => (v && v.trim() ? t(v.trim()) : t(A_COMPLETER, { italique: true, couleur: GRIS }));

function titre(n: string, texte: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLEU, space: 2 } },
    children: [t(`${n}. `, { gras: true, couleur: ROUGE, taille: 24 }), t(texte, { gras: true, couleur: BLEU, taille: 24 })],
  });
}

const cellule = (enfants: TextRun[], o: { fond?: string; largeur: number; entete?: boolean }) =>
  new TableCell({
    width: { size: o.largeur, type: WidthType.PERCENTAGE },
    shading: o.fond ? { type: ShadingType.CLEAR, color: "auto", fill: o.fond } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: enfants })],
  });

const bordures = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BORD },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORD },
  left: { style: BorderStyle.SINGLE, size: 4, color: BORD },
  right: { style: BorderStyle.SINGLE, size: 4, color: BORD },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BORD },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: BORD },
};

/** Tableau libellé / valeur, lignes alternées blanc / gris clair (charte). */
function tableau(lignes: [string, string | null | undefined][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: bordures,
    rows: lignes.map(
      ([l, v], i) =>
        new TableRow({
          children: [
            cellule([t(l, { gras: true, couleur: BLEU_FONCE })], { largeur: 38, fond: i % 2 ? GRIS_CLAIR : undefined }),
            cellule([valeur(v)], { largeur: 62, fond: i % 2 ? GRIS_CLAIR : undefined }),
          ],
        }),
    ),
  });
}

const puce = (texte: string) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [t(texte)] });
const caseACocher = (coche: boolean, texte: string) => new Paragraph({ spacing: { after: 60 }, children: [t(coche ? "☒ " : "☐ ", { taille: 24 }), t(texte)] });
const paragraphe = (enfants: TextRun[], apres = 120) => new Paragraph({ spacing: { after: apres }, children: enfants });

/** Pièces à joindre usuelles, complétées selon la hauteur. */
export function piecesAJoindre(d: Pick<DonneesDemande, "convoi" | "piece">): string[] {
  const l = [
    "Certificats d'immatriculation et fiches techniques du tracteur et de la remorque (charges par essieu, empattements).",
    "Plan de chargement coté (vue de côté et vue de dessus, position du centre de gravité, arrimage).",
    "Attestation d'assurance du transporteur couvrant le transport exceptionnel.",
    "Itinéraire détaillé (routes, communes traversées), points de départ et d'arrivée.",
  ];
  if (d.piece.indivisible) l.push("Justification du caractère indivisible de la charge.");
  if (d.convoi.alertesHauteur.length) l.push("Étude de gabarit de l'itinéraire (ouvrages, portiques, lignes) et, le cas échéant, accord des exploitants (passages à niveau).");
  return l;
}

export function construireDocument(d: DonneesDemande): Document {
  const enfants: (Paragraph | Table)[] = [
    new Paragraph({
      shading: { type: ShadingType.CLEAR, color: "auto", fill: BLEU },
      spacing: { after: 0 },
      children: [t(` ${d.titre}`, { gras: true, couleur: "FFFFFF", taille: 32 })],
    }),
    new Paragraph({
      shading: { type: ShadingType.CLEAR, color: "auto", fill: BLEU },
      spacing: { after: 160 },
      children: [t(` Document préparatoire établi le ${d.date}`, { couleur: "FFFFFF", taille: 20 })],
    }),
    paragraphe(
      [
        t("Ce document rassemble les éléments du transport. Il est à reporter sur le formulaire officiel (Cerfa) ou la téléprocédure du ", { taille: 18 }),
        t("service instructeur (DDT) du département de départ", { taille: 18, gras: true }),
        t(", et à faire confirmer par le transporteur. Valeurs du véhicule indicatives.", { taille: 18 }),
      ],
      200,
    ),
    titre("1", "Demandeur"),
    tableau([
      ["Nom", d.demandeur.nom],
      ["Fonction", d.demandeur.fonction],
      ["Entreprise", d.demandeur.entreprise],
      ["Adresse", d.demandeur.adresse],
      ["SIRET", d.demandeur.siret],
      ["Téléphone", d.demandeur.telephone],
      ["E-mail", d.demandeur.email],
      ["Transporteur", null],
    ]),
    titre("2", "Chantier et projet"),
    tableau([
      ["Projet / chantier", d.projet?.nom],
      ["Adresse du chantier (destination)", d.projet?.adresse],
      ["Maître d'ouvrage / client", d.projet?.client],
    ]),
    titre("3", "Nature de la demande"),
    caseACocher(d.nature === "declaration", "Déclaration préalable de transport exceptionnel de 1re catégorie (réseau 1TE, charge indivisible)"),
    caseACocher(d.nature === "autorisation", "Autorisation de transport exceptionnel au voyage"),
    caseACocher(false, "Autorisation permanente (transports répétés)"),
    caseACocher(false, "Autorisation de portée locale (APL)"),
    ...(d.nature === "aucune"
      ? [paragraphe([t("Transport dans le gabarit et la masse du transport normal : aucune demande n'est nécessaire.", { italique: true, couleur: BLEU_FONCE })])]
      : []),
    titre("4", "Objet transporté"),
    tableau([
      ["Type de pièce", d.piece.type],
      ["Désignation", d.piece.designation],
      ["Longueur", d.piece.longueur],
      ["Largeur", d.piece.largeur],
      ["Hauteur", d.piece.hauteur],
      ["Masse", d.piece.masse],
      ["Charge indivisible", d.piece.indivisible ? "Oui" : "Non"],
    ]),
    titre("5", "Convoi envisagé"),
    tableau([
      ["Véhicule", d.convoi.vehicule],
      ["Plateau", d.convoi.plateau],
      ["Hauteur du plancher", d.convoi.plancher],
      ["Longueur hors tout", d.convoi.longueur],
      ["Largeur hors tout", d.convoi.largeur],
      ["Hauteur en charge", d.convoi.hauteur],
      ["Masse totale roulante (estimée)", d.convoi.masse],
      ["Porte-à-faux arrière", d.convoi.porteAFaux],
      ["Nombre d'essieux / charge par essieu", null],
      ["Catégorie", d.convoi.categorie],
    ]),
    ...d.convoi.criteres.map(puce),
    titre("6", "Itinéraire et dates"),
    tableau([
      ["Point de départ", d.trajet.depart],
      ["Point d'arrivée", d.trajet.arrivee ?? d.projet?.adresse],
      ["Dates / période souhaitées", d.trajet.dates],
      ["Nombre de voyages", d.trajet.voyages],
      ["Itinéraire (routes, communes)", null],
    ]),
    titre("7", "Accompagnement, signalisation et circulation"),
    ...d.convoi.accompagnement.map(puce),
    ...d.rubriques.filter((r) => r.titre !== "Autorisation").flatMap((r) => [paragraphe([t(r.titre, { gras: true, couleur: BLEU_FONCE })], 40), ...r.lignes.map(puce)]),
    ...d.convoi.alertesHauteur.map((a) => paragraphe([t(`⚠ ${a}`, { couleur: ROUGE })], 60)),
  ];

  if (d.schemas.length) {
    enfants.push(titre("8", "Plan de chargement (schémas indicatifs)"));
    for (const s of d.schemas) {
      const largeur = 620;
      enfants.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: s.png, transformation: { width: largeur, height: Math.round((largeur * s.hauteur) / s.largeur) } })],
        }),
      );
    }
  }

  enfants.push(
    titre(d.schemas.length ? "9" : "8", "Pièces à joindre"),
    ...piecesAJoindre(d).map((p) => caseACocher(false, p)),
    titre(d.schemas.length ? "10" : "9", "Engagement du demandeur"),
    paragraphe([t("Fait à ………………………………, le ………………………")]),
    paragraphe([t("Nom et signature du demandeur :")], 600),
  );

  return new Document({
    creator: "Adéquation de levage",
    title: d.titre,
    styles: { default: { document: { run: { font: POLICE, size: 20 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  t("Préparé avec l'outil Adéquation de levage — aide à la rédaction ; à vérifier par le transporteur et le service instructeur. Arrêté du 4 mai 2006 modifié ; Code de la route R.433-1 s. — page ", { taille: 14, couleur: GRIS }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 14, color: GRIS, font: POLICE }),
                ],
              }),
            ],
          }),
        },
        children: enfants,
      },
    ],
  });
}

/** Fichier .docx (Blob côté navigateur). */
export async function genererDemandeDocx(d: DonneesDemande): Promise<Blob> {
  return Packer.toBlob(construireDocument(d));
}
