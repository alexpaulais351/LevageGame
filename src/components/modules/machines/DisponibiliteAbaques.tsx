import Link from "next/link";

import type { ItemListe, MachineSansAbaque } from "@/lib/machines/filtre";

/** Vue « Disponibilité des abaques » : machines du catalogue avec abaque / machines demandées sans abaque. */
export function DisponibiliteAbaques({ avec, sans }: { avec: ItemListe[]; sans: MachineSansAbaque[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2" data-testid="disponibilite-abaques">
      <section aria-labelledby="titre-avec" className="flex flex-col gap-3">
        <h2 id="titre-avec" className="text-lg font-bold text-primary">
          Machines avec abaque ({avec.length})
        </h2>
        <ul className="divide-y divide-border rounded-md border border-border">
          {avec.map((m) => (
            <li key={m.id}>
              <Link href={`/machines/${m.id}`} className="flex min-h-11 flex-col justify-center px-3 py-2 text-sm hover:bg-vinci-bleu-xlight">
                <span>
                  <span className="text-foreground/70">{m.manufacturerName}</span> <span className="font-bold text-primary">{m.model}</span>
                </span>
                <span className="text-xs text-foreground/70">{m.typeLabel}</span>
              </Link>
            </li>
          ))}
          {avec.length === 0 && <li className="p-3 text-sm text-foreground/70">Aucune machine.</li>}
        </ul>
      </section>

      <section aria-labelledby="titre-sans" className="flex flex-col gap-3">
        <h2 id="titre-sans" className="text-lg font-bold text-vinci-rouge-dark">
          Machines sans abaque ({sans.length})
        </h2>
        <p className="text-sm text-foreground/80">
          Ces machines n&apos;ont pas d&apos;abaque exploitable dans le catalogue. Vous pouvez ajouter votre propre machine via{" "}
          <Link href="/machines/nouvelle" className="font-semibold text-primary-light underline">
            « Ajouter ma machine »
          </Link>
          .
        </p>
        <ul className="divide-y divide-border rounded-md border border-border">
          {sans.map((m) => (
            <li key={`${m.manufacturer}-${m.model}`} className="flex flex-col gap-1 px-3 py-2 text-sm" data-testid="machine-sans-abaque">
              <span>
                <span className="text-foreground/70">{m.manufacturer}</span> <span className="font-bold text-primary">{m.model}</span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wide text-primary-light">{m.typeLabel}</span>
              <span>{m.motif}</span>
              <span className="text-foreground/80">Document nécessaire : {m.besoin}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
