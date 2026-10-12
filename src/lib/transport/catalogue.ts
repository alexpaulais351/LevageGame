/**
 * Familles de véhicules et types de pièces BTP pour l'outil Transport.
 * Valeurs INDICATIVES (ordres de grandeur du marché) : chaque transporteur confirme sur la fiche de son matériel
 * (plateau, plancher, charge utile, tare). Sources citées quand elles existent (docs/TRANSPORT.md).
 */
import type { FamilleVehicule } from "@/engine/transport";

export const VEHICULES: FamilleVehicule[] = [
  {
    id: "porteur-grue",
    nom: "Porteur plateau 6x4 avec grue auxiliaire",
    description: "Petites pièces et livraisons chantier ; se décharge seul avec sa grue.",
    plateauM: 7.2,
    plateauMaxM: 7.2,
    plateauLargeurM: 2.48,
    hauteurPlancherM: 1.3,
    chargeUtileKg: 12_000,
    tareKg: 14_000,
    longueurHorsPlateauM: 2.8,
    longueurStandardM: 12,
  },
  {
    id: "porteur-8x4",
    nom: "Porteur plateau 8x4",
    description: "Pièces compactes et lourdes, accès chantier étroits.",
    plateauM: 8.5,
    plateauMaxM: 8.5,
    plateauLargeurM: 2.48,
    hauteurPlancherM: 1.35,
    chargeUtileKg: 16_000,
    tareKg: 16_000,
    longueurHorsPlateauM: 2.8,
    longueurStandardM: 12,
  },
  {
    id: "semi-plateau",
    nom: "Semi-remorque plateau standard",
    description: "Le cas courant : prédalles, poutres jusqu'à ~14 m, modules.",
    plateauM: 13.6,
    plateauMaxM: 13.6,
    plateauLargeurM: 2.48,
    hauteurPlancherM: 1.35,
    chargeUtileKg: 27_000,
    tareKg: 14_000,
    longueurHorsPlateauM: 2.9,
    longueurStandardM: 16.5,
  },
  {
    id: "semi-extensible",
    nom: "Semi-remorque plateau extensible",
    description: "Pièces longues (poutres, charpente, éléments de grue) : le plateau s'allonge.",
    plateauM: 13.6,
    plateauMaxM: 20.5,
    plateauLargeurM: 2.48,
    hauteurPlancherM: 1.4,
    chargeUtileKg: 25_000,
    tareKg: 16_000,
    longueurHorsPlateauM: 2.9,
    longueurStandardM: 16.5,
  },
  {
    id: "surbaissee",
    nom: "Semi-surbaissée télescopique (porte-engins)",
    description: "Pièces hautes ou lourdes, engins : plancher bas pour gagner en hauteur (ex. Faymonville MAX : 9,3 à 22,6 m, plancher ≈ 0,9 m).",
    plateauM: 9.3,
    plateauMaxM: 22.6,
    plateauLargeurM: 2.54,
    hauteurPlancherM: 0.9,
    chargeUtileKg: 45_000,
    tareKg: 27_000,
    longueurHorsPlateauM: 7,
    longueurStandardM: 16.5,
  },
  {
    id: "porte-panneaux",
    nom: "Semi porte-panneaux (inloader)",
    description: "Voiles et panneaux béton transportés debout, calés entre les longerons : plancher très bas.",
    plateauM: 9,
    plateauMaxM: 9,
    plateauLargeurM: 2.55,
    hauteurPlancherM: 0.3,
    chargeUtileKg: 25_000,
    tareKg: 16_000,
    longueurHorsPlateauM: 7.5,
    longueurStandardM: 16.5,
    pupitre: true,
  },
  {
    id: "porte-poutres",
    nom: "Ensemble porte-poutres (tracteur + dolly autodirectionnel)",
    description: "Poutres béton précontraintes et grandes charpentes : la pièce fait la liaison entre la sellette et le dolly arrière.",
    plateauM: 12,
    plateauMaxM: 45,
    plateauLargeurM: 2.55,
    hauteurPlancherM: 1.6,
    chargeUtileKg: 45_000,
    tareKg: 20_000,
    longueurHorsPlateauM: 3,
    longueurStandardM: 16.5,
  },
  {
    id: "modulaire",
    nom: "Convoi modulaire (remorques à lignes d'essieux)",
    description: "Pièces très lourdes ou très larges (cuves, transformateurs) : modules assemblables, 3 m de large (ex. Goldhofer THP, plancher ≈ 1,2 m).",
    plateauM: 9,
    plateauMaxM: 15,
    plateauLargeurM: 3,
    hauteurPlancherM: 1.2,
    chargeUtileKg: 120_000,
    tareKg: 45_000,
    longueurHorsPlateauM: 9,
    longueurStandardM: 16.5,
  },
];

