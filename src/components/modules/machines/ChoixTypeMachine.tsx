"use client";

import { useId, useRef } from "react";

import { cn } from "@/lib/utils";
import { typeMachineDepuis } from "@/lib/visuals/silhouettes";

import { MachinePicto } from "../visuals/SilhouetteSvg";

export interface TypeChoix {
  id: string;
  code?: string | null;
  label: string;
  nbModeles?: number;
}

/**
 * Choix du type de machine par pictogrammes (D50) : rangée qui défile au doigt sur téléphone, sur plusieurs lignes au-delà.
 * Groupe de boutons radio accessible (flèches du clavier), zones tactiles ≥ 76 × 96 px.
 */
export function ChoixTypeMachine({
  label,
  types,
  value,
  onChange,
  chargement = false,
  compact = false,
}: {
  label: string;
  types: TypeChoix[];
  value: string;
  onChange: (id: string) => void;
  chargement?: boolean;
  compact?: boolean;
}) {
  const idLabel = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = types.findIndex((t) => t.id === value);
  const deplacer = (i: number) => {
    const j = (i + types.length) % types.length;
    onChange(types[j].id);
    refs.current[j]?.focus();
  };
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={idLabel} className="text-sm font-medium">
        {label}
      </span>
      {chargement ? (
        <p className="text-sm text-foreground/70">Chargement…</p>
      ) : types.length === 0 ? (
        <p className="text-sm text-foreground/70">Aucun type disponible.</p>
      ) : (
        <div
          role="radiogroup"
          aria-labelledby={idLabel}
          className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible"
          data-testid="choix-type-machine"
        >
          {types.map((t, i) => {
            const type = typeMachineDepuis(t.code, t.label);
            const actif = t.id === value;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={actif}
                tabIndex={actif || (idx < 0 && i === 0) ? 0 : -1}
                onClick={() => onChange(t.id)}
                onKeyDown={(e) => {
                  const pas = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                  if (pas === 0) return;
                  e.preventDefault();
                  deplacer(i + pas);
                }}
                title={t.nbModeles ? `${t.label} — ${t.nbModeles} modèle${t.nbModeles > 1 ? "s" : ""}` : t.label}
                className={cn(
                  "group flex shrink-0 snap-start flex-col items-center gap-1 rounded-lg p-0.5 text-center focus-visible:outline-none",
                  compact ? "w-[68px]" : "w-[78px]",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-2xl border-[1.5px] transition-colors group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2",
                    compact ? "size-[64px]" : "size-[72px]",
                    actif ? "border-primary bg-primary text-white" : "border-border bg-vinci-gris-light text-primary group-hover:border-primary",
                  )}
                >
                  {type ? <MachinePicto type={type} largeur={compact ? 50 : 56} /> : <span className="text-xs">?</span>}
                </span>
                <span className={cn("text-[11px] font-bold leading-tight", actif ? "text-primary" : "text-vinci-bleu-dark")}>{t.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
