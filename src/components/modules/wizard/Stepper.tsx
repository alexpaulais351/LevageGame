"use client";

import { Check } from "lucide-react";

import { ETAPES } from "@/lib/study/schemas";
import { cn } from "@/lib/utils";

interface Props {
  courante: number;
  completude: boolean[];
  onSelect: (i: number) => void;
}

/** Navigation libre entre les 9 étapes ; chaque étape indique si elle est complète. */
export function Stepper({ courante, completude, onSelect }: Props) {
  return (
    <nav aria-label="Étapes de l'adéquation" className="overflow-x-auto pb-1">
      <ol className="flex min-w-[36rem] gap-1">
        {ETAPES.map((e, i) => {
          const actif = i === courante;
          const complet = completude[i];
          return (
            <li key={e.cle} className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={actif ? "step" : undefined}
                className={cn(
                  "flex min-h-16 w-full flex-col items-center gap-1 rounded-md border-b-4 px-1 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  actif ? "border-vinci-rouge bg-vinci-bleu-xlight" : "border-transparent hover:bg-vinci-gris-light",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold",
                    complet
                      ? "border-verdict-vert bg-verdict-vert text-white"
                      : actif
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-vinci-gris bg-background text-foreground/70",
                  )}
                >
                  {complet ? <Check className="size-4" aria-hidden /> : i + 1}
                </span>
                <span className={cn("text-[11px] leading-tight", actif ? "font-bold text-primary" : "text-foreground")}>{e.court}</span>
                <span className="sr-only">{complet ? "Étape complète" : "Étape incomplète"}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
