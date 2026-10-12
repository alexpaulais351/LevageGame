/**
 * Démarches réglementaires selon la catégorie du convoi (aide à la préparation, à confirmer auprès de la DDT).
 * Sources : Code de la route R.433-1 à R.433-4, R.312-21 ; arrêté du 4 mai 2006 modifié (art. 3, 8, 13, 14, 16) ;
 * annexes de l'arrêté du 7 juin 2019 (réseaux 1TE, 2TE48, TE72/94/120). Détail : docs/TRANSPORT.md.
 */
import type { Categorie, Encombrement } from "@/engine/transport";

export interface Rubrique {
  titre: string;
  lignes: string[];
}

export function demarches(categorie: Categorie, enc: Encombrement, opts: { chargeIndivisible: boolean }): Rubrique[] {
  const r: Rubrique[] = [];
  if (categorie === "standard") {
    r.push({ titre: "Autorisation", lignes: ["Aucune : transport dans le gabarit et la masse du transport normal."] });
    const sig: string[] = ["Arrimage conforme (norme EN 12195-1) et chargement réparti sur les essieux."];
    if (enc.porteAFauxM > 0) sig.push("Porte-à-faux arrière : le signaler de façon visible de jour comme de nuit (panneau / feu), 3 m maximum.");
    r.push({ titre: "Signalisation et arrimage", lignes: sig });
    return r;
  }

  const aut: string[] = [];
  if (categorie === "te1") {
    aut.push(
      opts.chargeIndivisible
        ? "Déclaration préalable possible sur le réseau 1TE (et raccordements ≤ 20 km) pour une charge indivisible ; sinon autorisation préfectorale."
        : "Autorisation préfectorale (la déclaration 1re catégorie ne vise que les charges indivisibles, engins exclus).",
    );
  } else {
    aut.push("Autorisation préfectorale préalable : au voyage, permanente ou de portée locale (APL), selon l'itinéraire et la répétition.");
  }
  aut.push("Demande au préfet du département de départ (instruction par la DDT) ; validité 3 ans au plus.");
  aut.push("Délais d'instruction usuels : environ 15 jours (un département) à 1 ou 2 mois (itinéraire précis, nombreuses consultations).");
  if (categorie !== "te1") aut.push(`Réseau adapté à la masse : ${reseau(enc.masseKg)}.`);
  r.push({ titre: "Autorisation", lignes: aut });

  r.push({
    titre: "Signalisation du convoi",
    lignes: [
      "Panneaux « CONVOI EXCEPTIONNEL » jaunes à l'avant et à l'arrière (1,90 × 0,25 m minimum).",
      categorie === "te1" ? "Feux tournants : 1 à l'avant et 1 à l'arrière (gabarit 1re catégorie)." : "Feux tournants : 2 à l'avant et 2 à l'arrière, de jour comme de nuit.",
      "4 feux d'encombrement ; panneaux de débord pour les dépassements avant, arrière et latéraux.",
    ],
  });

  const circ = [
    "Interdit du samedi (ou veille de fête) 12 h au lundi (ou lendemain de fête) 6 h, sauf dérogation.",
    "Interdit pendant les restrictions poids lourds, les barrières de dégel, et par neige, verglas ou visibilité insuffisante.",
  ];
  if (categorie === "te3") circ.push("Vitesses de la 3e catégorie (arrêté de 2006) : 60 km/h sur autoroute, 50 km/h sur route, 30 km/h en agglomération.");
  r.push({ titre: "Circulation", lignes: circ });
  return r;
}

/** Réseau national de TE adapté à la masse totale (annexes de l'arrêté du 7 juin 2019). */
export function reseau(masseKg: number): string {
  if (masseKg <= 48_000) return "2TE48 (jusqu'à 48 t)";
  if (masseKg <= 72_000) return "TE72 (jusqu'à 72 t)";
  if (masseKg <= 94_000) return "TE94 (jusqu'à 94 t)";
  if (masseKg <= 120_000) return "TE120 (jusqu'à 120 t)";
  return "itinéraire spécifique (plus de 120 t, étude d'ouvrages d'art)";
}
