/** Planche SVG des engins (vue de profil) : `npm run engins:planche` → docs/engins/<type>.svg. */
import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { FormesSvg } from "@/components/modules/visuals/SilhouetteSvg";
import { VEHICULES } from "@/lib/transport/catalogue";
import { formesVehicule } from "@/lib/visuals/vehicules";
import { projeter, silhouetteElevation, formesCrochet, TYPES_MACHINE, LIBELLE_TYPE, type TypeMachine } from "@/lib/visuals/silhouettes";

const out = process.argv[2] ?? "docs/engins";
const poses: Record<TypeMachine, { x: number; y: number }> = {
  grue_mobile: { x: 12, y: 18 }, grue_mobile_chenilles: { x: 14, y: 26 }, grue_tour: { x: 18, y: 22 }, grue_auxiliaire: { x: 7, y: 7 },
  telescopique_fixe: { x: 5, y: 6 }, telescopique_rotatif: { x: 7, y: 9 }, pelle_pneus: { x: 5, y: 2.5 }, pelle_chenilles: { x: 5.5, y: 3 },
  pelle_rail_route: { x: 5, y: 2.5 }, chariot_elevateur: { x: 1.5, y: 1.4 },
};
const cartes = TYPES_MACHINE.map((t) => {
  const W = 900, H = 520;
  const sil = silhouetteElevation({ type: t, tete: poses[t], accessoire: t.startsWith("telescopique") ? "fourches" : null });
  const b = sil.bornes;
  const s = Math.min((W - 60) / (b.maxX - b.minX), (H - 60) / (b.maxY - Math.min(0, b.minY) + 1.5));
  const ox = 30 - b.minX * s, oy = H - 30;
  const formes = projeter(sil.formes, { ox, oy, s, flipY: true });
  const croc = !sil.sansCable ? projeter(formesCrochet(sil.tete[0], sil.tete[1] - 2), { ox, oy, s, flipY: true }) : [];
  const [tx, ty] = [ox + sil.tete[0] * s, oy - sil.tete[1] * s];
  const svg = renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <rect width={W} height={H} fill="#fff" />
      <line x1="0" x2={W} y1={oy} y2={oy} stroke="#000" strokeWidth="1.5" />
      <FormesSvg formes={formes} prefixe={`p-${t}`} />
      {!sil.sansCable && <line x1={tx} y1={ty} x2={tx} y2={oy - (sil.tete[1] - 2) * s} stroke="#000" strokeWidth="1" />}
      <FormesSvg formes={croc} prefixe={`c-${t}`} />
      <text x="12" y="22" fontSize="16" fontFamily="Arial" fill="#004489" fontWeight="bold">{LIBELLE_TYPE[t]}</text>
    </svg>,
  );
  writeFileSync(`${out}/${t}.svg`, svg);
  return t;
});
// Véhicules de transport (plateau de base, pièce indicative)
for (const v of VEHICULES) {
  const W = 900, H = 260;
  const L = v.longueurHorsPlateauM + v.plateauM;
  const s = Math.min((W - 40) / L, (H - 50) / 4.3);
  const formes = projeter(formesVehicule(v, v.plateauM, 2), { ox: 20, oy: H - 20, s, flipY: true });
  const svg = renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <rect width={W} height={H} fill="#fff" />
      <line x1="0" x2={W} y1={H - 20} y2={H - 20} stroke="#000" strokeWidth="1.5" />
      <FormesSvg formes={formes} prefixe={`v-${v.id}`} />
      <text x="12" y="22" fontSize="16" fontFamily="Arial" fill="#004489" fontWeight="bold">{v.nom}</text>
    </svg>,
  );
  writeFileSync(`${out}/transport-${v.id}.svg`, svg);
}
console.log(`${cartes.length} engins et ${VEHICULES.length} véhicules → ${out}`);
