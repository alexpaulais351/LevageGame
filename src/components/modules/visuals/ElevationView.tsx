"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { VINCI } from "@/lib/design-tokens";
import { formatNombreAuto, formatTaux } from "@/lib/study/format";
import { formatMasse, formatNombreFR } from "@/lib/utils";

import {
  HAUTEUR_PIED_DEFAUT_M,
  angleFlecheDeg,
  aimanter,
  borner,
  domaineDeplacement,
  graduations,
  hauteurTeteM,
  lignesAbaque,
  pointeurVersPortee,
} from "./geometry";
import { couleurZone, positionSelectionnee, positionsVisuelles, type PropsVue } from "./model";

const W = 900;
const H = 440;
const PAD = { g: 40, d: 30, h: 30, b: 62 };
const PAS_M = 0.1;
/** Valeurs par défaut du schéma (indicatives) lorsque la donnée n'est pas saisie. */
const CHARGE_LARGEUR_DEFAUT_M = 1.5;
const CHARGE_HAUTEUR_DEFAUT_M = 1;
const OBSTACLE_LARGEUR_M = 0.8;

export function ElevationView({ data, result, selectionId, onPortee }: PropsVue) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [largeurPx, setLargeurPx] = useState(W);
  const [aimant, setAimant] = useState(true);
  const [glisse, setGlisse] = useState(false);
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const maj = () => setLargeurPx(el.getBoundingClientRect().width || W);
    maj();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const chart = data.machine.selection?.chart ?? null;
  const positions = useMemo(() => positionsVisuelles(data, result), [data, result]);
  const sel = positionSelectionnee(positions, result, selectionId);
  const lignes = useMemo(() => (chart ? lignesAbaque(chart) : []), [chart]);
  const domaine = useMemo(() => domaineDeplacement(lignes, chart?.axisY === "none" ? null : (sel?.yM ?? null)), [lignes, chart, sel?.yM]);

  if (!sel) {
    return (
      <p role="status" className="rounded-md bg-vinci-bleu-xlight p-3 text-sm">
        Ajoutez une position de levage (étape 5) pour afficher le schéma en élévation.
      </p>
    );
  }

  const axeY = chart?.axisY ?? "none";
  const g = data.geometrie;
  const c = data.charge;
  const hPied = HAUTEUR_PIED_DEFAUT_M;
  const r = sel.porteeM ?? domaine?.min ?? 0;

  // Flèche : longueur connue ⇒ angle géométrique ; hauteur d'abaque ⇒ tête à cette hauteur ; sinon indicatif.
  const longueur = axeY === "boom_length_m" ? sel.yM : null;
  const hTete = hauteurTeteM(r, longueur);
  const angle = angleFlecheDeg(r, longueur);
  let teteY: number;
  let teteIndicative = false;
  if (hTete !== null) teteY = hPied + hTete;
  else if (axeY === "height_m" && sel.yM !== null) teteY = sel.yM;
  else {
    teteY = (g.hauteurSousCrochetM ?? 6) + 2;
    teteIndicative = true;
  }
  teteY = Math.max(teteY, hPied + 1);

  const chargeL = c.longueurM ?? CHARGE_LARGEUR_DEFAUT_M;
  const chargeH = c.hauteurM ?? CHARGE_HAUTEUR_DEFAUT_M;
  const chargeIndicative = c.longueurM === null || c.hauteurM === null;
  const elingueM = 0.8;
  let crochetY = g.hauteurSousCrochetM ?? chargeH + elingueM;
  crochetY = Math.min(Math.max(crochetY, chargeH + elingueM), teteY - 0.6);
  const crochetIndicatif = g.hauteurSousCrochetM === null;

  const obstacles = (g.obstaclesSaisis ?? []).filter((o) => o.distanceM !== null && o.hauteurM !== null);
  const xMin = -4.5;
  const xMax = Math.max(domaine?.max ?? 0, r, ...obstacles.map((o) => (o.distanceM ?? 0) + OBSTACLE_LARGEUR_M)) + 2.5;
  const yMax = Math.max(teteY, ...obstacles.map((o) => o.hauteurM ?? 0)) + 1.5;
  const s = Math.min((W - PAD.g - PAD.d) / (xMax - xMin), (H - PAD.h - PAD.b) / yMax);
  const sx = (m: number) => PAD.g + (m - xMin) * s;
  const sy = (m: number) => H - PAD.b - m * s;
  const xPivot = sx(0);

  const peutGlisser = domaine !== null;
  const rayonCible = (24 * W) / Math.max(largeurPx, 1); // cible ≥ 48 px de diamètre à l'écran

  const depuisPointeur = (clientX: number) => {
    const el = svgRef.current;
    if (!el || !domaine) return;
    const rect = el.getBoundingClientRect();
    onPortee(
      sel.id,
      pointeurVersPortee({
        clientX,
        rectLeft: rect.left,
        rectWidth: rect.width,
        viewBoxWidth: W,
        xPivotSvg: xPivot,
        echelle: s,
        domaine,
        pas: aimant ? PAS_M : null,
      }),
    );
  };

  const ticks = graduations(0, xMax, 8);
  const couleur = couleurZone(sel.zone);
  const hookX = sx(r);
  const hookTopY = sy(crochetY);
  const teteX = sx(r);
  const tetePy = sy(teteY);
  const piedY = sy(hPied);

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-sm font-semibold text-primary">Élévation — déplacez le crochet pour modifier la portée</figcaption>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-5" checked={aimant} onChange={(e) => setAimant(e.target.checked)} />
          Aimanter au pas de 0,1 m
        </label>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto max-h-[62vh] w-full select-none"
        role="group"
        aria-label={`Schéma en élévation de la position ${sel.nom}, portée ${formatNombreAuto(r)} m`}
      >
        <rect x="0" y="0" width={W} height={H} fill={VINCI.blanc} />
        {/* Sol et graduations de portée */}
        <rect x={PAD.g - 20} y={sy(0)} width={W - PAD.g - PAD.d + 40} height={H - sy(0) - 20} fill={VINCI.grisLight} />
        <line x1={PAD.g - 20} x2={W - PAD.d + 20} y1={sy(0)} y2={sy(0)} stroke={VINCI.noir} strokeWidth="2" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={sy(0)} y2={sy(0) + 6} stroke={VINCI.noir} />
            <text x={sx(t)} y={sy(0) + 22} textAnchor="middle" fontSize="13" fill={VINCI.noir}>
              {formatNombreFR(t, 0)}
            </text>
          </g>
        ))}
        <text x={W - PAD.d} y={sy(0) + 40} textAnchor="end" fontSize="13" fill={VINCI.noir}>
          distance à l&apos;axe de rotation (m)
        </text>
        {/* Plage de portée de l'abaque */}
        {domaine && (
          <g>
            <line x1={sx(domaine.min)} x2={sx(domaine.max)} y1={sy(0) + 50} y2={sy(0) + 50} stroke={VINCI.bleu} strokeWidth="4" />
            <line x1={sx(domaine.min)} x2={sx(domaine.min)} y1={sy(0) + 44} y2={sy(0) + 56} stroke={VINCI.bleu} strokeWidth="3" />
            <line x1={sx(domaine.max)} x2={sx(domaine.max)} y1={sy(0) + 44} y2={sy(0) + 56} stroke={VINCI.bleu} strokeWidth="3" />
            <text x={sx(domaine.min) - 6} y={sy(0) + 55} textAnchor="end" fontSize="12" fill={VINCI.bleu}>
              plage de l&apos;abaque
            </text>
          </g>
        )}

        {/* Obstacles */}
        {obstacles.map((o) => (
          <g key={o.id}>
            <rect x={sx(o.distanceM as number)} y={sy(o.hauteurM as number)} width={OBSTACLE_LARGEUR_M * s} height={(o.hauteurM as number) * s} fill={VINCI.rougeXLight} stroke={VINCI.rouge} strokeWidth="2" />
            <text x={sx(o.distanceM as number) + (OBSTACLE_LARGEUR_M * s) / 2} y={sy(o.hauteurM as number) - 6} textAnchor="middle" fontSize="12" fill={VINCI.rougeDark}>
              {(o.nom.trim() || "Obstacle") + ` ${formatNombreAuto(o.hauteurM as number)} m`}
            </text>
          </g>
        ))}

        {/* Châssis (indicatif) et pivot */}
        <rect x={sx(-3.2)} y={sy(hPied - 0.3)} width={6.4 * s} height={(hPied - 0.8) * s} rx="4" fill={VINCI.bleuXLight} stroke={VINCI.bleu} strokeWidth="2" />
        <circle cx={sx(-2.2)} cy={sy(0.5)} r={0.5 * s} fill={VINCI.noir} />
        <circle cx={sx(2.2)} cy={sy(0.5)} r={0.5 * s} fill={VINCI.noir} />
        <line x1={xPivot} x2={xPivot} y1={sy(0)} y2={sy(hPied + 1.2)} stroke={VINCI.gris} strokeDasharray="5 4" strokeWidth="1.5" />
        <text x={xPivot} y={sy(hPied + 1.2) - 6} textAnchor="middle" fontSize="12" fill={VINCI.noir}>
          axe de rotation
        </text>

        {/* Flèche */}
        <line x1={xPivot} y1={piedY} x2={teteX} y2={tetePy} stroke={VINCI.bleu} strokeWidth="9" strokeLinecap="round" />
        <circle cx={xPivot} cy={piedY} r="8" fill={VINCI.bleuDark} />
        <circle cx={teteX} cy={tetePy} r="7" fill={VINCI.bleuDark} />
        {/* Câble, crochet, charge */}
        <line x1={teteX} y1={tetePy} x2={hookX} y2={hookTopY} stroke={VINCI.noir} strokeWidth="2" />
        <line x1={hookX} y1={hookTopY} x2={hookX - (chargeL * s) / 2} y2={sy(crochetY - elingueM)} stroke={VINCI.noir} strokeWidth="1.5" />
        <line x1={hookX} y1={hookTopY} x2={hookX + (chargeL * s) / 2} y2={sy(crochetY - elingueM)} stroke={VINCI.noir} strokeWidth="1.5" />
        <rect
          x={hookX - (chargeL * s) / 2}
          y={sy(crochetY - elingueM)}
          width={chargeL * s}
          height={chargeH * s}
          fill={VINCI.grisLight}
          stroke={VINCI.noir}
          strokeWidth="2"
          strokeDasharray={chargeIndicative ? "6 4" : undefined}
        />
        <text x={hookX + (chargeL * s) / 2 + 8} y={sy(crochetY - elingueM - chargeH / 2) + 5} fontSize="12" fill={VINCI.noir} paintOrder="stroke" stroke={VINCI.blanc} strokeWidth="3">
          {c.masseKg !== null ? formatMasse(c.masseKg) : "charge"}
        </text>

        {/* Cote de portée */}
        <line x1={xPivot} x2={hookX} y1={sy(0) - 14} y2={sy(0) - 14} stroke={couleur} strokeWidth="2.5" />
        <text x={(xPivot + hookX) / 2} y={sy(0) - 20} textAnchor="middle" fontSize="14" fontWeight="bold" fill={VINCI.noir} paintOrder="stroke" stroke={VINCI.blanc} strokeWidth="4">
          portée {formatNombreAuto(r)} m
        </text>
        {angle !== null && (
          <text x={xPivot + 34} y={piedY - 8} fontSize="13" fill={VINCI.bleuDark} fontWeight="bold">
            {formatNombreFR(angle, 1)} °
          </text>
        )}

        {/* Poignée du crochet (cible ≥ 44 px, souris + tactile) */}
        <g
          role="slider"
          tabIndex={peutGlisser ? 0 : -1}
          aria-label={`Crochet de la position ${sel.nom} : portée en mètres`}
          aria-valuemin={domaine?.min}
          aria-valuemax={domaine?.max}
          aria-valuenow={r}
          aria-valuetext={`${formatNombreAuto(r)} m`}
          aria-disabled={!peutGlisser}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{ outline: "none", touchAction: "none", cursor: peutGlisser ? (glisse ? "grabbing" : "grab") : "not-allowed" }}
          data-testid="crochet"
          onPointerDown={(e) => {
            if (!peutGlisser) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setGlisse(true);
            depuisPointeur(e.clientX);
          }}
          onPointerMove={(e) => glisse && depuisPointeur(e.clientX)}
          onPointerUp={(e) => {
            setGlisse(false);
            if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => setGlisse(false)}
          onKeyDown={(e) => {
            if (!domaine) return;
            const dir = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
            if (dir === 0) return;
            e.preventDefault();
            onPortee(sel.id, aimanter(borner(r + dir * PAS_M, domaine), PAS_M, domaine));
          }}
        >
          <circle cx={hookX} cy={hookTopY} r={rayonCible} fill="transparent" />
          {focus && <circle cx={hookX} cy={hookTopY} r="19" fill="none" stroke={VINCI.bleu} strokeWidth="3" strokeDasharray="4 3" />}
          <circle cx={hookX} cy={hookTopY} r="11" fill={couleur} stroke={VINCI.bleuDark} strokeWidth="3" />
          <path d={`M${hookX - 5},${hookTopY + 14} q0,10 5,10 q5,0 5,-8`} fill="none" stroke={VINCI.bleuDark} strokeWidth="3" />
        </g>
      </svg>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <Item t="Position" v={sel.nom} />
        <Item t="Portée" v={`${formatNombreAuto(r)} m${sel.porteeM === null ? " (non saisie)" : ""}`} />
        <Item
          t={axeY === "height_m" ? "Hauteur (abaque)" : "Longueur de flèche"}
          v={axeY === "none" || sel.yM === null ? "—" : `${formatNombreAuto(sel.yM)} m`}
        />
        <Item t="Angle de flèche" v={angle === null ? "n.d." : `${formatNombreFR(angle, 1)} °`} />
        <Item t="Capacité (moteur)" v={sel.horsAbaque ? "Hors abaque" : sel.capaciteKg === null ? "—" : formatMasse(sel.capaciteKg)} />
        <Item t="Taux" v={formatTaux(sel.taux)} />
        <Item t="Charge totale" v={result.chargeTotale.value === null ? "—" : formatMasse(result.chargeTotale.value)} />
        <Item t="Obstacles tracés" v={String(obstacles.length)} />
      </dl>
      <p className="text-xs text-foreground/70">
        Schéma indicatif : châssis et hauteur du pied de flèche ({formatNombreFR(hPied, 1)} m par défaut, donnée constructeur
        non saisie)
        {chargeIndicative ? ", dimensions de charge par défaut en pointillé" : ""}
        {teteIndicative ? ", hauteur de tête de flèche non déductible des données saisies" : ""}
        {crochetIndicatif ? ", hauteur du crochet par défaut" : ""}. L&apos;angle n&apos;est donné que si la longueur de flèche est
        connue (cos α = portée / longueur) ; les capacités affichées sont celles du moteur, jamais calculées ici.
      </p>
    </figure>
  );
}

function Item({ t, v }: { t: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-foreground/70">{t}</dt>
      <dd className="font-semibold tabular-nums">{v}</dd>
    </div>
  );
}
