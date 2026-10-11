/**
 * Modèle de données de la fiche d'adéquation PDF : fonction pure `étude → PdfModel`.
 * Aucun import React ni @react-pdf : testable sous Vitest, rendu séparé dans `document.tsx`.
 */
import type { Calc, Issue, VerdictGlobal, Zone } from "@/engine";
import { VERDICT } from "@/lib/design-tokens";
import type { StudyResult } from "@/lib/study/compute";
import { formatCalcValue, formatNombreAuto, formatTaux } from "@/lib/study/format";
import { thresholds } from "@/lib/study/mapping";
import type { AccessoireSaisie, StudyData } from "@/lib/study/types";
import { formatMasse, formatNombreFR } from "@/lib/utils";

import { extraireAbaque, type ExtraitAbaque } from "./abaque-extrait";
import { dateIso } from "./filename";
import { construireSchemas, type Schema } from "./schemas";

export const MENTION_PERMANENTE =
  "Outil d'aide à la rédaction. L'adéquation doit être validée par une personne compétente, sur la base de la documentation constructeur de la machine réellement présente sur le chantier.";
export const CADRE_REGLEMENTAIRE = "Examen d'adéquation : arrêté du 1er mars 2004 ; Code du travail, art. R.4323-22 et suivants.";
export const CADRE_COURT = "Arrêté du 1er mars 2004 · Code du travail R.4323-22 s.";
export const MENTION_INVITE = "Document non enregistré";
export const LIBELLE_ABAQUE_A_VERIFIER = "ABAQUE À VÉRIFIER";
export const SIGNATAIRES = ["Rédacteur", "Chef de manœuvre", "Conducteur", "Responsable chantier"] as const;

export const VERDICT_LIBELLE: Record<VerdictGlobal, string> = {
  ADEQUAT: "ADÉQUAT",
  ADEQUAT_AVEC_RESERVES: "ADÉQUAT AVEC RÉSERVES",
  NON_ADEQUAT: "NON ADÉQUAT",
};

const VERDICT_COULEUR: Record<VerdictGlobal, { couleur: string; fond: string }> = {
  ADEQUAT: { couleur: VERDICT.vert, fond: VERDICT.vertBg },
  ADEQUAT_AVEC_RESERVES: { couleur: VERDICT.jaune, fond: VERDICT.jauneBg },
  NON_ADEQUAT: { couleur: VERDICT.rouge, fond: VERDICT.rougeBg },
};

const TYPE_ACCESSOIRE: Record<AccessoireSaisie["type"], string> = {
  elingue: "Élingue",
  manille: "Manille",
  palonnier: "Palonnier",
  crochet: "Crochet",
  autre: "Autre",
};

/** Informations hors étude : référence/indice, rédacteur (profil), entreprise/logo (compte), mode invité. */
export interface PdfMeta {
  reference?: string;
  indice?: string;
  /** Rédacteur du profil ; repli si le champ « Rédacteur » de l'étude est vide. */
  redacteur?: string;
  entreprise?: string;
  /** URL ou data-URI du logo entreprise ; rien en mode invité. */
  logoUrl?: string | null;
  invite: boolean;
  /** Date de génération (injectée : fonction pure). */
  genereLe: Date;
}

export interface Champ {
  label: string;
  valeur: string;
}

export interface CalcBloc {
  titre: string;
  resume?: string;
  formule: string;
  entrees: Champ[];
  source?: string;
  avertissements: string[];
}

export interface TauxLigne {
  nom: string;
  portee: string;
  y: string;
  capacite: string;
  taux: string;
  ratio: number | null;
  zone: Zone | null;
  horsAbaque: boolean;
}

export interface AccessoireLigne {
  label: string;
  type: string;
  cmuUtile: string;
  effort: string;
  taux: string;
  conforme: boolean;
}