export interface TypePiece {
  id: string;
  nom: string;
  /** Exemple de dimensions pour pré-remplir (m, kg). */
  exemple: { longueurM: number; largeurM: number; hauteurM: number; masseKg: number };
  /** Familles de véhicules habituelles (mises en avant). */
  vehicules: string[];
  conseils: string[];
}

export const TYPES_PIECES: TypePiece[] = [
  {
    id: "poutre-beton",
    nom: "Poutre béton précontrainte",
    exemple: { longueurM: 24, largeurM: 0.6, hauteurM: 1.2, masseKg: 30_000 },
    vehicules: ["porte-poutres", "semi-extensible"],
    conseils: [
      "Transport à plat sur ses appuis définitifs (positions données par le préfabricateur) : ne jamais l'appuyer au milieu.",
      "Vérifier le déversement des poutres élancées et le calage latéral.",
    ],
  },
  {
    id: "poutre-metal",
    nom: "Poutre / charpente métallique",
    exemple: { longueurM: 18, largeurM: 0.5, hauteurM: 1, masseKg: 6_000 },
    vehicules: ["semi-extensible", "semi-plateau"],
    conseils: ["Protéger les arêtes et la peinture aux points d'arrimage.", "Signaler le porte-à-faux arrière."],
  },
  {
    id: "predalle",
    nom: "Prédalles / dalles alvéolées (paquet)",
    exemple: { longueurM: 8, largeurM: 2.4, hauteurM: 1.2, masseKg: 18_000 },
    vehicules: ["semi-plateau"],
    conseils: ["Respecter le plan de chargement du préfabricateur (cales alignées).", "Charge à répartir sur le plateau : attention à la charge par essieu."],
  },
  {
    id: "voile",
    nom: "Voile / panneau béton préfabriqué (debout)",
    exemple: { longueurM: 7, largeurM: 0.2, hauteurM: 3.4, masseKg: 12_000 },
    vehicules: ["porte-panneaux", "surbaissee"],
    conseils: [
      "Saisir la largeur = épaisseur du panneau et la hauteur = hauteur du panneau debout.",
      "Transport vertical en pupitre ou inloader ; vérifier la stabilité au déchargement.",
    ],
  },
  {
    id: "module",
    nom: "Module préfabriqué (cellule sanitaire, bungalow)",
    exemple: { longueurM: 6, largeurM: 2.5, hauteurM: 2.8, masseKg: 8_000 },
    vehicules: ["semi-plateau", "surbaissee"],
    conseils: ["Hauteur totale souvent > 4 m sur plateau standard : préférer un plancher bas."],
  },
  {
    id: "grue",
    nom: "Élément de grue / mât / flèche",
    exemple: { longueurM: 12, largeurM: 1.8, hauteurM: 1.8, masseKg: 9_000 },
    vehicules: ["semi-extensible", "semi-plateau"],
    conseils: ["Repérer les points d'arrimage prévus par le constructeur."],
  },
  {
    id: "engin",
    nom: "Engin de chantier (pelle, nacelle, chariot)",
    exemple: { longueurM: 9.5, largeurM: 2.98, hauteurM: 3.1, masseKg: 24_000 },
    vehicules: ["surbaissee"],
    conseils: [
      "Un engin n'est pas une « charge indivisible » au sens de la déclaration 1re catégorie : autorisation (ou APL engins) nécessaire.",
      "Descendre la flèche / le bras au plus bas, verrouiller la tourelle.",
    ],
  },
  {
    id: "cuve",
    nom: "Cuve / réservoir / transformateur",
    exemple: { longueurM: 8, largeurM: 3.2, hauteurM: 3.5, masseKg: 35_000 },
    vehicules: ["surbaissee", "modulaire"],
    conseils: ["Centre de gravité à connaître (pièce creuse ou remplie d'huile).", "Hauteur et largeur imposent souvent une étude d'itinéraire."],
  },
  {
    id: "buse",
    nom: "Buses / cadres / regards béton",
    exemple: { longueurM: 6, largeurM: 2.4, hauteurM: 1.8, masseKg: 20_000 },
    vehicules: ["semi-plateau", "porteur-8x4"],
    conseils: ["Caler les éléments circulaires contre le roulement (berceaux, sabots)."],
  },
  {
    id: "autre",
    nom: "Objet particulier",
    exemple: { longueurM: 10, largeurM: 2.5, hauteurM: 2.5, masseKg: 15_000 },
    vehicules: [],
    conseils: ["Renseigner le centre de gravité et les points de levage / d'arrimage avec le fournisseur."],
  },
];

export function typePiece(id: string | null | undefined): TypePiece {
  return TYPES_PIECES.find((t) => t.id === id) ?? TYPES_PIECES[TYPES_PIECES.length - 1];
}
