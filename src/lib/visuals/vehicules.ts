/**
 * Véhicules de transport (outil Transport) en vue de côté, même rendu « illustration technique » que les engins :
 * tracteurs et porteurs (cabine vitrée, déflecteur, réservoir, échappement, gyrophare), semi-remorques plateau,
 * surbaissée à col de cygne, porte-panneaux, porte-poutres avec dolly, remorque modulaire.
 *
 * Fonction PURE, coordonnées métriques : x = 0 à l'avant du véhicule (cabine à gauche), y = 0 au sol.
 * Cotes reprises de la famille de véhicule (`longueurHorsPlateauM`, `hauteurPlancherM`) et du plateau retenu.
 */
import { VINCI } from "@/lib/design-tokens";

import {
  GRIS_FONCE,
  TRAIT,
  barre,
  cabine,
  caisson,
  chevrons,
  echappement,
  echelle,
  feu,
  gardeBoue,
  gyrophare,
  lin,
  ombre,
  piece,
  rectArrondi,
  reflet,
  roue,
  trait,
  verin,
  vertical,
} from "./rendu";
import type { Forme, Pt } from "./silhouettes";

export type SilhouetteVehicule = "porteur" | "semi" | "surbaissee" | "porte-poutres" | "modulaire" | "porte-panneaux";

export interface VehiculeDessin {
  id: string;
  silhouette?: SilhouetteVehicule;
  longueurHorsPlateauM: number;
  hauteurPlancherM: number;
}

const NOIR = VINCI.noir;

/** Tracteur ou porteur : châssis, cabine, pare-chocs, phares, marchepied, réservoir, échappement, gyrophare. */
function tracteur(longueurChassis: number, cab: { longueur: number; haut: number }, deflecteur: boolean): Forme[] {
  const f: Forme[] = [];
  f.push(caisson(0.2, 0.82, longueurChassis, 1.14, "acier", 0.02));
  // Réservoir et coffre batteries derrière la cabine
  f.push(piece(rectArrondi(cab.longueur + 0.05, 0.5, cab.longueur + 1.0, 1.02, 0.18), lin([0, 1.02], [0, 0.5], "chrome"), NOIR, TRAIT));
  f.push(trait([cab.longueur + 0.25, 0.53], [cab.longueur + 0.25, 0.99], GRIS_FONCE, 0.5), trait([cab.longueur + 0.82, 0.53], [cab.longueur + 0.82, 0.99], GRIS_FONCE, 0.5));
  f.push(caisson(0, 0.52, 0.95, 1.04, "acier", 0.05), ...feu(-0.03, 0.75, 0.08, 0.92, "blanc"), ...feu(-0.03, 0.6, 0.08, 0.7, "ambre"));
  f.push(...cabine(0.04, 1.0, cab.longueur, cab.haut, { avant: "gauche", ceinture: 0.46, inclinaison: 0.05 }));
  if (deflecteur) f.push(piece([[cab.longueur * 0.42, cab.haut], [cab.longueur - 0.05, cab.haut], [cab.longueur - 0.05, cab.haut + 0.32], [cab.longueur * 0.62, cab.haut + 0.3]], lin([0, cab.haut + 0.32], [0, cab.haut], "peinture"), NOIR, TRAIT));
  f.push(...echelle(cab.longueur - 0.75, 0.42, 1.0, 0.3));
  f.push(...gyrophare(cab.longueur * 0.32, cab.haut, 0.09));
  f.push(...echappement(cab.longueur + 0.12, 1.14, cab.haut + (deflecteur ? 0.2 : 0.05), 0.1));
  return f;
}

/** Plancher de remorque / plateau : longeron en acier, rive chromée, logements de ranchers. */
function plateau(x0: number, x1: number, yHaut: number, ep: number): Forme[] {
  const f: Forme[] = [caisson(x0, yHaut - ep, x1, yHaut, "acier", 0.02), reflet([x0 + 0.05, yHaut - 0.03], [x1 - 0.05, yHaut - 0.03], 1, 0.6)];
  for (let x = x0 + 0.6; x < x1 - 0.2; x += 1.2) f.push(trait([x, yHaut - ep + 0.03], [x, yHaut - 0.04], VINCI.gris, 0.6, 0.8));
  return f;
}