export interface AbaqueModel {
  id: string;
  statut: "a_verifier" | "verifie";
  statutLibelle: string;
  source: Champ[];
  interpolation: string;
  deductions: string;
  extrait: ExtraitAbaque;
  /** Libellé de l'axe Y ("Longueur de flèche (m)", "Hauteur (m)" ou ""). */
  axeYLibelle: string;
}

export interface PdfModel {
  entete: {
    titre: string;
    projet: string;
    reference: string;
    indice: string;
    date: string;
    redacteur: string;
    entreprise: string;
    logoUrl: string | null;
  };
  invite: boolean;
  mentionPermanente: string;
  cadre: string;
  cadreCourt: string;
  genereLe: string;
  verdict: {
    code: VerdictGlobal;
    libelle: string;
    couleur: string;
    fond: string;
    tauxTexte: string;
    positionDefavorable: string;
    chargeTotale: string;
    nbBloquants: number;
    nbReserves: number;
  };
  abaqueAVerifier: boolean;
  operation: { champs: Champ[]; description: string; intervenants: string };
  charge: { champs: Champ[] };
  accessoires: { champs: Champ[]; lignes: AccessoireLigne[]; calc: CalcBloc };
  machine: { champs: Champ[]; chargeTotale: Champ[]; abaque: AbaqueModel | null };
  schemas: Schema[];
  calculs: CalcBloc[];
  taux: { tauxMax: number | null; tauxTexte: string; zone: Zone | null; seuilVert: number; seuilOrange: number; lignes: TauxLigne[] };
  sol: { champs: Champ[]; resultat: Champ[]; avertissements: string[] };
  environnement: { champs: Champ[]; mesures: string[] };
  personnel: { champs: Champ[] };
  conclusion: { bloquants: string[]; reserves: string[]; reservesLibres: string[] };
  signatures: string[];
}

// ---------------------------------------------------------------------------
// Formatage
// ---------------------------------------------------------------------------

const TIRET = "—";
/**
 * Les polices intégrées (Helvetica, WinAnsi) n'ont ni ≤ ≥ ⇒ → β Σ… : on les remplace par des équivalents lisibles.
 * U+202F (séparateur de milliers) → U+00A0 ; tout autre caractère hors WinAnsi est retiré (jamais de glyphe « tofu »).
 */
const SUBSTITUTIONS: Record<string, string> = {
  "≤": "<=",
  "≥": ">=",
  "⇒": "=>",
  "⇔": "<=>",
  "→": "->",
  "−": "-",
  "β": "bêta",
  "Σ": "somme",
  "√": "racine",
  "≈": "~",
  "∞": "infini",
  "≠": "!=",
  "′": "'",
  "\u202f": "\u00a0",
  "\u2009": "\u00a0",
};
const HORS_WINANSI = /[^\x00-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g;
export const pdfTexte = (s: string): string =>
  s.replace(/[≤≥⇒⇔→−βΣ√≈∞≠′\u202f\u2009]/g, (c) => SUBSTITUTIONS[c] ?? c).replace(HORS_WINANSI, "");

const masse = (kg: number | null | undefined): string => (kg === null || kg === undefined ? TIRET : pdfTexte(formatMasse(kg)));
const metres = (v: number | null | undefined): string => (v === null || v === undefined ? TIRET : pdfTexte(`${formatNombreAuto(v)} m`));
const nombre = (v: number | null | undefined, unite: string): string =>
  v === null || v === undefined ? TIRET : pdfTexte(`${formatNombreAuto(v)} ${unite}`);
const txt = (s: string | null | undefined): string => (s && s.trim() !== "" ? pdfTexte(s.trim()) : TIRET);
const ouiNon = (b: boolean): string => (b ? "Oui" : "Non");

/** "2026-03-14" → "14/03/2026" ; sinon texte tel quel. */
export function dateFR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso.trim();
}

function champs(...paires: [string, string][]): Champ[] {
  return paires.map(([label, valeur]) => ({ label, valeur }));
}

