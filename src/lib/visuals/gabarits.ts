/**
 * Gabarits des machines du catalogue : cotes relevées sur la planche « Cotation » de la fiche constructeur / loueur
 * (`data/gabarits-machines.json`, provenance « cote » ou « mesure_echelle » par champ). Ils servent UNIQUEMENT au
 * dessin (proportions réelles du modèle) : aucun calcul ni verdict n'en dépend.
 *
 * Repère du relevé : x depuis l'extrémité gauche du porteur sur la vue de profil, y au-dessus du sol.
 * Repère du dessin : x = 0 sur l'axe d'orientation (ou l'articulation de flèche sans tourelle), flèche de travail vers +x.
 */
import brut from "../../../data/gabarits-machines.json";

export type SilhouetteModele =
  | "grue_tout_terrain"
  | "grue_city"
  | "grue_rt"
  | "pick_and_carry"
  | "grue_automotrice_a_tour"
  | "grue_chenilles_treillis"
  | "pelle_rail_route"
  | "autre";

export interface GabaritReleve {
  machine: string;
  pdf: string;
  page: number;
  silhouette: SilhouetteModele;
  gauche_du_dessin: string;
  longueur_porteur_m: number | null;
  longueur_hors_tout_transport_m?: number | null;
  largeur_m: number | null;
  hauteur_transport_m: number | null;
  essieux_x_m: number[] | null;
  diametre_pneu_m: number | null;
  axe_rotation_x_m: number | null;
  cabine_porteur: { x0_m: number; x1_m: number; h_toit_m: number } | null;
  cabine_grue: { x0_m: number; x1_m: number; h_bas_m: number; h_toit_m: number } | null;
  pied_fleche: { x_m: number; h_m: number } | null;
  fleche_repliee?: { x_tete_m: number; h_dessus_m: number; epaisseur_m: number } | null;
  contrepoids: { x0_m: number; x1_m: number; h_bas_m: number; h_haut_m: number } | null;
  stabilisateurs_x_m: number[] | null;
  calage_m: { longueur: number; largeur: number } | null;
  chenilles?: { longueur_m: number; hauteur_m: number; voie_m: number | null } | null;
  garde_sol_m?: number | null;
  mk?: { hauteur_pied_fleche_m: number | null; longueur_fleche_m: number | null; notes?: string } | null;
  provenance?: Record<string, string>;
  remarques?: string;
}

/** Gabarit exprimé dans le repère du dessin (x relatif à l'axe, avant du porteur côté −x sauf pick-and-carry). */
export interface Gabarit {
  modele: string;
  silhouette: SilhouetteModele;
  source: string;
  xAvant: number;
  xArriere: number;
  essieux: number[];
  rayonRoue: number | null;
  hauteur: number | null;
  largeur: number | null;
  cabine: { x0: number; x1: number; h: number } | null;
  cabineGrue: { x0: number; x1: number; hBas: number; hToit: number } | null;
  piedH: number | null;
  /** Abscisse de l'articulation de flèche (repère du dessin, flèche de travail vers +x). */
  piedX: number | null;
  contrepoids: { x0: number; x1: number; hBas: number; hHaut: number } | null;
  stabilisateurs: number[] | null;
  calage: { longueurM: number; largeurM: number } | null;
  chenilles: { x0: number; x1: number; h: number } | null;
  fleche: { longueurM: number | null; piedH: number | null } | null;
}

