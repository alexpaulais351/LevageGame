import { loadAll } from "./load";

const reports = loadAll();
let failed = false;
if (reports.length === 0) console.log("Aucun dossier dans data/charts.");
for (const r of reports) {
  for (const e of r.errors) {
    failed = true;
    console.log(`ERREUR  ${r.dir} : ${e}`);
  }
  for (const c of r.configs) {
    const status = c.errors.length ? "ERREUR" : c.warnings.length ? "WARN  " : "OK    ";
    if (c.errors.length) failed = true;
    const detail = [...c.errors.map((e) => `E: ${e}`), ...c.warnings.map((w) => `W: ${w}`)];
    console.log(`${status}  ${r.dir}/${c.slug}${detail.length ? `\n          ${detail.join("\n          ")}` : ""}`);
  }
}
console.log(failed ? "\ncharts:check ÉCHEC" : "\ncharts:check OK");
process.exit(failed ? 1 : 0);
