"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";

import { filtrer, grouperParType, valeursDistinctes, type ItemListe } from "@/lib/machines/filtre";
import { cn } from "@/lib/utils";

import { BadgeStatut } from "./BadgeStatut";

const puce = "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold";

/** Liste compacte : recherche, filtres type / constructeur, groupes repliables par type. */
export function ListeMachines({ items, vide }: { items: ItemListe[]; vide: string }) {
  const [recherche, setRecherche] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [constructeur, setConstructeur] = useState<string | null>(null);

  const types = useMemo(() => valeursDistinctes(items, "typeLabel"), [items]);
  const constructeurs = useMemo(() => valeursDistinctes(items, "manufacturerName"), [items]);
  const resultats = useMemo(() => filtrer(items, { recherche, type, constructeur }), [items, recherche, type, constructeur]);
  const groupes = useMemo(() => grouperParType(resultats), [resultats]);
  const filtreActif = recherche.trim() !== "" || type !== null || constructeur !== null;

  if (items.length === 0)
    return (
      <p role="status" className="rounded-md bg-vinci-bleu-xlight p-4 text-sm" data-testid="liste-vide">
        {vide}
      </p>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Rechercher un modèle ou un constructeur</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/60" aria-hidden />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un modèle ou un constructeur…"
            data-testid="recherche-machines"
            className="min-h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm"
          />
        </label>
        {constructeurs.length > 1 && (
          <label className="sm:w-60">
            <span className="sr-only">Constructeur</span>
            <select
              value={constructeur ?? ""}
              onChange={(e) => setConstructeur(e.target.value || null)}
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">Tous les constructeurs</option>
              {constructeurs.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {types.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par type">
          <button type="button" aria-pressed={type === null} onClick={() => setType(null)} className={cn(puce, type === null ? "border-primary bg-primary text-white" : "border-border hover:border-primary")}>
            Tous
          </button>
          {types.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(type === t ? null : t)}
              className={cn(puce, type === t ? "border-primary bg-primary text-white" : "border-border hover:border-primary")}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-foreground/70" role="status">
        {resultats.length} machine{resultats.length > 1 ? "s" : ""} sur {items.length}
      </p>

      {groupes.length === 0 ? (
        <p className="rounded-md bg-vinci-bleu-xlight p-4 text-sm">Aucune machine ne correspond à ces critères.</p>
      ) : (
        groupes.map((g) => (
          <details key={g.typeLabel + (filtreActif ? "-f" : "")} open={filtreActif} className="group rounded-md border border-border" data-testid="groupe-machines">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 font-bold text-primary [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
              <span className="flex-1">{g.typeLabel}</span>
              <span className="text-sm font-semibold text-foreground/70">{g.items.length}</span>
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {g.items.map((m, i) => (
                <li key={m.id} className={i % 2 === 1 ? "bg-muted" : undefined}>
                  <Link href={`/machines/${m.id}`} data-testid="ligne-machine" className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm hover:bg-vinci-bleu-xlight">
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground/70">{m.manufacturerName}</span> <span className="font-bold text-primary">{m.model}</span>
                      {m.perso && <span className="text-foreground/70"> · personnelle</span>}
                    </span>
                    <span className="text-foreground/70">
                      {m.nbConfigs} config{m.nbConfigs > 1 ? "s" : ""}
                    </span>
                    <BadgeStatut status={m.statut} />
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))
      )}
    </div>
  );
}