const fini = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Conversion du relevé (repère « depuis la gauche ») vers le repère du dessin. */
export function versDessin(g: GabaritReleve): Gabarit | null {
  const L = g.longueur_porteur_m;
  const origine = fini(g.axe_rotation_x_m) ? g.axe_rotation_x_m : g.pied_fleche && fini(g.pied_fleche.x_m) ? g.pied_fleche.x_m : fini(L) ? L / 2 : null;
  if (origine === null || !fini(L)) return null;
  const gaucheArriere = g.gauche_du_dessin.toLowerCase().startsWith("arri");
  // Grues à tourelle : avant du porteur vers −x (flèche de travail au-dessus de l'arrière, côté +x).
  // Pick-and-carry : flèche au-dessus de l'avant, donc avant vers +x.
  const avantPositif = g.silhouette === "pick_and_carry";
  const inverser = gaucheArriere !== avantPositif;
  const X = (x: number) => (inverser ? origine - x : x - origine);
  // Organes de la partie tournante : la cotation est en position route (flèche au-dessus de l'avant) ; en travail,
  // flèche au-dessus de l'arrière, la tourelle a pivoté de 180° autour de l'axe.
  const tourne = fini(g.axe_rotation_x_m) && !avantPositif;
  const XT = (x: number) => (tourne ? -X(x) : X(x));
  const plage = (a: number, b: number, f: (x: number) => number = X): [number, number] => {
    const p = f(a);
    const q = f(b);
    return p < q ? [p, q] : [q, p];
  };
  const [xAvant, xArriere] = avantPositif ? plage(0, L).reverse() : plage(0, L);
  return {
    modele: g.machine,
    silhouette: g.silhouette,
    source: `${g.pdf} p. ${g.page}`,
    xAvant,
    xArriere,
    essieux: (g.essieux_x_m ?? []).filter(fini).map(X).sort((a, b) => a - b),
    rayonRoue: fini(g.diametre_pneu_m) ? g.diametre_pneu_m / 2 : null,
    hauteur: fini(g.hauteur_transport_m) ? g.hauteur_transport_m : null,
    largeur: fini(g.largeur_m) ? g.largeur_m : null,
    cabine: g.cabine_porteur ? (([x0, x1]) => ({ x0, x1, h: g.cabine_porteur!.h_toit_m }))(plage(g.cabine_porteur.x0_m, g.cabine_porteur.x1_m)) : null,
    cabineGrue: g.cabine_grue
      ? (([x0, x1]) => ({ x0, x1, hBas: g.cabine_grue!.h_bas_m, hToit: g.cabine_grue!.h_toit_m }))(plage(g.cabine_grue.x0_m, g.cabine_grue.x1_m, XT))
      : null,
    piedH: g.pied_fleche && fini(g.pied_fleche.h_m) ? g.pied_fleche.h_m : null,
    piedX: g.pied_fleche && fini(g.pied_fleche.x_m) ? XT(g.pied_fleche.x_m) : null,
    contrepoids: g.contrepoids
      ? (([x0, x1]) => ({ x0, x1, hBas: g.contrepoids!.h_bas_m, hHaut: g.contrepoids!.h_haut_m }))(plage(g.contrepoids.x0_m, g.contrepoids.x1_m, XT))
      : null,
    stabilisateurs: g.stabilisateurs_x_m ? g.stabilisateurs_x_m.filter(fini).map(X).sort((a, b) => a - b) : null,
    calage: g.calage_m && fini(g.calage_m.longueur) && fini(g.calage_m.largeur) ? { longueurM: g.calage_m.longueur, largeurM: g.calage_m.largeur } : null,
    chenilles: g.chenilles && fini(g.chenilles.longueur_m)
      ? (([x0, x1]) => ({ x0, x1, h: g.chenilles!.hauteur_m }))(fini(g.axe_rotation_x_m) ? plage(0, g.chenilles.longueur_m) : [-g.chenilles.longueur_m / 2, g.chenilles.longueur_m / 2])
      : null,
    fleche: g.mk ? { longueurM: g.mk.longueur_fleche_m, piedH: g.mk.hauteur_pied_fleche_m } : null,
  };
}

const cle = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/terex\s+demag/g, "demag")
    .replace(/tadano\s+faun/g, "tadano")
    .replace(/[^a-z0-9]/g, "");

const INDEX = new Map<string, GabaritReleve>((brut as unknown as { machines: GabaritReleve[] }).machines.map((g) => [cle(g.machine), g]));

/** Gabarit du modèle (fabricant + modèle tels qu'au catalogue), `null` si la cotation n'a pas été relevée. */
export function gabaritDe(fabricant: string | null | undefined, modele: string | null | undefined): Gabarit | null {
  if (!modele) return null;
  const g = INDEX.get(cle(`${fabricant ?? ""} ${modele}`)) ?? INDEX.get(cle(modele));
  return g ? versDessin(g) : null;
}

/** Liste des modèles relevés (planche, tests). */
export function gabaritsReleves(): GabaritReleve[] {
  return [...INDEX.values()];
}
