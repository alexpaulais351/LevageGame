/**
 * `npm run exemples:sql` : régénère les modèles des projets d'exemple (D30).
 *  - à jour  : la dernière migration *_projets_exemples_modeles.sql a le même contenu (pour la table qu'elle
 *              cible : 20261011000800 remplit la v1, recopiée dans la v2 par 20261011000900) → rien n'est écrit ;
 *  - sinon   : écrit une NOUVELLE migration datée, ciblant private.modeles_exemples_v2 (les migrations déjà
 *              appliquées ne sont jamais modifiées) ;
 *  - `--sortie <fichier>` : écrit à cet emplacement (ex. réécriture d'une migration pas encore appliquée).
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

import { construireModeles, derniereMigrationModeles, genererSql, lireFichier, MIGRATIONS_DIR, sqlAttendu, SUFFIXE_MIGRATION } from "./modeles";

const args = process.argv.slice(2);
const iSortie = args.indexOf("--sortie");
const modeles = construireModeles();
const sql = genererSql(modeles);
for (const p of modeles) for (const e of p.etudes) console.log(`${p.nom.slice(0, 50).padEnd(50)} ${e.reference} ${e.model} ${e.slug}`);

if (iSortie >= 0) {
  const out = path.resolve(args[iSortie + 1] ?? "");
  writeFileSync(out, sql);
  console.log(`Écrit : ${path.relative(process.cwd(), out)}`);
} else {
  const derniere = derniereMigrationModeles();
  const contenu = derniere ? lireFichier(derniere) : null;
  if (derniere && contenu !== null && contenu === sqlAttendu(modeles, contenu)) {
    console.log(`Modèles à jour (${path.basename(derniere)}).`);
  } else {
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, "0");
    const ts = `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}`;
    const out = path.join(MIGRATIONS_DIR, `${ts}${SUFFIXE_MIGRATION}`);
    writeFileSync(out, sql);
    console.log(`Nouvelle migration : supabase/migrations/${path.basename(out)} (à appliquer en production).`);
  }
}
