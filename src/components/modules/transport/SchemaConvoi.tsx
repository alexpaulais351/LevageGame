import type { EvaluationVehicule, PieceTransport } from "@/engine/transport";
import { HAUTEURS, LIMITES_STANDARD } from "@/engine/transport";
import { FormesSvg } from "@/components/modules/visuals/SilhouetteSvg";
import { formatNombreFR } from "@/lib/utils";
import { projeter } from "@/lib/visuals/silhouettes";
import { formesVehicule } from "@/lib/visuals/vehicules";

const BLEU = "var(--color-vinci-bleu)";
const BLEU_FONCE = "var(--color-vinci-bleu-dark)";
const GRIS = "var(--color-vinci-gris)";
const GRIS_CLAIR = "var(--color-vinci-gris-light)";
const ROUGE = "var(--color-vinci-rouge)";
const JAUNE = "var(--color-verdict-jaune)";
const VERT = "var(--color-verdict-vert)";

const m = (v: number) => `${formatNombreFR(v, 2).replace(/,00$/, "")} m`;

/** Vue de côté à l'échelle : silhouette du véhicule (tracteur, remorque, essieux), pièce, porte-à-faux, hauteurs de vigilance. */
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
  const plateauX = v.longueurHorsPlateauM;
  const plancher = v.hauteurPlancherM;
  const depasse = e.hauteurM > HAUTEURS.vigilanceM;
  const g: Geo = { X, Y, s };

  return (
    <svg data-schema="cote" viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Vue de côté : ${v.nom}, longueur ${m(e.longueurM)}, hauteur ${m(e.hauteurM)}`}>
      <line x1={0} x2={W} y1={sol} y2={sol} stroke={GRIS} strokeWidth={2} />
      {[HAUTEURS.vigilanceM, HAUTEURS.autorouteM].map((h) => (
        <g key={h}>
          <line x1={marge} x2={W - 10} y1={Y(h)} y2={Y(h)} stroke={h === HAUTEURS.vigilanceM && depasse ? ROUGE : GRIS} strokeDasharray="6 5" />
          <text x={W - 12} y={Y(h) - 4} textAnchor="end" fontSize={12} fill={BLEU_FONCE}>
            {h === HAUTEURS.vigilanceM ? "4,00 m — gabarit courant des ouvrages" : "4,50 m — accès autoroutier"}
          </text>
        </g>
      ))}
      <Vehicule g={g} v={v} plateau={e.plateauRetenuM} piece={piece} prefixe="cote" />
      {/* Pièce */}
      <rect x={X(plateauX)} y={Y(plancher + piece.hauteurM)} width={Math.min(piece.longueurM, e.plateauRetenuM) * s} height={piece.hauteurM * s} fill={GRIS_CLAIR} stroke={BLEU} strokeWidth={2} />
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
      {/* Sangles d'arrimage */}
      {arrimages(Math.min(piece.longueurM, e.plateauRetenuM)).map((x) => (
        <line key={x} x1={X(plateauX + x)} x2={X(plateauX + x)} y1={Y(plancher + piece.hauteurM)} y2={Y(plancher)} stroke={JAUNE} strokeWidth={Math.max(2, 0.06 * s)} />
      ))}
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

interface Geo {
  X: (x: number) => number;
  Y: (y: number) => number;
  s: number;
}

/** Positions des sangles : environ tous les 3 m, au moins 2. */
function arrimages(longueur: number): number[] {
  const n = Math.max(2, Math.round(longueur / 3));
  return Array.from({ length: n }, (_, i) => (longueur * (i + 0.5)) / n);
}

/** Illustration du véhicule (vue de côté, rendu technique), projetée à l'échelle du schéma. */
function Vehicule({ g, v, plateau, piece, prefixe }: { g: Geo; v: EvaluationVehicule["vehicule"]; plateau: number; piece: PieceTransport; prefixe: string }) {
  const formes = projeter(formesVehicule(v, plateau, piece.hauteurM), { ox: g.X(0), oy: g.Y(0), s: g.s, flipY: true });
  return <FormesSvg formes={formes} prefixe={prefixe} />;
}

/** Vignette du véhicule (tableau de choix) : même silhouette que la vue de côté, plateau de base, ajustée au cadre. */
export function MiniVehicule({ v, className }: { v: EvaluationVehicule["vehicule"]; className?: string }) {
  const W = 160;
  const H = 52;
  const longueur = v.longueurHorsPlateauM + v.plateauM;
  const s = Math.min((W - 8) / longueur, (H - 8) / 4);
  const sol = H - 4;
  const g: Geo = { X: (x) => 4 + x * s, Y: (y) => sol - y * s, s };
  const piece: PieceTransport = { longueurM: v.plateauM, largeurM: 2, hauteurM: 2, masseKg: 0 };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden focusable="false">
      <line x1={0} x2={W} y1={sol + 0.5} y2={sol + 0.5} stroke={GRIS} strokeWidth={1} />
      <Vehicule g={g} v={v} plateau={v.plateauM} piece={piece} prefixe={`mini-${v.id}`} />
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
    <svg data-schema="dessus" viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Vue de dessus : largeur ${m(e.largeurM)}`}>
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
