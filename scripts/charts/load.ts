import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { LoadChart } from "../../src/engine/types";
import { parseChartCsv } from "../../src/lib/charts/csv";
import { analyserAbaque } from "../../src/lib/charts/validate";
import { machineSchema, type ConfigurationFile, type MachineFile } from "../../src/lib/charts/schema";

export const CHARTS_DIR = path.resolve(__dirname, "../../data/charts");
export const SEED_FILE = path.resolve(__dirname, "../../supabase/seed.sql");

export interface ConfigReport {
  dir: string;
  slug: string;
  errors: string[];
  warnings: string[];
  chart?: LoadChart;
  config?: ConfigurationFile;
}

export interface MachineReport {
  dir: string;
  machine?: MachineFile;
  errors: string[]; // erreurs au niveau machine.json / dossier
  configs: ConfigReport[];
}

export interface SeedRefs {
  manufacturers: Set<string>;
  typeCodes: Set<string>;
}

/** Extrait manufacturers et machine_types du seed.sql (références valides). */
export function readSeedRefs(file = SEED_FILE): SeedRefs | null {
  if (!existsSync(file)) return null;
  const sql = readFileSync(file, "utf8");
  const manufacturers = new Set<string>();
  const m = sql.match(/insert into public\.manufacturers[\s\S]*?unnest\(array\[([\s\S]*?)\]\)/i);
  for (const s of m?.[1].matchAll(/'((?:[^']|'')+)'/g) ?? []) manufacturers.add(s[1].replace(/''/g, "'").toLowerCase());
  const typeCodes = new Set<string>();
  const t = sql.match(/insert into public\.machine_types[\s\S]*?\n(?=\s*(?:on conflict|insert|--|$))/i);
  for (const s of (t?.[0] ?? "").matchAll(/^\s*\('([a-z][a-z0-9_]*)'\s*,/gm)) typeCodes.add(s[1]);
  return { manufacturers, typeCodes };
}

export function loadMachineDir(dirPath: string, refs: SeedRefs | null = readSeedRefs()): MachineReport {
  const dir = path.basename(dirPath);
  const report: MachineReport = { dir, errors: [], configs: [] };
  if (!/^_?[a-z0-9]+(-[a-z0-9]+)*$/.test(dir)) report.errors.push("nom de dossier : <constructeur>-<modele-slug> en minuscules/tirets");
  const jsonPath = path.join(dirPath, "machine.json");
  if (!existsSync(jsonPath)) {
    report.errors.push("machine.json absent");
    return report;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(jsonPath, "utf8"));
  } catch (e) {
    report.errors.push(`machine.json : JSON invalide (${(e as Error).message})`);
    return report;
  }
  const parsed = machineSchema.safeParse(raw);
  if (!parsed.success) {
    for (const i of parsed.error.issues) report.errors.push(`machine.json ${i.path.join(".") || "(racine)"} : ${i.message}`);
    return report;
  }
  const machine = parsed.data;
  report.machine = machine;
  if (refs) {
    if (!refs.manufacturers.has(machine.manufacturer.toLowerCase())) report.errors.push(`constructeur « ${machine.manufacturer} » absent du seed`);
    if (!refs.typeCodes.has(machine.type_code)) report.errors.push(`type_code « ${machine.type_code} » absent du seed`);
  }
  const used = new Set<string>();
  for (const config of machine.configurations) {
    used.add(config.chart.file);
    report.configs.push(loadConfig(dirPath, machine, config));
  }
  for (const f of readdirSync(dirPath)) {
    if (f.endsWith(".csv") && !used.has(f)) report.errors.push(`CSV non référencé : ${f}`);
  }
  return report;
}

function loadConfig(dirPath: string, machine: MachineFile, config: ConfigurationFile): ConfigReport {
  const rep: ConfigReport = { dir: path.basename(dirPath), slug: config.slug, errors: [], warnings: [], config };
  const csvPath = path.join(dirPath, config.chart.file);
  if (!existsSync(csvPath)) {
    rep.errors.push(`CSV absent : ${config.chart.file}`);
    return rep;
  }
  const { points, errors } = parseChartCsv(readFileSync(csvPath, "utf8"), config.chart.axis_y, config.chart.unit);
  const c = config.chart;
  const r = analyserAbaque(
    {
      id: `${path.basename(dirPath)}/${config.slug}`,
      points,
      axisY: c.axis_y,
      interpolationAllowed: c.interpolation_allowed,
      standard: c.standard,
      deductionsIncluded: c.deductions_included,
      source: { title: machine.source.document_title, reference: machine.source.reference, edition: machine.source.edition, url: machine.source.url },
    },
    errors,
  );
  rep.errors.push(...r.errors);
  rep.warnings.push(...r.warnings);
  const chart = r.chart;
  rep.chart = chart;
  return rep;
}

export function listMachineDirs(root = CHARTS_DIR): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((d) => statSync(path.join(root, d)).isDirectory())
    .sort()
    .map((d) => path.join(root, d));
}

export function loadAll(root = CHARTS_DIR): MachineReport[] {
  const refs = readSeedRefs();
  return listMachineDirs(root).map((d) => loadMachineDir(d, refs));
}
