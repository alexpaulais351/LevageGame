import type { EvaluationVehicule, PieceTransport } from "@/engine/transport";
import { HAUTEURS, LIMITES_STANDARD } from "@/engine/transport";
import { formatNombreFR } from "@/lib/utils";

const BLEU = "var(--color-vinci-bleu)";
const BLEU_FONCE = "var(--color-vinci-bleu-dark)";
const GRIS = "var(--color-vinci-gris)";
const GRIS_CLAIR = "var(--color-vinci-gris-light)";
const ROUGE = "var(--color-vinci-rouge)";
const JAUNE = "var(--color-verdict-jaune)";
const VERT = "var(--color-verdict-vert)";

const m = (v: number) => `${formatNombreFR(v, 2).replace(/,00$/, "")} m`;

/** Vue de côté à l'échelle : tracteur / cabine, plateau, pièce, porte-à-faux, hauteurs de vigilance. */
export function VueCote({ piece, ev }: { piece: PieceTransport; ev: EvaluationVehicule }) {
  const e = ev.encombrement!;
  const v = ev.vehicule;
  const W = 900;
  const marge = 40;
  const hMax = Math.max(e.hauteurM, HAUTEURS.autorouteM) + 0.8;
  // Même échelle horizontale et verticale ; la hauteur du dessin s'adapte (bornée pour les pièces très courtes).
  const s = Math.min((W - marge - 90) / e.longueurM, 230 / hMax);
  const H = Math.ceil(hMax * s + 50);
  const sol = H - 30;
  const X = (x: number) => marge + x * s;
  const Y = (y: number) => sol - y * s;
  const cabine = Math.min(v.longueurHorsPlateauM, 3);
  const plateauX = v.longueurHorsPlateauM;
  const plancher = v.hauteurPlancherM;
  const roues = (x0: number, n: number, pas: number) =>
    Array.from({ length: n }, (_, i) => <circle key={`${x0}-${i}`} cx={X(x0 + i * pas)} cy={Y(0.5)} r={0.5 * s} fill={BLEU_FONCE} />);
  const depasse = e.hauteurM > HAUTEURS.vigilanceM;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Vue de côté : longueur ${m(e.longueurM)}, hauteur ${m(e.hauteurM)}`}>
      <line x1={0} x2={W} y1={sol} y2={sol} stroke={GRIS} strokeWidth={2} />
      {[HAUTEURS.vigilanceM, HAUTEURS.autorouteM].map((h) => (
        <g key={h}>
          <line x1={marge} x2={W - 10} y1={Y(h)} y2={Y(h)} stroke={h === HAUTEURS.vigilanceM && depasse ? ROUGE : GRIS} strokeDasharray="6 5" />
          <text x={W - 12} y={Y(h) - 4} textAnchor="end" fontSize={12} fill={BLEU_FONCE}>
            {h === HAUTEURS.vigilanceM ? "4,00 m — gabarit courant des ouvrages" : "4,50 m — accès autoroutier"}
          </text>
        </g>
      ))}
      {/* Cabine / tracteur */}
      <rect x={X(0.2)} y={Y(3)} width={cabine * s * 0.8} height={(3 - 1) * s} rx={6} fill={BLEU} />
      <rect x={X(0.2)} y={Y(1.2)} width={(plateauX - 0.2) * s} height={0.35 * s} fill={BLEU_FONCE} />
      {roues(1, 1, 0)}
      {plateauX > 4 && roues(plateauX - 2.2, 2, 1.3)}
      {/* Plateau */}
      <rect x={X(plateauX)} y={Y(plancher)} width={e.plateauRetenuM * s} height={Math.min(0.25, plancher) * s} fill={BLEU_FONCE} />
      {roues(plateauX + e.plateauRetenuM - 3.2, 3, 1.35)}
      {/* Pièce */}
      <rect
        x={X(plateauX)}
        y={Y(plancher + piece.hauteurM)}
        width={Math.min(piece.longueurM, e.plateauRetenuM) * s}
        height={piece.hauteurM * s}
        fill={GRIS_CLAIR}
        stroke={BLEU}
        strokeWidth={2}
      />
      {e.porteAFauxM > 0 && (
        <rect
          x={X(plateauX + e.plateauRetenuM)}
          y={Y(plancher + piece.hauteurM)}
          width={e.porteAFauxM * s}
          height={piece.hauteurM * s}
          fill={e.porteAFauxM > LIMITES_STANDARD.porteAFauxArriereM ? ROUGE : JAUNE}
          fillOpacity={0.35}
          stroke={BLEU}
          strokeWidth={2}
        />
      )}
      {/* Cotes */}
      <line x1={X(0)} x2={X(e.longueurM)} y1={H - 10} y2={H - 10} stroke={BLEU_FONCE} markerStart="url(#fl)" markerEnd="url(#fl)" />
      <text x={X(e.longueurM / 2)} y={H - 14} textAnchor="middle" fontSize={13} fontWeight={700} fill={BLEU_FONCE}>
        Longueur du convoi {m(e.longueurM)}
        {e.porteAFauxM > 0 ? ` (dont porte-à-faux ${m(e.porteAFauxM)})` : ""}
      </text>
      <line x1={X(e.longueurM) + 14} x2={X(e.longueurM) + 14} y1={sol} y2={Y(e.hauteurM)} stroke={depasse ? ROUGE : BLEU_FONCE} />
      <text x={X(e.longueurM) + 18} y={Y(e.hauteurM / 2)} fontSize={13} fontWeight={700} fill={depasse ? ROUGE : BLEU_FONCE}>
        {m(e.hauteurM)}
      </text>
      <defs>
        <marker id="fl" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={BLEU_FONCE} />
        </marker>
      </defs>
    </svg>
  );
}

/** Vue de dessus : largeur de la pièce face aux seuils 2,55 / 3 / 4 m. */
export function VueDessus({ piece, ev }: { piece: PieceTransport; ev: EvaluationVehicule }) {
  const e = ev.encombrement!;
  const v = ev.vehicule;
  const W = 900;
  const marge = 40;
  const lMax = Math.max(4.6, e.largeurM + 0.6);
  const s = Math.min((W - marge - 90) / e.longueurM, 170 / lMax);
  const H = Math.ceil(lMax * s + 20);
  const cy = H / 2;
  const X = (x: number) => marge + x * s;
  const bandes: [number, string, string, "start" | "end"][] = [
    [4, ROUGE, "4 m", "end"],
    [3, JAUNE, "3 m", "end"],
    [LIMITES_STANDARD.largeurM, VERT, "2,55 m", "start"],
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Vue de dessus : largeur ${m(e.largeurM)}`}>
      {bandes.map(([l, c, t, ancre]) => (
        <g key={t}>
          <line x1={marge} x2={W - 10} y1={cy - (l / 2) * s} y2={cy - (l / 2) * s} stroke={c} strokeDasharray="6 5" />
          <line x1={marge} x2={W - 10} y1={cy + (l / 2) * s} y2={cy + (l / 2) * s} stroke={c} strokeDasharray="6 5" />
          <text x={ancre === "end" ? W - 12 : W - 70} y={cy - (l / 2) * s - 3} textAnchor="end" fontSize={11} fill={BLEU_FONCE}>
            {t}
          </text>
        </g>
      ))}
      {/* Châssis du tracteur / col de cygne entre la cabine et le plateau */}
      <rect x={X(0.2)} y={cy - 1.1 * s} width={(v.longueurHorsPlateauM - 0.2) * s} height={2.2 * s} fill={BLEU_FONCE} fillOpacity={0.55} />
      <rect x={X(0.2)} y={cy - 1.25 * s} width={(Math.min(v.longueurHorsPlateauM, 3) - 0.2) * s} height={2.5 * s} rx={4} fill={BLEU} />
      <rect x={X(v.longueurHorsPlateauM)} y={cy - (v.plateauLargeurM / 2) * s} width={e.plateauRetenuM * s} height={v.plateauLargeurM * s} fill={BLEU_FONCE} fillOpacity={0.8} />
      <rect
        x={X(v.longueurHorsPlateauM)}
        y={cy - (piece.largeurM / 2) * s}
        width={piece.longueurM * s}
        height={piece.largeurM * s}
        fill={GRIS_CLAIR}
        fillOpacity={0.9}
        stroke={piece.largeurM > LIMITES_STANDARD.largeurM ? ROUGE : BLEU}
        strokeWidth={2}
      />
      <text x={X(v.longueurHorsPlateauM + piece.longueurM / 2)} y={cy + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={BLEU_FONCE}>
        Largeur {m(e.largeurM)}
      </text>
    </svg>
  );
}

