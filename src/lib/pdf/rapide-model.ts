/**
 * Modèle de la synthèse PDF de l'adéquation rapide (D44). Fonction pure : aucune dépendance React ni réseau.
 * Toutes les valeurs sont formatées pour l'affichage (police WinAnsi : `pdfTexte`).
 */
import type { VerdictGlobal } from "@/engine";
import { VERDICT } from "@/lib/design-tokens";
import { formatTaux } from "@/lib/study/format";
import { resultatVisuelRapide, type ResultatRapide } from "@/lib/study/rapide";
import type { StudyData } from "@/lib/study/types";
import { formatDateFR, formatMasse, formatNombreFR } from "@/lib/utils";

import { dateIso, slugFichier } from "./filename";
import { schemaElevation, type Schema } from "./schemas";
import { CADRE_COURT, MENTION_PERMANENTE, VERDICT_LIBELLE, calcBloc, pdfTexte, type CalcBloc } from "./model";

export const LIMITES_RAPIDE =
  "Vérification rapide d'une seule pose à l'abaque : capacité et taux d'utilisation uniquement. Élingage, appuis et sol, vent, lignes électriques, personnel et organisation du levage ne sont pas contrôlés : ils relèvent de l'adéquation complète.";

export interface RapidePdfModel {
  entete: { titre: string; date: string; redacteur: string; entreprise: string };
  verdict: { libelle: string; couleur: string; fond: string; sousTitre: string };
  resultats: [string, string][];
  machine: [string, string][];
  charge: [string, string][];
  porteeMax: { valeur: string; detail: string } | null;
  /** Schéma en élévation de la pose (portée saisie), mêmes primitives que la fiche complète. */
  schema: Schema;
  calculs: CalcBloc[];
  bloquants: string[];
  reserves: string[];
  source: [string, string][];
  limites: string;
  mention: string;
  cadre: string;
}

const STYLE: Record<VerdictGlobal, { couleur: string; fond: string }> = {
  ADEQUAT: { couleur: VERDICT.vert, fond: VERDICT.vertBg },
  ADEQUAT_AVEC_RESERVES: { couleur: VERDICT.jaune, fond: VERDICT.jauneBg },
  NON_ADEQUAT: { couleur: VERDICT.rouge, fond: VERDICT.rougeBg },
};

const TIRET = "—";
const m = (v: number | null | undefined) => (v === null || v === undefined ? TIRET : pdfTexte(`${formatNombreFR(v, 2).replace(/,00$/, "")} m`));
const t = (kg: number | null | undefined) => (kg === null || kg === undefined ? TIRET : pdfTexte(formatMasse(kg)));
const txt = (s: string | null | undefined) => (s && s.trim() ? pdfTexte(s.trim()) : TIRET);