function calcBloc(titre: string, calc: Calc<unknown>, resume?: string): CalcBloc {
  return {
    titre,
    resume,
    formule: pdfTexte(calc.formula),
    entrees: Object.values(calc.inputs).map((e) => ({ label: pdfTexte(e.label), valeur: pdfTexte(formatCalcValue(e)) })),
    source: calc.source === undefined ? undefined : pdfTexte(calc.source),
    avertissements: calc.warnings.map((w) => pdfTexte(arrondirMessage(w))),
  };
}

/** Arrondit les nombres à longue décimale des messages du moteur (110.16279… % → 110,16 %). */
const arrondirMessage = (s: string): string => s.replace(/\d+\.\d{3,}/g, (n) => formatNombreAuto(Number(n), 2));
const messages = (issues: Issue[]) => issues.map((i) => pdfTexte(arrondirMessage(i.message)));

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export function buildPdfModel(data: StudyData, result: StudyResult, meta: PdfMeta): PdfModel {
  const v = result.verdict.value;
  const sel = data.machine.selection;
  const chart = sel?.chart ?? null;
  const axeY = chart?.axisY ?? "none";
  const aVerifier = chart?.status === "a_verifier" || v.reserves.some((r) => r.code === "ABAQUE_A_VERIFIER");
  const th = thresholds(data);
  const seuils = {
    vert: Number.isFinite(th.greenMax) ? th.greenMax : 0.8,
    orange: Number.isFinite(th.orangeMax) ? th.orangeMax : 1,
  };
  const worst = v.positionDefavorable;
  const chargeTotale = result.chargeTotale.value;
  const o = data.operation;
  const redacteur = o.redacteur.trim() || (meta.redacteur ?? "").trim();
  const style = VERDICT_COULEUR[v.verdict];

  // --- Accessoires
  const r = result.elingage.value;
  const accessoiresLignes: AccessoireLigne[] = r.accessoires.map((a) => {
    const saisi = data.accessoires.liste.find((x) => x.id === a.id);
    return {
      label: a.label,
      type: saisi ? TYPE_ACCESSOIRE[saisi.type] : TIRET,
      cmuUtile: masse(a.cmuUtileKg),
      effort: masse(a.effortKg),
      taux: formatTaux(a.taux),
      conforme: a.conforme,
    };
  });

  // --- Machine et abaque
  const abaque: AbaqueModel | null = chart
    ? {
        id: chart.id,
        statut: chart.status,
        statutLibelle: chart.status === "verifie" ? "Vérifié" : "À VÉRIFIER",
        source: champs(
          ["Titre", txt(chart.source.title)],
          ["Référence", txt(chart.source.reference)],
          ["Édition", txt(chart.source.edition)],
          ["URL", txt(chart.source.url)],
          ["Norme de calcul", txt(chart.standard)],
          ["Statut", chart.status === "verifie" ? "Vérifié" : "À VÉRIFIER"],
        ),
        interpolation: chart.interpolationAllowed
          ? "Interpolation linéaire en portée autorisée par le constructeur."
          : "Pas d'interpolation : valeur la plus défavorable entre deux nœuds ; aucune extrapolation hors tableau.",
        deductions: chart.deductionsIncluded ? "Capacités nettes des déductions (moufle, crochet…)." : "Capacités brutes : déductions (moufle, crochet…) prises en compte dans la charge totale.",
        extrait: extraireAbaque(
          chart,
          data.geometrie.positions.map((p) => ({ nom: p.nom.trim() || "Position", porteeM: p.porteeM, yM: p.yM })),
        ),
        axeYLibelle: axeY === "none" ? "" : axeY === "height_m" ? "Hauteur (m)" : "Longueur de flèche (m)",
      }
    : null;

  // --- Taux par position
  const tauxLignes: TauxLigne[] = data.geometrie.positions.map((p, i) => {
    const res = v.positions.find((x) => x.id === p.id);
    return {
      nom: p.nom.trim() || `Position ${i + 1}`,
      portee: metres(p.porteeM),
      y: axeY === "none" ? "" : metres(p.yM),
      capacite: !res ? TIRET : res.capacite.value === null ? "Hors abaque" : masse(res.capacite.value),
      taux: res ? (res.capacite.value === null ? "Hors abaque" : formatTaux(res.taux)) : TIRET,
      ratio: res?.taux ?? null,
      zone: res ? (res.capacite.value === null ? "rouge" : res.zone) : null,
      horsAbaque: res !== undefined && res.capacite.value === null,
    };
  });

  // --- Calculs
  const calculs: CalcBloc[] = [
    calcBloc("Charge totale", result.chargeTotale, chargeTotale === null ? "non calculable" : masse(chargeTotale)),
    ...v.positions.map((p) =>
      calcBloc(
        `Capacité à l'abaque — ${p.label}`,
        p.capacite,
        `${p.capacite.value === null ? "hors abaque" : masse(p.capacite.value)} · taux ${formatTaux(p.taux)}`,
      ),
    ),
    calcBloc("Taux d'utilisation et verdict", result.verdict, VERDICT_LIBELLE[v.verdict]),
    calcBloc("Élingage et CMU", result.elingage, r.effortParBrinKg === null ? undefined : `T = ${masse(r.effortParBrinKg)} par brin`),
    ...(result.sol
      ? [calcBloc("Appuis et sol", result.sol, result.sol.value.pressionKPa === null ? undefined : `p = ${nombre(result.sol.value.pressionKPa, "kPa")}`)]
      : []),
    calcBloc("Vent", result.vent),
    ...(result.ligne ? [calcBloc("Lignes électriques", result.ligne)] : []),
  ];

  // --- Sol
  const s = data.sol;
  const g = result.sol?.value;
  const solChamps: Champ[] = champs(
    ["Mode d'appui", s.mode === "stabilisateurs" ? "Stabilisateurs" : s.mode === "chenilles" ? "Chenilles" : s.mode === "non_applicable" ? "Non applicable" : TIRET],
    ["Effort maximal", nombre(s.effortMaxKN, "kN")],
    ...(s.mode === "stabilisateurs"
      ? ([
          s.typeSurface === "plaque"
            ? ["Plaque de répartition", s.plaqueLongueurM !== null && s.plaqueLargeurM !== null ? pdfTexte(`${formatNombreAuto(s.plaqueLongueurM)} × ${formatNombreAuto(s.plaqueLargeurM)} m`) : TIRET]
            : ["Patin", nombre(s.patinSurfaceM2, "m²")],
        ] as [string, string][])
      : s.mode === "chenilles"
        ? ([
            ["Longueur d'appui de chenille", metres(s.chenilleLongueurM)],
            ["Largeur de tuile", metres(s.chenilleTuileM)],
          ] as [string, string][])
        : []),
    ["Portance admissible du sol", nombre(s.portanceKPa, "kPa")],
    ["Proximités (fouilles, talus, réseaux, ouvrages)", txt(s.proximites)],
  );
  const solResultat: Champ[] = g
    ? champs(
        ["Surface d'appui", nombre(g.surfaceM2, "m²")],
        ["Pression transmise", nombre(g.pressionKPa, "kPa")],
        ["Portance admissible", nombre(g.portanceKPa, "kPa")],
        ["Marge", nombre(g.margeKPa, "kPa")],
        ["Taux (pression / portance)", formatTaux(g.taux)],
      )
    : [];

  // --- Environnement
  const e = data.environnement;
  const uv = e.uniteVent === "kmh" ? "km/h" : "m/s";
  const w = result.vent.value;
  const envChamps: Champ[] = champs(
    ["Vent prévu", nombre(e.ventPrevu, uv)],
    ["Vent limite de la machine", nombre(e.ventLimiteMachine, uv)],
    ["Charge à forte prise au vent", ouiNon(e.chargeFortePriseAuVent)],
    ...(e.chargeFortePriseAuVent ? ([["Vent limite de la charge", nombre(e.ventLimiteCharge, uv)]] as [string, string][]) : []),
    ["Surface au vent de la charge", nombre(data.charge.surfaceVentM2, "m²")],
    ["Marge de vent", w.margeMs === null ? TIRET : pdfTexte(`${formatNombreAuto(w.margeMs)} m/s`)],
    ["Lignes électriques / caténaires", e.lignes === "oui" ? "Oui" : e.lignes === "non" ? "Non" : TIRET],
    ...(e.lignes === "oui"
      ? ([
          ["Tension", nombre(e.ligneTensionKV, "kV")],
          ["Distance prévue", metres(e.ligneDistancePrevueM)],
          ["Distance de sécurité (seuil)", metres(e.ligneDistanceSeuilM)],
          ["Marge de distance", metres(result.ligne?.value.margeM)],
        ] as [string, string][])
      : []),
    ["Voies ferrées / circulées, survol, interférences", txt(e.voiesEtInterferences)],
  );
  const mesures: string[] = [];
  const obstTxt = (data.geometrie.obstacles ?? "").trim();
  if (obstTxt) mesures.push(`Obstacles : ${obstTxt}`);
  for (const ob of data.geometrie.obstaclesSaisis ?? []) {
    if (ob.distanceM !== null && ob.hauteurM !== null) {
      mesures.push(`Obstacle « ${ob.nom.trim() || "sans nom"} » à ${metres(ob.distanceM)} de l'axe, hauteur ${metres(ob.hauteurM)}.`);
    }
  }
  if (s.proximites.trim()) mesures.push(`Proximités au sol : ${s.proximites.trim()}`);
  if (e.voiesEtInterferences.trim()) mesures.push(`Voies et interférences : ${e.voiesEtInterferences.trim()}`);
  mesures.push(...messages([...result.vent.issues, ...(result.ligne?.issues ?? []), ...(result.sol?.issues ?? [])]));

  // --- Personnel
  const p = data.personnel;
  const personnelChamps: Champ[] = champs(
    ["Conducteur", txt(p.conducteur)],
    ["CACES", txt(p.caces)],
    ["Autorisation de conduite", ouiNon(p.autorisationConduite)],
    ["Chef de manœuvre", txt(p.chefManoeuvre)],
    ["Élingueur", txt(p.elingueur)],
    ["VGP de l'engin à jour", ouiNon(p.vgpEngin)],
    ["VGP des accessoires à jour", ouiNon(p.vgpAccessoires)],
  );

  return {
    entete: {
      titre: "ADÉQUATION DE LEVAGE",
      projet: txt(o.projet),
      reference: txt(meta.reference),
      indice: txt(meta.indice),
      date: o.date ? dateFR(o.date) : dateFR(dateIso(meta.genereLe)),
      redacteur: txt(redacteur),
      entreprise: (meta.entreprise ?? "").trim(),
      logoUrl: meta.logoUrl ?? null,
    },
    invite: meta.invite,
    mentionPermanente: MENTION_PERMANENTE,
    cadre: CADRE_REGLEMENTAIRE,
    cadreCourt: CADRE_COURT,
    genereLe: dateFR(dateIso(meta.genereLe)),
    verdict: {
      code: v.verdict,
      libelle: VERDICT_LIBELLE[v.verdict],
      couleur: style.couleur,
      fond: style.fond,
      tauxTexte: v.tauxMax === null ? "hors abaque / non calculable" : formatTaux(v.tauxMax),
      positionDefavorable: worst ? worst.label : TIRET,
      chargeTotale: chargeTotale === null ? TIRET : masse(chargeTotale),
      nbBloquants: v.bloquants.length,
      nbReserves: v.reserves.length,
    },
    abaqueAVerifier: aVerifier,
    operation: {
      champs: champs(["Projet / chantier", txt(o.projet)], ["Lieu", txt(o.lieu)], ["Date du levage", o.date ? dateFR(o.date) : TIRET], ["Rédacteur", txt(redacteur)]),
      description: txt(o.description),
      intervenants: txt(o.intervenants),
    },
    charge: {
      champs: champs(
        ["Désignation", txt(data.charge.designation)],
        ["Masse", masse(data.charge.masseKg)],
        [
          "Dimensions (L × l × h)",
          [data.charge.longueurM, data.charge.largeurM, data.charge.hauteurM].every((x) => x === null)
            ? TIRET
            : pdfTexte([data.charge.longueurM, data.charge.largeurM, data.charge.hauteurM].map((x) => (x === null ? "?" : formatNombreAuto(x))).join(" × ") + " m"),
        ],
        ["Centre de gravité", txt(data.charge.centreGravite)],
        ["Surface au vent", nombre(data.charge.surfaceVentM2, "m²")],
      ),
    },
    accessoires: {
      champs: champs(
        ["Nombre de brins", data.accessoires.nbBrins === null ? TIRET : String(data.accessoires.nbBrins)],
        ["Brins porteurs retenus", r.nbBrinsPorteurs === null ? TIRET : String(r.nbBrinsPorteurs)],
        ["Angle bêta par rapport à la verticale", nombre(data.accessoires.angleBetaDeg, "°")],
        ["Équilibrage (palonnier) déclaré", ouiNon(data.accessoires.equilibrageDeclare)],
        ["Effort par brin", masse(r.effortParBrinKg)],
      ),
      lignes: accessoiresLignes,
      calc: calcBloc("Élingage et CMU", result.elingage),
    },
    machine: {
      champs: champs(
        ["Type", txt(sel?.typeLabel)],
        ["Constructeur", txt(sel?.manufacturerName)],
        ["Modèle", txt(sel?.model)],
        ["Configuration", txt(sel?.configurationLabel)],
        ["Hauteur sous crochet nécessaire", metres(data.geometrie.hauteurSousCrochetM)],
      ),
      chargeTotale: champs(
        ["Charge", masse(data.charge.masseKg)],
        ["Accessoires", masse(data.accessoires.liste.reduce<number | null>((t, a) => (t === null || a.masseKg === null ? null : t + a.masseKg), 0))],
        ["Moufle / crochet", masse(data.machine.moufleCrochetKg)],
        ["Fléchette repliée", masse(data.machine.flechetteReplieeKg ?? 0)],
        ["Autres", masse(data.machine.autresKg ?? 0)],
        ["Charge totale", chargeTotale === null ? "non calculable" : masse(chargeTotale)],
      ),
      abaque,
    },
    schemas: construireSchemas(data, result, seuils),
    calculs,
    taux: {
      tauxMax: v.tauxMax,
      tauxTexte: v.tauxMax === null ? "—" : formatTaux(v.tauxMax),
      zone: v.zone,
      seuilVert: seuils.vert,
      seuilOrange: seuils.orange,
      lignes: tauxLignes,
    },
    sol: { champs: solChamps, resultat: solResultat, avertissements: result.sol ? [...result.sol.warnings, ...messages(result.sol.issues)] : [] },
    environnement: { champs: envChamps, mesures },
    personnel: { champs: personnelChamps },
    conclusion: {
      bloquants: messages(v.bloquants),
      reserves: messages(v.reserves),
      reservesLibres: data.reserves.liste.map((x) => pdfTexte(x.texte.trim())).filter(Boolean),
    },
    signatures: [...SIGNATAIRES],
  };
}

/** Format d'un pourcentage de seuil pour la légende de jauge. */
export const pct = (ratio: number): string => `${formatNombreFR(ratio * 100, 0)} %`;
