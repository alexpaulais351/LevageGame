import { VINCI } from "@/lib/design-tokens";
import { pointsSvg, projeter, silhouetteVignette, LIBELLE_TYPE, type Degrade, type Forme, type Peinture, type TypeMachine } from "@/lib/visuals/silhouettes";

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Définition SVG d'un dégradé (coordonnées déjà projetées, `userSpaceOnUse`). */
function DefDegrade({ id, g }: { id: string; g: Degrade }) {
  const arrets = g.arrets.map(([o, c, op], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={op ?? 1} />);
  return g.k === "lin" ? (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={r2(g.a[0])} y1={r2(g.a[1])} x2={r2(g.b[0])} y2={r2(g.b[1])}>
      {arrets}
    </linearGradient>
  ) : (
    <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={r2(g.c[0])} cy={r2(g.c[1])} r={Math.max(0.01, r2(g.r))}>
      {arrets}
    </radialGradient>
  );
}

/**
 * Rendu SVG (écran) des formes déjà projetées en pixels — même jeu de formes que la fiche PDF.
 * `prefixe` rend uniques les identifiants des dégradés quand plusieurs schémas cohabitent sur la page.
 */
export function FormesSvg({ formes, prefixe }: { formes: readonly Forme[]; prefixe: string }) {
  const defs: { id: string; g: Degrade }[] = [];
  const peinture = (p: Peinture | undefined, i: number): string => {
    if (p === undefined) return "none";
    if (typeof p === "string") return p;
    const id = `${prefixe}-g${i}`;
    defs.push({ id, g: p });
    return `url(#${id})`;
  };
  const elements = formes.map((f, i) => {
    if (f.k === "poly")
      return <polygon key={i} points={pointsSvg(f.pts)} fill={peinture(f.fill, i)} fillOpacity={f.op} stroke={f.stroke} strokeWidth={f.sw} strokeLinejoin="round" />;
    if (f.k === "circle")
      return <circle key={i} cx={r2(f.cx)} cy={r2(f.cy)} r={Math.max(0, r2(f.r))} fill={peinture(f.fill, i)} fillOpacity={f.op} stroke={f.stroke} strokeWidth={f.sw} />;
    return <line key={i} x1={r2(f.x1)} y1={r2(f.y1)} x2={r2(f.x2)} y2={r2(f.y2)} stroke={f.stroke} strokeWidth={f.w} strokeOpacity={f.op} strokeDasharray={f.dash} strokeLinecap="round" />;
  });
  return (
    <g>
      {defs.length > 0 && (
        <defs>
          {defs.map((d) => (
            <DefDegrade key={d.id} id={d.id} g={d.g} />
          ))}
        </defs>
      )}
      {elements}
    </g>
  );
}

/** Vignette (64–96 px) d'un type de machine : illustration de profil en posture type. Décorative. */
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
  // Traits affinés à petite échelle : seul le relief (dégradés) reste lisible.
  const formes = projeter(sil.formes, { ox, oy, s, flipY: true }).map((f): Forme =>
    f.k === "line" ? { ...f, w: Math.max(0.35, f.w * 0.45) } : { ...f, sw: Math.min(f.sw ?? 0, 0.35) },
  );
  return (
    <svg
      viewBox={`0 0 ${largeur} ${h}`}
      width={largeur}
      height={h}
      role="img"
      aria-label={`Illustration indicative : ${LIBELLE_TYPE[type]}`}
      className={className}
      data-testid="vignette-machine"
    >
      <rect x="0" y="0" width={largeur} height={h} rx="6" fill={VINCI.blanc} />
      <line x1="4" x2={largeur - 4} y1={oy} y2={oy} stroke={VINCI.gris} strokeWidth="1" />
      <FormesSvg formes={formes} prefixe={`vig-${type}-${largeur}`} />
    </svg>
  );
}