/** Feux et bavette de signalisation à l'arrière. */
function arriere(x: number, y: number): Forme[] {
  return [...chevrons(x - 0.12, y - 0.42, x + 0.02, y, 0.08), ...feu(x - 0.06, y - 0.38, x + 0.04, y - 0.22, "rouge")];
}

/** Béquilles de semi-remorque (relevées). */
function bequilles(x: number, yHaut: number): Forme[] {
  return [barre([x, yHaut], [x, 0.35], 0.14, 0.12, "acier"), caisson(x - 0.16, 0.22, x + 0.16, 0.32, "acier", 0.02)];
}

/** Roue + garde-boue. */
const roueGB = (x: number, r: number): Forme[] => [...roue(x, r, 0.58), ...gardeBoue(x, r, "acier")];

/**
 * Formes du véhicule. `plateauM` = longueur de plateau retenue ; `hauteurPieceM` sert au portique du porte-panneaux.
 */
export function formesVehicule(v: VehiculeDessin, plateauM: number, hauteurPieceM: number): Forme[] {
  const d = v.longueurHorsPlateauM;
  const fin = d + plateauM;
  const p = v.hauteurPlancherM;
  const sil = v.silhouette ?? "semi";
  const f: Forme[] = [...ombre(-0.1, fin + 0.1, 0.14)];
  const essieuxArriere = (n: number, pas = 1.36) => Array.from({ length: n }, (_, i) => fin - 1.3 - i * pas);

  if (sil === "porteur") {
    f.push(...tracteur(fin - 0.05, { longueur: 2.4, haut: 3.4 }, false));
    for (const x of [1.3, ...essieuxArriere(2)]) f.push(...roueGB(x, 0.5));
    f.push(...plateau(d, fin, p, 0.22));
    f.push(caisson(d, p, fin, p + 0.42, "peinture", 0.02));
    for (let x = d + 0.9; x < fin - 0.1; x += 0.9) f.push(trait([x, p + 0.02], [x, p + 0.4], GRIS_FONCE, 0.6, 0.8));
    f.push(...arriere(fin, p - 0.05));
    if (v.id === "porteur-grue") {
      // Grue auxiliaire repliée derrière la cabine : colonne, bras replié sur le plateau, vérin
      const c0 = 2.5;
      f.push(caisson(c0 - 0.05, 1.14, c0 + 0.55, 1.5, "peinture", 0.03));
      f.push(piece([[c0 + 0.05, 1.5], [c0 + 0.45, 1.5], [c0 + 0.4, 3.05], [c0 + 0.1, 3.05]], lin([c0, 0], [c0 + 0.5, 0], "bleu"), VINCI.bleuDark));
      const bout: Pt = [c0 + Math.min(plateauM * 0.85, 6), 3.22];
      f.push(...verin([c0 + 0.45, 1.75], [c0 + 1.6, 2.95], 0.16, { course: 0.6 }));
      f.push(barre([c0 + 0.25, 3.15], bout, 0.34, 0.26, "bleu", VINCI.bleuDark), reflet([c0 + 0.3, 3.28], [bout[0] - 0.1, 3.3], 1, 0.7));
    }
    return f;
  }

  if (sil === "porte-poutres") {
    // Tracteur à sellette pivotante ; la pièce relie la sellette au dolly arrière autodirectionnel.
    const sellette = d + 1.2;
    const dolly = fin - 1.5;
    f.push(...tracteur(d + 2.8, { longueur: 2.3, haut: 3.6 }, true));
    for (const x of [1.3, d + 1.6, d + 2.95]) f.push(...roueGB(x, 0.5));
    for (const x of [sellette, dolly]) {
      f.push(piece([[x - 0.6, 1.15], [x + 0.6, 1.15], [x + 0.45, p - 0.12], [x - 0.45, p - 0.12]], vertical(1.15, p - 0.12, "acier"), NOIR, TRAIT));
      f.push(caisson(x - 0.9, p - 0.12, x + 0.9, p, "chrome", 0.02), trait([x - 0.3, p - 0.06], [x + 0.3, p - 0.06], NOIR, 0.8));
    }
    f.push(caisson(dolly - 2.1, 0.82, dolly + 1.5, 1.18, "acier", 0.02));
    f.push(trait([d + 3.3, 1.0], [dolly - 2.1, 1.0], VINCI.gris, 2, undefined, "3 4"));
    for (const o of [-1.36, 0, 1.36]) f.push(...roueGB(dolly + o * 0.95 - 0.2, 0.5));
    f.push(...arriere(dolly + 1.5, 1.15));
    return f;
  }

  if (sil === "modulaire") {
    const lignes = Math.max(4, Math.round(plateauM / 1.5));
    f.push(...tracteur(6.5, { longueur: 2.6, haut: 3.8 }, true));
    // Caisson de lest sur le tracteur
    f.push(caisson(3.0, 1.18, 6.4, 1.8, "lest", 0.08), ...chevrons(6.28, 1.24, 6.4, 1.74, 0.07));
    for (const x of [1.4, 4.3, 5.7]) f.push(...roueGB(x, 0.55));
    // Timon et remorque modulaire à essieux pendulaires
    f.push(barre([6.4, 0.85], [d, p - 0.2], 0.14, 0.14, "acier"));
    f.push(caisson(d, p - 0.45, fin, p, "acier", 0.03), reflet([d + 0.05, p - 0.04], [fin - 0.05, p - 0.04], 1, 0.6));
    for (let i = 1; i < Math.ceil(plateauM / 3); i++) f.push(trait([d + i * 3, p - 0.43], [d + i * 3, p - 0.02], NOIR, 0.8));
    for (let i = 0; i < lignes; i++) {
      const x = d + (plateauM * (i + 0.5)) / lignes;
      f.push(barre([x - 0.08, p - 0.45], [x, 0.4], 0.16, 0.16, "acier"), ...roue(x, 0.37, 0.58));
    }
    f.push(...arriere(fin, p - 0.05));
    return f;
  }

  // Semi-remorques : plateau, surbaissée à col de cygne, porte-panneaux
  const bas = sil === "surbaissee" || sil === "porte-panneaux";
  const col = bas ? d - 3.2 : d;
  f.push(...tracteur(5.8, { longueur: 2.3, haut: 3.6 }, true));
  for (const x of [1.3, 4.2, 5.55]) f.push(...roueGB(x, 0.5));
  // Sellette
  f.push(caisson(col + 0.6, 1.14, col + 1.6, 1.3, "acier", 0.02));
  if (bas) {
    // Col de cygne au-dessus de la sellette, puis descente vers le plancher bas
    f.push(caisson(col, 1.3, d, 1.7, "acier", 0.03), reflet([col + 0.05, 1.66], [d - 0.4, 1.66], 1, 0.6));
    f.push(piece([[d - 0.4, 1.7], [d + 0.4, p], [d + 0.4, p - 0.25], [d - 0.8, 1.3]], lin([d, 1.7], [d + 0.2, p - 0.25], "acier"), NOIR, TRAIT));
    f.push(...plateau(d, fin, p, 0.25));
    if (sil === "porte-panneaux") {
      // Châssis en U ouvert : longerons latéraux et portique arrière
      f.push(caisson(d, 0.9, fin, 1.15, "bleu", 0.02));
      f.push(caisson(fin - 0.35, 0.2, fin, 0.2 + Math.min(hauteurPieceM, 2.6), "bleu", 0.03));
    }
    f.push(...bequilles(Math.max(col + 2.4, 6.7), 1.3));
  } else {
    f.push(...plateau(col, fin, p, 0.32));
    f.push(...bequilles(Math.max(col + 2.2, 6.7), p - 0.32));
  }
  f.push(...arriere(fin, Math.max(0.95, p - 0.25)));
  for (const x of essieuxArriere(3, bas ? 1.1 : 1.36)) f.push(...roueGB(x, bas ? 0.4 : 0.5));
  return f;
}
