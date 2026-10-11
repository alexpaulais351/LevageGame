/**
 * Modèles des projets d'exemple (D30) : données de saisie (etudes.ts) + abaque du catalogue (data/charts)
 * + résultat calculé par le moteur ACTUEL. Les identifiants de la base et le nom du rédacteur ne sont
 * connus qu'au moment de la création : ils sont remplacés par des marqueurs `@@...@@`, substitués par
 * `private.creer_exemples` (SQL). Marqueurs d'identifiant (`*_ID`, uuid) : substitués partout, y compris
 * dans un texte (« Abaque <id> — … ») ; marqueurs de texte : uniquement s'ils forment une chaîne JSON entière
 * (la valeur est alors échappée en JSON).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { ChartPoint, LoadChart } from "../../src/engine/types";
import { payloadVersion, jsonStable, donneesDepuisVersion, type Json } from "../../src/lib/account/version";
import { computeStudy } from "../../src/lib/study/compute";
import { loadAll, type MachineReport } from "../charts/load";
import { ETUDES, PROJETS, type ConfigCatalogue, type EtudeExemple } from "./etudes";

/** Marqueurs substitués en SQL (clé = nom du marqueur, sans les @@). */
export const MARQUEURS = [
  "TYPE_ID",
  "TYPE_LABEL",
  "FABRICANT_ID",
  "FABRICANT_NOM",
  "MACHINE_ID",
  "MODELE",
  "CONFIG_ID",
  "CONFIG_LABEL",
  "ABAQUE_ID",
  "ABAQUE_STATUT",
  "REDACTEUR",
] as const;
export type Marqueur = (typeof MARQUEURS)[number];
const m = (k: Marqueur) => `@@${k}@@`;
/** Marqueur d'identifiant (uuid : aucun caractère à échapper). */
export const estMarqueurId = (k: Marqueur) => k.endsWith("_ID");

export const STATUTS = ["a_verifier", "verifie"] as const;
export type StatutAbaque = (typeof STATUTS)[number];

export interface EtudeModele {
  reference: string;
  titre: string;
  model: string;
  slug: string;
  /** Empreinte de l'abaque (même formule que `private.empreinte_abaque`). */
  md5: string;
  data: Json;
  /** Résultat du moteur selon le statut de l'abaque en base (seul le texte de source diffère). */
  result: Record<StatutAbaque, Json>;
}
export interface ProjetModele {
  ordre: number;
  nom: string;
  adresse: string;
  client: string;
  etudes: EtudeModele[];
}

export const MIGRATIONS_DIR = path.resolve(__dirname, "../../supabase/migrations");
export const SUFFIXE_MIGRATION = "_projets_exemples_modeles.sql";
/** Table lue par private.creer_exemples depuis la migration 20261011000900 (v1 corrompue en production). */
export const TABLE_MODELES = "private.modeles_exemples_v2";
/** Table des migrations de modèles antérieures à la 0900 (20261011000800). */
export const TABLE_MODELES_V1 = "private.modeles_exemples";

/**
 * Abaque tel que l'application le lit en base (`mapChartRow`) : nœuds vides non stockés,
 * y = null sans axe Y, tri (x, y), source et norme « ?? "" ».
 */
export function abaqueCatalogue(reports: MachineReport[], cfg: ConfigCatalogue): LoadChart {
  const machine = reports.find((r) => !r.dir.startsWith("_") && r.machine?.model.toLowerCase() === cfg.model.toLowerCase());
  const conf = machine?.configs.find((c) => c.slug === cfg.slug);
  if (!machine?.machine || !conf?.chart || !conf.config || conf.errors.length || machine.errors.length) {
    throw new Error(`Configuration ${cfg.model} / ${cfg.slug} absente ou invalide dans data/charts (npm run charts:check).`);
  }
  const ch = conf.config.chart;
  const s = machine.machine.source;
  const points: ChartPoint[] = conf.chart.points
    .filter((p) => p.capacityKg !== null)
    .map((p) => ({ x: p.x, y: ch.axis_y === "none" ? null : (p.y ?? 0), capacityKg: p.capacityKg }))
    .sort((a, b) => a.x - b.x || (a.y ?? 0) - (b.y ?? 0));
  return {
    id: m("ABAQUE_ID"),
    axisX: "radius_m",
    axisY: ch.axis_y,
    points,
    interpolationAllowed: ch.interpolation_allowed,
    status: m("ABAQUE_STATUT") as LoadChart["status"],
    standard: ch.standard ?? "",
    source: { title: s.document_title, reference: s.reference ?? "", edition: s.edition ?? "", url: s.url ?? "" },
    deductionsIncluded: ch.deductions_included,
  };
}

