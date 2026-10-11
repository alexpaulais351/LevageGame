import { VINCI } from "@/lib/design-tokens";
import { pointsSvg, silhouetteVignette, LIBELLE_TYPE, type Forme, type TypeMachine } from "@/lib/visuals/silhouettes";

/** Rendu SVG (écran) des formes déjà projetées en pixels. Même jeu de formes que la fiche PDF. */
export function FormesSvg({ formes }: { formes: readonly Forme[] }) {
  return (
    <g>
      {formes.map((f, i) => {
        if (f.k === "poly")
          return <polygon key={i} points={pointsSvg(f.pts)} fill={f.fill ?? "none"} stroke={f.stroke} strokeWidth={f.sw} strokeLinejoin="round" />;
        if (f.k === "circle")
          return <circle key={i} cx={f.cx} cy={f.cy} r={Math.max(0, f.r)} fill={f.fill ?? "none"} stroke={f.stroke} strokeWidth={f.sw} />;
        return <line key={i} x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} stroke={f.stroke} strokeWidth={f.w} strokeDasharray={f.dash} strokeLinecap="round" />;
      })}
    </g>
  );
}

/** Vignette (64–96 px) d'un type de machine : silhouette d'élévation en posture type. Décorative. */
export function MachineVignette({ type, largeur = 96, className }: { type: TypeMachine; largeur?: number; className?: string }) {
  const sil = silhouetteVignette(type);
  const b = sil.bornes;
  const h = Math.round(largeur * 0.78);
  const pad = 0.4;
  const w = b.maxX - b.minX + 2 * pad;
  const hh = b.maxY - b.minY + 2 * pad;
  const s = Math.min(largeur / w, h / hh);
  const ox = (largeur - (b.maxX - b.minX) * s) / 2 - b.minX * s;
  const oy = (h - (b.maxY - b.minY) * s) / 2 + b.maxY * s;
  const formes = sil.formes.map((f): Forme => {
    const X = (x: number) => ox + x * s;
    const Y = (y: number) => oy - y * s;
    if (f.k === "poly") return { ...f, pts: f.pts.map(([x, y]) => [X(x), Y(y)] as [number, number]), sw: Math.min(f.sw ?? 1, 0.9) };
    if (f.k === "circle") return { ...f, cx: X(f.cx), cy: Y(f.cy), r: f.r * s, sw: Math.min(f.sw ?? 1, 0.9) };
    return { ...f, x1: X(f.x1), y1: Y(f.y1), x2: X(f.x2), y2: Y(f.y2), w: Math.max(0.8, f.w * 0.6) };
  });
  return (
    <svg
      viewBox={`0 0 ${largeur} ${h}`}
      width={largeur}
      height={h}
      role="img"
      aria-label={`Silhouette indicative : ${LIBELLE_TYPE[type]}`}
      className={className}
      data-testid="vignette-machine"
    >
      <rect x="0" y="0" width={largeur} height={h} rx="6" fill={VINCI.blanc} />
      <line x1="4" x2={largeur - 4} y1={oy} y2={oy} stroke={VINCI.gris} strokeWidth="1" />
      <FormesSvg formes={formes} />
    </svg>
  );
}
