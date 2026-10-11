"use client";

import { useMemo } from "react";

import { VINCI } from "@/lib/design-tokens";
import { formatNombreAuto } from "@/lib/study/format";
import { formatNombreFR } from "@/lib/utils";

import { domaineGlobal, ecartAngulaire, graduations, lignesAbaque, polaire } from "./geometry";
import { couleurZone, positionsVisuelles, type PropsVue } from "./model";

const W = 640;
const H = 560;
const CX = W / 2;
const CY = H / 2 + 6;
const R_MAX_PX = 232;
/** Angles de repli (indicatifs) lorsque la direction d'une position n'est pas saisie. */
const ANGLE_REPLI = (i: number) => -50 + 50 * i;

export function PlanView({ data, result, selectionId, onSelect }: PropsVue) {
  const chart = data.machine.selection?.chart ?? null;
  const positions = useMemo(() => positionsVisuelles(data, result), [data, result]);
  const calage = data.machine.selection?.calage ?? null;
  const dom = useMemo(() => (chart ? domaineGlobal(lignesAbaque(chart)) : null), [chart]);

  const portees = positions.map((p) => p.porteeM).filter((v): v is number => v !== null);
  const rMax = Math.max(dom?.max ?? 0, ...portees, calage ? Math.max(calage.longueurM, calage.largeurM) / 2 : 0, 1) * 1.05;
  const px = R_MAX_PX / rMax;

  const placees = positions.map((p, i) => {
    const manuel = p.angleDeg !== null;
    const a = p.angleDeg ?? ANGLE_REPLI(i);
    const pt = p.porteeM === null ? null : polaire(a, p.porteeM * px);
    return { ...p, manuel, a, pt };
  });
  const avecAngle = placees.filter((p) => p.manuel && p.porteeM !== null);
  const prise = avecAngle[0];
  const pose = avecAngle.length >= 2 ? avecAngle[avecAngle.length - 1] : null;
  const sansAngle = placees.some((p) => p.porteeM !== null && !p.manuel);

  let secteur: { d: string; arcs: string[] } | null = null;
  if (prise && pose) {
    const delta = ecartAngulaire(prise.a, pose.a);
    const sweep = delta > 0 ? 1 : 0;
    const large = Math.abs(delta) > 180 ? 1 : 0;
    const rOut = Math.max(prise.porteeM as number, pose.porteeM as number) * px;
    const s0 = polaire(prise.a, rOut);
    const s1 = polaire(pose.a, rOut);
    const arc = (r: number) => {
      const a0 = polaire(prise.a, r);
      const a1 = polaire(pose.a, r);
      return `M${CX + a0.x},${CY + a0.y} A${r},${r} 0 ${large} ${sweep} ${CX + a1.x},${CY + a1.y}`;
    };
    secteur = {
      d: `M${CX},${CY} L${CX + s0.x},${CY + s0.y} A${rOut},${rOut} 0 ${large} ${sweep} ${CX + s1.x},${CY + s1.y} Z`,
      arcs: [arc((prise.porteeM as number) * px), arc((pose.porteeM as number) * px)],
    };
  }
  const ticks = graduations(0, rMax, 5).filter((t) => t > 0);

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-sm font-semibold text-primary">Vue en plan — rayon de giration, balayage et emprise</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-h-[62vh] max-w-[44rem] self-center" role="group" aria-label="Vue en plan du levage">
        <rect x="0" y="0" width={W} height={H} fill={VINCI.blanc} />
        {ticks.map((t) => (
          <g key={t}>
            <circle cx={CX} cy={CY} r={t * px} fill="none" stroke={VINCI.tableBorder} strokeWidth="1" />
            <text x={CX + 4} y={CY + t * px + 13} fontSize="12" fill={VINCI.noir}>
              {formatNombreFR(t, 0)} m
            </text>
          </g>
        ))}
        {dom && (
          <>
            <circle cx={CX} cy={CY} r={dom.max * px} fill="none" stroke={VINCI.bleu} strokeWidth="1.5" strokeDasharray="2 5" />
            <text x={CX - 6} y={CY + dom.max * px + 14} textAnchor="end" fontSize="12" fill={VINCI.bleu}>
              portée max. abaque {formatNombreAuto(dom.max)} m
            </text>
          </>
        )}

        {/* Emprise des stabilisateurs */}
        {calage && (
          <g>
            <rect x={CX - (calage.largeurM * px) / 2} y={CY - (calage.longueurM * px) / 2} width={calage.largeurM * px} height={calage.longueurM * px} fill="none" stroke={VINCI.rougeDark} strokeWidth="2.5" strokeDasharray="8 4" />
            <text x={CX + (calage.largeurM * px) / 2 + 6} y={CY + (calage.longueurM * px) / 2} fontSize="12" fill={VINCI.rougeDark}>
              calage {formatNombreAuto(calage.longueurM)} × {formatNombreAuto(calage.largeurM)} m
            </text>
          </g>
        )}

        {/* Balayage entre prise et pose */}
        {secteur && (
          <g data-testid="balayage">
            <path d={secteur.d} fill={VINCI.bleuXLight} opacity="0.75" stroke="none" />
            {secteur.arcs.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={VINCI.bleu} strokeWidth="3" />
            ))}
            <path d={`M${CX},${CY} L${CX + polaire(prise.a, prise.porteeM! * px).x},${CY + polaire(prise.a, prise.porteeM! * px).y}`} stroke={VINCI.bleu} strokeWidth="1.5" />
            <path d={`M${CX},${CY} L${CX + polaire(pose!.a, pose!.porteeM! * px).x},${CY + polaire(pose!.a, pose!.porteeM! * px).y}`} stroke={VINCI.bleu} strokeWidth="1.5" />
          </g>
        )}

        {/* Cercles de portée et positions */}
        {placees.map((p) =>
          p.pt === null ? null : (
            <g key={p.id}>
              <circle cx={CX} cy={CY} r={(p.porteeM as number) * px} fill="none" stroke={couleurZone(p.zone)} strokeWidth="1.8" strokeDasharray="6 4" />
              <g
                role="button"
                tabIndex={0}
                aria-label={`Position ${p.nom}, portée ${formatNombreAuto(p.porteeM as number)} m`}
                className="cursor-pointer"
                onClick={() => onSelect(p.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(p.id)}
              >
                <circle cx={CX + p.pt.x} cy={CY + p.pt.y} r="22" fill="transparent" />
                {selectionId === p.id && <circle cx={CX + p.pt.x} cy={CY + p.pt.y} r="16" fill="none" stroke={VINCI.bleuDark} strokeWidth="2.5" />}
                <circle cx={CX + p.pt.x} cy={CY + p.pt.y} r="10" fill={p.manuel ? couleurZone(p.zone) : VINCI.blanc} stroke={couleurZone(p.zone)} strokeWidth="3" />
                <text x={CX + p.pt.x} y={CY + p.pt.y - 18} textAnchor="middle" fontSize="13" fontWeight="bold" fill={VINCI.noir} paintOrder="stroke" stroke={VINCI.blanc} strokeWidth="4">
                  {p.nom} · {formatNombreAuto(p.porteeM as number)} m
                </text>
              </g>
            </g>
          ),
        )}

        {/* Axe de rotation et nord du plan */}
        <circle cx={CX} cy={CY} r="9" fill={VINCI.bleuDark} />
        <line x1={CX - 14} x2={CX + 14} y1={CY} y2={CY} stroke={VINCI.blanc} strokeWidth="2" />
        <line x1={CX} x2={CX} y1={CY - 14} y2={CY + 14} stroke={VINCI.blanc} strokeWidth="2" />
        <text x={CX + 14} y={CY + 24} fontSize="12" fill={VINCI.noir}>
          axe de rotation
        </text>
        <g transform={`translate(${W - 40} 44)`}>
          <path d="M0,18 L0,-18 M-8,-8 L0,-18 L8,-8" stroke={VINCI.noir} strokeWidth="2" fill="none" />
          <text x="0" y="36" textAnchor="middle" fontSize="12" fill={VINCI.noir}>
            0°
          </text>
        </g>
        {!calage && (
          <g>
            <rect x="12" y="12" width="260" height="46" rx="4" fill={VINCI.grisLight} stroke={VINCI.gris} />
            <text x="22" y="32" fontSize="12" fill={VINCI.noir}>
              Emprise des stabilisateurs masquée :
            </text>
            <text x="22" y="48" fontSize="12" fill={VINCI.noir}>
              dimensions de calage non disponibles.
            </text>
          </g>
        )}
      </svg>
      <p className="text-xs text-foreground/70">
        Angles : 0° = haut du plan, sens horaire (saisis à l&apos;étape 5).
        {!secteur && " Arc de balayage affiché dès que l'angle de la prise et celui de la pose sont saisis."}
        {sansAngle && " Les positions sans angle saisi sont posées à titre indicatif sur leur cercle (pastille creuse)."}
        {secteur && " Le balayage suit l'arc le plus court entre la première et la dernière position."}
      </p>
    </figure>
  );
}