/** Composition du convoi : véhicules d'accompagnement autour du camion. */
export function CompositionConvoi({ ev }: { ev: EvaluationVehicule }) {
  const a = ev.accompagnement!;
  const blocs: { cle: string; texte: string; actif: boolean; couleur: string }[] = [
    { cle: "guidage", texte: "Guidage", actif: a.guidage, couleur: ROUGE },
    { cle: "pilote", texte: "Véhicule pilote", actif: a.pilote, couleur: JAUNE },
    { cle: "convoi", texte: "Convoi", actif: true, couleur: BLEU },
    { cle: "arriere", texte: "Protection arrière", actif: a.protectionArriere, couleur: JAUNE },
  ];
  const visibles = blocs.filter((b) => b.actif);
  return (
    <svg viewBox="0 0 690 70" className="h-auto w-full max-w-3xl" role="img" aria-label={`Composition : ${visibles.map((b) => b.texte).join(", ")}`}>
      <line x1={0} x2={visibles.length * 170 + 10} y1={58} y2={58} stroke={GRIS} strokeWidth={2} />
      {visibles.map((b, i) => (
        <g key={b.cle} transform={`translate(${i * 170 + 10},0)`}>
          <rect x={0} y={b.cle === "convoi" ? 14 : 26} width={b.cle === "convoi" ? 150 : 100} height={b.cle === "convoi" ? 36 : 24} rx={6} fill={b.couleur} />
          <circle cx={20} cy={52} r={6} fill={BLEU_FONCE} />
          <circle cx={b.cle === "convoi" ? 130 : 80} cy={52} r={6} fill={BLEU_FONCE} />
          <text x={b.cle === "convoi" ? 75 : 50} y={b.cle === "convoi" ? 10 : 20} textAnchor="middle" fontSize={12} fontWeight={700} fill={BLEU_FONCE}>
            {b.texte}
          </text>
        </g>
      ))}
    </svg>
  );
}