/**
 * Empreinte md5 d'un abaque : métadonnées + nœuds (x, y au cm, capacité au 0,1 kg), triés.
 * Doit rester identique à `private.empreinte_abaque(uuid)` (migration 20261011000700).
 */
export function empreinteAbaque(c: LoadChart): string {
  const meta = [c.standard, c.source.title, c.source.reference, c.source.edition, c.source.url, c.axisY, c.interpolationAllowed, c.deductionsIncluded].join("|");
  const pts = c.points
    .map((p) => ({ x: Math.round(p.x * 100), y: Math.round((p.y ?? 0) * 100), c: Math.round((p.capacityKg ?? 0) * 10) }))
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .map((p) => `${p.x},${p.y},${p.c}`)
    .join(";");
  return createHash("md5").update(`${meta}#${pts}`).digest("hex");
}

/** Substitution des marqueurs dans un texte JSON — équivalent TS de `private.creer_exemples`. */
export function substituer(texte: string, valeurs: Record<Marqueur, string>): string {
  let t = texte;
  for (const k of MARQUEURS) {
    t = estMarqueurId(k) ? t.split(m(k)).join(valeurs[k]) : t.split(JSON.stringify(m(k))).join(JSON.stringify(valeurs[k]));
  }
  return t;
}

/** Valeurs d'essai (contrôles du générateur et tests). */
export function valeursEssai(statut: StatutAbaque, redacteur = "Jeanne d'Essai \"Test\""): Record<Marqueur, string> {
  return {
    TYPE_ID: "00000000-0000-4000-8000-000000000001",
    TYPE_LABEL: "Type d'essai",
    FABRICANT_ID: "00000000-0000-4000-8000-000000000002",
    FABRICANT_NOM: "Fabricant d'essai",
    MACHINE_ID: "00000000-0000-4000-8000-000000000003",
    MODELE: "Modèle d'essai",
    CONFIG_ID: "00000000-0000-4000-8000-000000000004",
    CONFIG_LABEL: "Configuration « essai » – 1",
    ABAQUE_ID: "00000000-0000-4000-8000-000000000005",
    ABAQUE_STATUT: statut,
    REDACTEUR: redacteur,
  };
}

function etudeModele(reports: MachineReport[], e: EtudeExemple): EtudeModele {
  const chart = abaqueCatalogue(reports, e.config);
  const data = structuredClone(e.data);
  data.operation.redacteur = m("REDACTEUR");
  data.machine.selection = {
    typeId: m("TYPE_ID"),
    typeLabel: m("TYPE_LABEL"),
    manufacturerId: m("FABRICANT_ID"),
    manufacturerName: m("FABRICANT_NOM"),
    machineId: m("MACHINE_ID"),
    model: m("MODELE"),
    configurationId: m("CONFIG_ID"),
    configurationLabel: m("CONFIG_LABEL"),
    chart,
  };
  const pay = payloadVersion(data, computeStudy(data));
  const dataTxt = JSON.stringify(pay.data);
  // Le texte de source de l'abaque inclut son statut (« — statut : à vérifier / vérifié ») : un résultat par statut,
  // choisi en SQL selon le statut lu en base. Le verdict, lui, n'en dépend pas (D29) : contrôlé ci-dessous.
  const result = {} as Record<StatutAbaque, Json>;
  for (const statut of STATUTS) {
    const d = structuredClone(data);
    d.machine.selection!.chart!.status = statut;
    const etude = computeStudy(d);
    if (!etude.completude.every(Boolean)) throw new Error(`${e.projet}/${e.reference} : étapes incomplètes ${JSON.stringify(etude.completude)}`);
    result[statut] = payloadVersion(d, etude).result;
  }
  if (resumeVerdict(result.a_verifier) !== resumeVerdict(result.verifie)) {
    throw new Error(`${e.projet}/${e.reference} : le verdict dépend du statut de l'abaque (contraire à D29).`);
  }
  // Marqueurs de texte : uniquement des chaînes JSON entières (sinon la substitution serait incomplète).
  for (const k of MARQUEURS.filter((x) => !estMarqueurId(x))) {
    for (const txt of [dataTxt, ...STATUTS.map((st) => JSON.stringify(result[st]))]) {
      if (txt.split(m(k)).length !== txt.split(JSON.stringify(m(k))).length) {
        throw new Error(`${e.projet}/${e.reference} : marqueur ${k} inclus dans une chaîne plus longue.`);
      }
    }
  }
  // Le résultat stocké doit être exactement celui que l'application recalcule une fois les marqueurs substitués.
  for (const statut of STATUTS) {
    const v = valeursEssai(statut);
    const donnees = donneesDepuisVersion(JSON.parse(substituer(dataTxt, v)));
    const attendu = jsonStable(payloadVersion(donnees, computeStudy(donnees)).result);
    if (attendu !== jsonStable(JSON.parse(substituer(JSON.stringify(result[statut]), v)))) {
      throw new Error(`${e.projet}/${e.reference} : le résultat stocké diffère du recalcul (statut ${statut}).`);
    }
  }
  return { reference: e.reference, titre: e.titre, model: e.config.model, slug: e.config.slug, md5: empreinteAbaque(chart), data: pay.data, result };
}

