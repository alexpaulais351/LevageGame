import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { MachineResume } from "@/lib/machines/queries";
import { formatMasse } from "@/lib/utils";

import { BadgeStatut } from "./BadgeStatut";
import { VignetteMachine } from "./VignetteMachine";

/** Ligne du catalogue / de « Mes machines » : vignette, identité, configurations avec statut et source. */
export function CarteMachine({ m }: { m: MachineResume }) {
  return (
    <Card className="flex flex-col gap-3 p-4" data-testid="carte-machine">
      <div className="flex items-start gap-4">
        <VignetteMachine typeCode={m.typeCode} typeLabel={m.typeLabel} photoUrl={m.photoUrl} alt={`Photo de ${m.manufacturerName} ${m.model}`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-primary-light">{m.typeLabel}</p>
          <h2 className="text-lg font-bold text-primary">
            <Link href={`/machines/${m.id}`} className="hover:underline">
              {m.manufacturerName} {m.model}
            </Link>
          </h2>
          <p className="text-sm text-foreground/70">
            {m.configurations.length} configuration{m.configurations.length > 1 ? "s" : ""}
            {m.specs.masseKg !== null ? ` · ${formatMasse(m.specs.masseKg)}` : ""}
            {m.perso ? " · machine personnelle" : ""}
          </p>
        </div>
      </div>
      {m.configurations.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border" aria-label={`Configurations de ${m.manufacturerName} ${m.model}`}>
          {m.configurations.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm">
              <span className="min-w-0 font-semibold">{c.label}</span>
              <span className="flex flex-wrap items-center gap-3">
                {c.abaque?.source && (
                  <span className="text-foreground/70">
                    {c.abaque.source.url ? (
                      <a href={c.abaque.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary-light underline">
                        {c.abaque.source.titre}
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    ) : (
                      c.abaque.source.titre
                    )}
                    {c.abaque.source.reference ? ` — réf. ${c.abaque.source.reference}` : ""}
                  </span>
                )}
                <BadgeStatut status={c.abaque?.status ?? null} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-foreground/70">Aucune configuration.</p>
      )}
    </Card>
  );
}
