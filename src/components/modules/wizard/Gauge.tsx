import type { Zone } from "@/engine";
import { formatTaux } from "@/lib/study/format";
import { cn } from "@/lib/utils";

export const ZONE_FOND: Record<Zone, string> = {
  vert: "bg-verdict-vert",
  orange: "bg-verdict-jaune",
  rouge: "bg-verdict-rouge",
};

const ECHELLE_MAX = 1.2;

interface GaugeProps {
  /** Taux d'utilisation (ratio) de la position la plus défavorable ; null = non calculable. */
  taux: number | null;
  zone: Zone | null;
  seuilVert: number;
  seuilOrange: number;
  className?: string;
}

/** Jauge horizontale 0–120 % avec repères aux seuils vert / orange. */
export function Gauge({ taux, zone, seuilVert, seuilOrange, className }: GaugeProps) {
  const pct = (r: number) => `${Math.min(100, Math.max(0, (r / ECHELLE_MAX) * 100))}%`;
  const rempli = taux === null ? 0 : Number.isFinite(taux) ? taux : ECHELLE_MAX;
  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-primary">Taux d&apos;utilisation</span>
        <span className="text-2xl font-bold tabular-nums text-foreground" aria-live="polite">
          {taux === null ? "—" : formatTaux(taux)}
        </span>
      </div>
      <div
        role="meter"
        aria-label="Taux d'utilisation"
        aria-valuemin={0}
        aria-valuemax={120}
        aria-valuenow={taux === null || !Number.isFinite(taux) ? undefined : Math.round(taux * 100)}
        className="relative h-5 overflow-hidden rounded-full bg-vinci-gris-light"
      >
        <div
          className={cn("h-full rounded-full transition-all", zone ? ZONE_FOND[zone] : "bg-vinci-gris")}
          style={{ width: pct(rempli) }}
        />
        {[seuilVert, seuilOrange].map((s) => (
          <span key={s} className="absolute inset-y-0 w-0.5 bg-foreground/60" style={{ left: pct(s) }} aria-hidden />
        ))}
      </div>
      <div className="relative mt-1 h-4 text-[11px] text-foreground/70">
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(seuilVert) }}>
          {Math.round(seuilVert * 100)} %
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(seuilOrange) }}>
          {Math.round(seuilOrange * 100)} %
        </span>
      </div>
    </div>
  );
}