export function construireModeles(reports: MachineReport[] = loadAll()): ProjetModele[] {
  return PROJETS.map((p, i) => {
    const etudes = ETUDES.filter((e) => e.projet === p.cle).map((e) => etudeModele(reports, e));
    if (!etudes.length) throw new Error(`Projet ${p.cle} sans étude.`);
    return { ordre: i + 1, nom: p.nom, adresse: p.adresse, client: p.client, etudes };
  });
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
function dollar(tag: string, s: string): string {
  if (s.includes(`$${tag}$`)) throw new Error(`balise $${tag}$ présente dans le contenu`);
  return `$${tag}$${s}$${tag}$`;
}

export function genererSql(modeles: ProjetModele[], table: string = TABLE_MODELES): string {
  const lignes = modeles.map(
    (p) => `  (${p.ordre}, ${q(p.nom)}, ${q(p.adresse)}, ${q(p.client)},\n   ${dollar(`ex${p.ordre}`, JSON.stringify(p.etudes))}::jsonb)`,
  );
  const resume = modeles.flatMap((p) => p.etudes.map((e) => `--   ${p.ordre}. ${e.reference} ${e.model} ${e.slug} md5 ${e.md5} → ${resumeVerdict(e.result.a_verifier)}`));
  return [
    "-- =====================================================================",
    "-- GÉNÉRÉ par `npm run exemples:sql` (scripts/exemples) — NE PAS ÉDITER.",
    "-- Modèles des projets d'exemple créés à la validation de chaque compte (D30).",
    `-- Remplacement complet et idempotent du contenu de ${table}.`,
    "-- data / result calculés par le moteur du dépôt ; marqueurs @@...@@ substitués par private.creer_exemples.",
    ...resume,
    "-- =====================================================================",
    `delete from ${table};`,
    `insert into ${table} (ordre, nom, adresse, client, etudes) values`,
    lignes.join(",\n") + ";",
    "",
  ].join("\n");
}

/** Verdict + codes des points bloquants et des réserves. */
export function resumeVerdict(result: Json): string {
  const v = (result as { verdict?: { value?: { bloquants?: { code: string }[]; reserves?: { code: string }[] } } })?.verdict?.value;
  const codes = (l?: { code: string }[]) => (l ?? []).map((i) => i.code).join(",");
  return `${verdictDe(result)} bloquants[${codes(v?.bloquants)}] réserves[${codes(v?.reserves)}]`;
}

export function verdictDe(result: Json): string {
  return String((result as { verdict?: { value?: { verdict?: string } } })?.verdict?.value?.verdict ?? "?");
}

/** Dernière migration de modèles (ordre lexicographique = ordre d'application), ou null. */
export function derniereMigrationModeles(dir = MIGRATIONS_DIR): string | null {
  const f = readdirSync(dir)
    .filter((n) => n.endsWith(SUFFIXE_MIGRATION))
    .sort()
    .at(-1);
  return f ? path.join(dir, f) : null;
}

/** Table ciblée par une migration de modèles générée (ligne « delete from … ; »), ou null. */
export function tableDeMigration(sql: string): string | null {
  return /^delete from (private\.[a-z_0-9]+);$/m.exec(sql)?.[1] ?? null;
}

/** SQL attendu pour une migration existante : même table que celle qu'elle cible (0800 : v1). */
export function sqlAttendu(modeles: ProjetModele[], contenuMigration: string): string {
  return genererSql(modeles, tableDeMigration(contenuMigration) ?? TABLE_MODELES);
}

export function lireFichier(p: string): string {
  return readFileSync(p, "utf8");
}
