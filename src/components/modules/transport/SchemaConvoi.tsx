import type { EvaluationVehicule, PieceTransport } from "@/engine/transport";
import { HAUTEURS, LIMITES_STANDARD } from "@/engine/transport";
import { formatNombreFR } from "@/lib/utils";

const BLEU = "var(--color-vinci-bleu)";
const BLEU_FONCE = "var(--color-vinci-bleu-dark)";
const GRIS = "var(--color-vinci-gris)";
const GRIS_CLAIR = "var(--color-vinci-gris-light)";
const BLEU_CLAIR = "var(--color-vinci-bleu-xlight)";
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
      <Vehicule g={g} v={v} plateau={e.plateauRetenuM} piece={piece} />
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

/** Roue (pneu, jante, moyeu) centrée en x (m), de rayon r (m). */
function Roue({ g, x, r = 0.5 }: { g: Geo; x: number; r?: number }) {
  return (
    <g>
      <circle cx={g.X(x)} cy={g.Y(r)} r={r * g.s} fill={BLEU_FONCE} />
      <circle cx={g.X(x)} cy={g.Y(r)} r={r * 0.55 * g.s} fill={GRIS} />
      <circle cx={g.X(x)} cy={g.Y(r)} r={r * 0.18 * g.s} fill={BLEU_FONCE} />
    </g>
  );
}

/** Rectangle en mètres (x, y = coin bas gauche). */
function R({ g, x, y, l, h, fill, rx = 0, opacity }: { g: Geo; x: number; y: number; l: number; h: number; fill: string; rx?: number; opacity?: number }) {
  return <rect x={g.X(x)} y={g.Y(y + h)} width={l * g.s} height={h * g.s} rx={rx * g.s} fill={fill} fillOpacity={opacity} />;
}

/** Cabine de tracteur / porteur, face à gauche : pare-brise incliné, vitre latérale, calandre, marchepied, réservoir. */
function Cabine({ g, x = 0, longueur = 2.3, haut = 3.6 }: { g: Geo; x?: number; longueur?: number; haut?: number }) {
  const { X, Y } = g;
  const corps = `M${X(x + 0.15)},${Y(1)} L${X(x + 0.15)},${Y(haut - 0.9)} L${X(x + 0.45)},${Y(haut - 0.05)} Q${X(x + 0.5)},${Y(haut)} ${X(x + 0.7)},${Y(haut)} L${X(x + longueur)},${Y(haut)} L${X(x + longueur)},${Y(1)} Z`;
  const vitre = `M${X(x + 0.3)},${Y(haut - 0.95)} L${X(x + 0.55)},${Y(haut - 0.25)} L${X(x + 1.25)},${Y(haut - 0.25)} L${X(x + 1.25)},${Y(haut - 0.95)} Z`;
  return (
    <g>
      <path d={corps} fill={BLEU} />
      <path d={vitre} fill={BLEU_CLAIR} />
      <R g={g} x={x + 1.4} y={haut - 0.95} l={0.6} h={0.7} fill={BLEU_CLAIR} rx={0.05} />
      <R g={g} x={x + 0.05} y={0.75} l={0.35} h={0.45} fill={BLEU_FONCE} rx={0.05} />
      {[0, 1, 2].map((i) => (
        <R key={i} g={g} x={x + 0.16} y={1.35 + i * 0.2} l={0.06} h={0.12} fill={GRIS} />
      ))}
      <R g={g} x={x + 1.45} y={0.6} l={0.25} h={0.5} fill={GRIS} />
      <R g={g} x={x + longueur + 0.05} y={1} l={0.9} h={0.5} fill={GRIS} rx={0.1} />
      <R g={g} x={x + longueur - 0.15} y={haut - 0.1} l={0.08} h={0.6} fill={GRIS} />
    </g>
  );
}