export function buildRapidePdfModel(args: { data: StudyData; resultat: ResultatRapide; redacteur: string; entreprise: string | null; date?: Date }): RapidePdfModel {
  const { data: d, resultat: r } = args;
  const sel = d.machine.selection;
  const chart = sel?.chart ?? null;
  const axeY = chart?.axisY ?? "none";
  const pos = d.geometrie.positions[0];
  const v = r.verdict.value;
  const p0 = v.positions[0] ?? null;
  const cap = p0?.capacite.value ?? null;
  const yTexte = axeY === "none" ? "" : `, ${axeY === "height_m" ? "hauteur" : "flèche"} ${m(pos?.yM)}`;
  const accessoires = d.accessoires.liste.reduce<number | null>((s, a) => (s === null || a.masseKg === null ? s : s + a.masseKg), 0);

  return {
    entete: {
      titre: "ADÉQUATION RAPIDE",
      date: formatDateFR(args.date ?? new Date()),
      redacteur: pdfTexte(args.redacteur || TIRET),
      entreprise: pdfTexte(args.entreprise ?? ""),
    },
    verdict: {
      libelle: VERDICT_LIBELLE[v.verdict],
      ...STYLE[v.verdict],
      sousTitre: pdfTexte(
        `${sel ? `${sel.manufacturerName} ${sel.model}` : "Machine non choisie"} · ${t(r.chargeTotale.value)} à ${m(pos?.porteeM)}${yTexte} · taux ${v.tauxMax === null ? TIRET : formatTaux(v.tauxMax)}`,
      ),
    },
    resultats: [
      ["Charge totale", t(r.chargeTotale.value)],
      ["Capacité à l'abaque", p0 ? (cap === null ? "Hors abaque" : t(cap)) : TIRET],
      ["Taux d'utilisation", v.tauxMax === null ? TIRET : pdfTexte(formatTaux(v.tauxMax))],
      ["Seuils (vert / limite)", pdfTexte(`${d.seuils.vertPct ?? TIRET} % / ${d.seuils.orangePct ?? TIRET} %`)],
    ],
    machine: [
      ["Type", txt(sel?.typeLabel)],
      ["Constructeur", txt(sel?.manufacturerName)],
      ["Modèle", txt(sel?.model)],
      ["Configuration", txt(sel?.configurationLabel)],
    ],
    charge: [
      ["Masse de la charge", t(d.charge.masseKg)],
      ["Coefficient de marge", d.charge.coefMarge === null ? TIRET : pdfTexte(formatNombreFR(d.charge.coefMarge, 2))],
      ["Accessoires de levage", accessoires ? t(accessoires) : "Aucun"],
      ["Moufle / crochet", t(d.machine.moufleCrochetKg)],
      ["Autres masses", d.machine.autresKg ? t(d.machine.autresKg) : "Aucune"],
      ["Portée (distance de pose)", m(pos?.porteeM)],
      ...(axeY === "none" ? [] : ([[axeY === "height_m" ? "Hauteur de levage" : "Longueur de flèche", m(pos?.yM)]] as [string, string][])),
    ],
    porteeMax:
      r.porteeMax === null
        ? null
        : r.porteeMax.value === null
          ? { valeur: "Aucune", detail: pdfTexte(r.porteeMax.warnings.join(" ")) }
          : {
              valeur: m(r.porteeMax.value),
              detail: pdfTexte(
                `Plus grand nœud de portée de l'abaque où la capacité couvre ${t(r.chargeTotale.value)} : ${t(Number(r.porteeMax.inputs.cap.value))}. Limite : ${String(r.porteeMax.inputs.limite?.value ?? "")}. Aucune extrapolation.`,
              ),
            },
    schema: { ...schemaElevation(d, resultatVisuelRapide(d, r)), titre: "Schéma de la pose (élévation, indicatif)" },
    calculs: [
      calcBloc("Charge totale", r.chargeTotale, t(r.chargeTotale.value)),
      calcBloc("Taux d'utilisation et verdict", r.verdict, VERDICT_LIBELLE[v.verdict]),
    ],
    bloquants: v.bloquants.map((i) => pdfTexte(i.message)),
    reserves: v.reserves.map((i) => pdfTexte(i.message)),
    source: chart
      ? [
          ["Document", txt(chart.source.title)],
          ["Référence", txt(chart.source.reference)],
          ["Norme", txt(chart.standard)],
          ["Statut de l'abaque", chart.status === "verifie" ? "Vérifié" : "À vérifier"],
        ]
      : [],
    limites: LIMITES_RAPIDE,
    mention: MENTION_PERMANENTE,
    cadre: CADRE_COURT,
  };
}

/** Nom de fichier : adequation-rapide_<modele>_<AAAA-MM-JJ>.pdf (ASCII). */
export function nomFichierRapide(args: { modele?: string | null; date: Date }): string {
  return `adequation-rapide_${slugFichier(args.modele ?? "") || "machine"}_${dateIso(args.date)}.pdf`;
}
