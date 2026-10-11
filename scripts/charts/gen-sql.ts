import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadAll } from "./load";
import { generateSql } from "./sql";

const reports = loadAll().filter((r) => !r.dir.startsWith("_"));
const bad = reports.filter((r) => r.errors.length || r.configs.some((c) => c.errors.length));
if (bad.length) {
  console.error(`charts:sql annulé : erreurs dans ${bad.map((b) => b.dir).join(", ")} (lancer npm run charts:check)`);
  process.exit(1);
}
const { sql, machines } = generateSql(reports);
const out = path.resolve(__dirname, "../../supabase/seed/charts.sql");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, sql);
console.log(`supabase/seed/charts.sql écrit (${machines} machine(s)).`);