/** Silhouette du véhicule selon sa famille. */
function Vehicule({ g, v, plateau, piece }: { g: Geo; v: EvaluationVehicule["vehicule"]; plateau: number; piece: PieceTransport }) {
  const d = v.longueurHorsPlateauM;
  const fin = d + plateau;
  const p = v.hauteurPlancherM;
  const essieuxArriere = (n: number, pas = 1.36) => Array.from({ length: n }, (_, i) => fin - 1.3 - i * pas);
  const sil = v.silhouette ?? "semi";

  if (sil === "porteur") {
    return (
      <g>
        <R g={g} x={0.2} y={0.85} l={fin - 0.2} h={0.3} fill={BLEU_FONCE} />
        <Cabine g={g} longueur={2.4} haut={3.4} />
        {v.id === "porteur-grue" && (
          <g>
            <R g={g} x={2.45} y={1.15} l={0.45} h={2.1} fill={JAUNE} />
            <R g={g} x={2.3} y={3.05} l={Math.min(plateau * 0.85, 6)} h={0.28} fill={JAUNE} />
          </g>
        )}
        <R g={g} x={d} y={p - 0.18} l={plateau} h={0.18} fill={BLEU_FONCE} />
        <R g={g} x={fin - 0.1} y={p - 0.6} l={0.1} h={0.5} fill={ROUGE} />
        <Roue g={g} x={1.3} />
        {essieuxArriere(2).map((x) => (
          <Roue key={x} g={g} x={x} />
        ))}
      </g>
    );
  }

  if (sil === "porte-poutres") {
    // Tracteur avec sellette pivotante ; la pièce elle-même relie la sellette au dolly arrière autodirectionnel.
    const sellette = d + 1.2;
    const dolly = fin - 1.5;
    return (
      <g>
        <R g={g} x={0.2} y={0.85} l={d + 2.6} h={0.3} fill={BLEU_FONCE} />
        <Cabine g={g} />
        <R g={g} x={sellette - 0.6} y={1.15} l={1.2} h={p - 1.15} fill={BLEU_FONCE} />
        <R g={g} x={sellette - 0.9} y={p - 0.12} l={1.8} h={0.12} fill={GRIS} />
        <Roue g={g} x={1.3} />
        <Roue g={g} x={d + 1.6} />
        <Roue g={g} x={d + 2.95} />
        <R g={g} x={dolly - 2.1} y={0.85} l={3.6} h={0.35} fill={BLEU_FONCE} />
        <R g={g} x={dolly - 0.6} y={1.2} l={1.2} h={p - 1.2} fill={BLEU_FONCE} />
        <R g={g} x={dolly - 0.9} y={p - 0.12} l={1.8} h={0.12} fill={GRIS} />
        <line x1={g.X(d + 3.3)} x2={g.X(dolly - 2.1)} y1={g.Y(1)} y2={g.Y(1)} stroke={GRIS} strokeWidth={2} strokeDasharray="3 4" />
        {[-1.36, 0, 1.36].map((o) => (
          <Roue key={o} g={g} x={dolly + o * 0.95 - 0.2} />
        ))}
      </g>
    );
  }

  if (sil === "modulaire") {
    const lignes = Math.max(4, Math.round(plateau / 1.5));
    return (
      <g>
        <R g={g} x={0.2} y={0.9} l={6.3} h={0.35} fill={BLEU_FONCE} />
        <Cabine g={g} longueur={2.6} haut={3.8} />
        <R g={g} x={3} y={1.25} l={3.4} h={0.55} fill={BLEU} rx={0.1} />
        <Roue g={g} x={1.4} r={0.55} />
        <Roue g={g} x={4.3} r={0.55} />
        <Roue g={g} x={5.7} r={0.55} />
        <R g={g} x={6.4} y={0.75} l={d - 6.4} h={0.12} fill={GRIS} />
        <R g={g} x={d} y={p - 0.45} l={plateau} h={0.45} fill={BLEU_FONCE} />
        {Array.from({ length: lignes }, (_, i) => (
          <Roue key={i} g={g} x={d + (plateau * (i + 0.5)) / lignes} r={0.37} />
        ))}
      </g>
    );
  }

  // Semi-remorques : plateau, surbaissée à col de cygne, porte-panneaux.
  const bas = sil === "surbaissee" || sil === "porte-panneaux";
  const col = bas ? d - 3.2 : d;
  return (
    <g>
      <R g={g} x={0.2} y={0.85} l={5.6} h={0.3} fill={BLEU_FONCE} />
      <Cabine g={g} />
      <Roue g={g} x={1.3} />
      <Roue g={g} x={4.2} />
      <Roue g={g} x={5.55} />
      {bas ? (
        <g>
          {/* Col de cygne au-dessus de la sellette, puis descente vers le plancher bas */}
          <R g={g} x={col} y={1.35} l={d - col} h={0.35} fill={BLEU_FONCE} />
          <path
            d={`M${g.X(d - 0.4)},${g.Y(1.35)} L${g.X(d + 0.4)},${g.Y(p)} L${g.X(d + 0.4)},${g.Y(p - 0.25)} L${g.X(d - 0.8)},${g.Y(1.1)} Z`}
            fill={BLEU_FONCE}
          />
          <R g={g} x={d} y={p - 0.25} l={plateau} h={0.25} fill={BLEU_FONCE} />
          {sil === "porte-panneaux" && (
            <g>
              {/* Châssis en U ouvert : longerons latéraux et portique arrière */}
              <R g={g} x={d} y={0.9} l={plateau} h={0.25} fill={BLEU} opacity={0.85} />
              <R g={g} x={fin - 0.35} y={0.2} l={0.35} h={Math.min(piece.hauteurM, 2.6)} fill={BLEU} />
            </g>
          )}
        </g>
      ) : (
        <R g={g} x={col} y={p - 0.3} l={fin - col} h={0.3} fill={BLEU_FONCE} />
      )}
      <R g={g} x={fin - 0.1} y={Math.max(0.5, p - 0.7)} l={0.1} h={0.45} fill={ROUGE} />
      {essieuxArriere(3, bas ? 1.1 : 1.36).map((x) => (
        <Roue key={x} g={g} x={x} r={bas ? 0.4 : 0.5} />
      ))}
    </g>
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
