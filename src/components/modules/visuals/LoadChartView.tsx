"use client";

import { useId, useMemo, useState } from "react";

import { VERDICT, VINCI } from "@/lib/design-tokens";
import { formatNombreAuto } from "@/lib/study/format";
import { formatMasse, formatNombreFR } from "@/lib/utils";

import {
  aireSvg,
  appliquer,
  cheminSvg,
  domaineGlobal,
  graduations,
  lignesAbaque,
  lignesActives,
  tracerEscalier,
  type Echelle,
} from "./geometry";
import { couleurZone, positionSelectionnee, positionsVisuelles, type PropsVue } from "./model";

const W = 900;
const H = 460;
const M = { g: 66, d: 24, h: 24, b: 56 };

export function LoadChartView({ data, result, seuils, selectionId, onSelect }: PropsVue) {
  const [bandes, setBandes] = useState(true);
  const titreId = useId();
  const chart = data.machine.selection?.chart ?? null;
  const positions = useMemo(() => positionsVisuelles(data, result), [data, result]);
  const sel = positionSelectionnee(positions, result, selectionId);
  const charge = result.chargeTotale.value;

  const lignes = useMemo(() => (chart ? lignesAbaque(chart) : []), [chart]);
  const dom = domaineGlobal(lignes);

  if (!chart || !dom || lignes.length === 0) {
    return (
      <p role="status" className="rounded-md bg-vinci-bleu-xlight p-3 text-sm">
        Choisissez une machine et une configuration (étape 4) pour afficher la courbe de charge.
      </p>
    );
  }

  const actives = lignesActives(lignes, chart.axisY === "none" ? null : (sel?.yM ?? null));
  const uniteY = chart.axisY === "height_m" ? "hauteur" : "flèche";

  // Domaines : on étend à la portée / charge saisies (points hors abaque inclus), sans jamais prolonger la courbe.
  const portees = positions.map((p) => p.porteeM).filter((v): v is number => v !== null);
  const xMin = Math.min(0, dom.min, ...portees);
  const xMax = Math.max(dom.max, ...portees) * 1.04;
  const maxCap = Math.max(0, ...lignes.flatMap((l) => l.noeuds.map((n) => n.capacityKg ?? 0)));
  const yMax = Math.max(maxCap, charge ?? 0) * 1.08 || 1;
  const ex: Echelle = { d0: xMin, d1: xMax, r0: M.g, r1: W - M.d };
  const ey: Echelle = { d0: 0, d1: yMax, r0: H - M.b, r1: M.h };
  const base = H - M.b;

  const ticksX = graduations(xMin, xMax, 8);
  const ticksY = graduations(0, yMax / 1000, 6).map((t) => t * 1000);

  const chemins = lignes.map((l) => tracerEscalier(l.noeuds, chart.interpolationAllowed));
  const libelleLigne = (y: number | null) => (y === null ? "Courbe unique" : `${uniteY === "flèche" ? "Flèche" : "Hauteur"} ${formatNombreAuto(y)} m`);
  const indicesBandes = actives.length > 0 ? actives : lignes.length === 1 ? [0] : [];

  const resume = `Courbe de charge : ${lignes.length} ligne(s). ${positions
    .map((p) =>
      p.porteeM === null || p.capaciteKg === null
        ? `${p.nom} : non lue`
        : `${p.nom} : portée ${formatNombreAuto(p.porteeM)} m, capacité ${formatMasse(p.capaciteKg)}`,
    )
    .join(" ; ")}`;

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption id={titreId} className="text-sm font-semibold text-primary">
          Courbe de charge — capacité (t) selon la portée (m)
        </figcaption>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-5" checked={bandes} onChange={(e) => setBandes(e.target.checked)} />
          Bandes de zones ({formatNombreFR(seuils.vert * 100, 0)} % / {formatNombreFR(seuils.orange * 100, 0)} %)
        </label>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto max-h-[62vh] w-full" role="img" aria-labelledby={titreId}>
        <desc>{resume}</desc>
        <rect x="0" y="0" width={W} height={H} fill={VINCI.blanc} />
        {/* Grille et axes */}
        {ticksY.map((v) => (
          <g key={`y${v}`}>
            <line x1={M.g} x2={W - M.d} y1={appliquer(ey, v)} y2={appliquer(ey, v)} stroke={VINCI.grisLight} strokeWidth="1" />
            <text x={M.g - 8} y={appliquer(ey, v) + 5} textAnchor="end" fontSize="14" fill={VINCI.noir}>
              {formatNombreFR(v / 1000, v % 1000 === 0 ? 0 : 1)}
            </text>
          </g>
        ))}
        {ticksX.map((v) => (
          <g key={`x${v}`}>
            <line x1={appliquer(ex, v)} x2={appliquer(ex, v)} y1={M.h} y2={base} stroke={VINCI.grisLight} strokeWidth="1" />
            <text x={appliquer(ex, v)} y={base + 20} textAnchor="middle" fontSize="14" fill={VINCI.noir}>
              {formatNombreFR(v, v % 1 === 0 ? 0 : 1)}
            </text>
          </g>
        ))}
        <line x1={M.g} x2={M.g} y1={M.h} y2={base} stroke={VINCI.noir} strokeWidth="1.5" />
        <line x1={M.g} x2={W - M.d} y1={base} y2={base} stroke={VINCI.noir} strokeWidth="1.5" />
        <text x={(M.g + W - M.d) / 2} y={H - 10} textAnchor="middle" fontSize="15" fontWeight="bold" fill={VINCI.bleu}>
          Portée (m)
        </text>
        <text transform={`translate(18 ${(M.h + base) / 2}) rotate(-90)`} textAnchor="middle" fontSize="15" fontWeight="bold" fill={VINCI.bleu}>
          Capacité (t)
        </text>

        {/* Bandes de zones (courbe active) */}
        {bandes &&
          indicesBandes.map((i) =>
            chemins[i].map((ch, k) => {
              const x0 = appliquer(ex, ch[0].x);
              const x1 = appliquer(ex, ch[ch.length - 1].x);
              return (
                <g key={`b${i}-${k}`} opacity={indicesBandes.length > 1 ? 0.5 : 0.8}>
                  <rect x={x0} y={M.h} width={x1 - x0} height={base - M.h} fill={VERDICT.rougeBg} />
                  <path d={aireSvg(ch, ex, ey, seuils.orange, base)} fill={VERDICT.jauneBg} />
                  <path d={aireSvg(ch, ex, ey, seuils.vert, base)} fill={VERDICT.vertBg} />
                </g>
              );
            }),
          )}

        {/* Courbes : inactives d'abord, actives par-dessus */}
        {[false, true].map((estActive) =>
          lignes.map((l, i) => {
            const active = actives.includes(i) || (lignes.length === 1 && l.y === null);
            if (active !== estActive) return null;
            return chemins[i].map((ch, k) => {
              const d = cheminSvg(ch, ex, ey);
              const fin = ch[ch.length - 1];
              return (
                <g key={`c${i}-${k}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke={active ? VINCI.bleu : VINCI.gris}
                    strokeWidth={active ? 3.5 : 2}
                    strokeLinejoin="miter"
                    data-active={active ? "oui" : "non"}
                  />
                  {ch.length === 1 && <circle cx={appliquer(ex, ch[0].x)} cy={appliquer(ey, ch[0].c)} r="4" fill={active ? VINCI.bleu : VINCI.gris} />}
                  {k === chemins[i].length - 1 && l.y !== null && (
                    <text x={appliquer(ex, fin.x) - 4} y={appliquer(ey, fin.c) - 8} textAnchor="end" fontSize="13" fontWeight={active ? "bold" : "normal"} fill={active ? VINCI.bleu : VINCI.noir}>
                      {formatNombreAuto(l.y)} m
                    </text>
                  )}
                </g>
              );
            });
          }),
        )}

        {/* Charge totale (repère horizontal discret) */}
        {charge !== null && (
          <line x1={M.g} x2={W - M.d} y1={appliquer(ey, charge)} y2={appliquer(ey, charge)} stroke={VINCI.bleuDark} strokeDasharray="6 5" strokeWidth="1.2" opacity="0.6" />
        )}

        {/* Points de fonctionnement */}
        {charge !== null &&
          positions.map((p) => {
            if (p.porteeM === null) return null;
            const cx = appliquer(ex, p.porteeM);
            const cy = appliquer(ey, charge);
            const estSel = sel?.id === p.id;
            return (
              <g
                key={p.id}
                role="button"
                tabIndex={0}
                aria-label={`Position ${p.nom}`}
                onClick={() => onSelect(p.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(p.id)}
                className="cursor-pointer"
              >
                <title>
                  {p.nom} — portée {formatNombreAuto(p.porteeM)} m, charge totale {formatMasse(charge)}
                  {p.horsAbaque ? ", hors abaque" : p.capaciteKg !== null ? `, capacité ${formatMasse(p.capaciteKg)}` : ""}
                </title>
                <circle cx={cx} cy={cy} r="22" fill="transparent" />
                {estSel && <circle cx={cx} cy={cy} r="15" fill="none" stroke={VINCI.bleuDark} strokeWidth="2.5" />}
                <circle cx={cx} cy={cy} r="9" fill={couleurZone(p.zone)} stroke={VINCI.blanc} strokeWidth="2" />
                {p.horsAbaque && (
                  <path d={`M${cx - 4},${cy - 4} L${cx + 4},${cy + 4} M${cx + 4},${cy - 4} L${cx - 4},${cy + 4}`} stroke={VINCI.blanc} strokeWidth="2" />
                )}
                <text x={cx} y={cy - 20} textAnchor="middle" fontSize="13" fontWeight="bold" fill={VINCI.noir} paintOrder="stroke" stroke={VINCI.blanc} strokeWidth="4">
                  {p.nom}
                </text>
              </g>
            );
          })}
      </svg>

      {/* Légende */}
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {lignes.map((l, i) => {
          const active = actives.includes(i) || lignes.length === 1;
          return (
            <li key={i} className="flex items-center gap-2">
              <span className="inline-block h-1 w-6" style={{ background: active ? VINCI.bleu : VINCI.gris, height: active ? 4 : 2 }} aria-hidden />
              <span className={active ? "font-semibold" : ""}>
                {libelleLigne(l.y)}
                {active && lignes.length > 1 ? " (active)" : ""}
              </span>
            </li>
          );
        })}
        {([["vert", "taux sous le seuil vert"], ["orange", "zone orange"], ["rouge", "au-delà / hors abaque"]] as const).map(([z, t]) => (
          <li key={z} className="flex items-center gap-2">
            <span className="inline-block size-3 rounded-full" style={{ background: couleurZone(z) }} aria-hidden />
            {t}
          </li>
        ))}
      </ul>
      <p className="text-xs text-foreground/70">
        Tracé en escalier : entre deux nœuds de l&apos;abaque on retient la valeur la plus défavorable
        {chart.interpolationAllowed ? " (interpolation autorisée par le constructeur : segments droits)" : ""} ; aucune extrapolation
        au-delà des nœuds. Points : charge totale à la portée de chaque position
        {charge === null ? " (charge totale non calculable)" : ` (${formatMasse(charge)})`}.
      </p>
    </figure>
  );
}
