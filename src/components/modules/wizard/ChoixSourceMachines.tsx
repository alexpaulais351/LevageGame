"use client";

import { cn } from "@/lib/utils";

export type SourceMachines = "public" | "mine";

/** Bascule « Catalogue public » / « Mes machines » (affichée aux seuls utilisateurs connectés). */
export function ChoixSourceMachines({ valeur, onChange, nom }: { valeur: SourceMachines; onChange: (v: SourceMachines) => void; nom: string }) {
  const options: { v: SourceMachines; label: string }[] = [
    { v: "public", label: "Catalogue public" },
    { v: "mine", label: "Mes machines" },
  ];
  return (
    <div role="radiogroup" aria-label={`Origine des machines — ${nom}`} className="inline-flex self-start rounded-md border border-border p-1" data-testid="choix-source-machines">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={valeur === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "min-h-11 rounded px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            valeur === o.v ? "bg-primary text-primary-foreground" : "text-primary hover:bg-vinci-bleu-xlight",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
