"use client";

import { useState } from "react";
import { ChevronUp, CircleAlert, ShieldAlert, TriangleAlert } from "lucide-react";

import type { Issue, VerdictGlobal, Zone } from "@/engine";
import { formatTaux } from "@/lib/study/format";
import type { StudyResult } from "@/lib/study/compute";
import { cn, formatMasse } from "@/lib/utils";

import { Gauge } from "./Gauge";

export const VERDICT_LIBELLE: Record<VerdictGlobal, string> = {
  ADEQUAT: "ADÉQUAT",
  ADEQUAT_AVEC_RESERVES: "ADÉQUAT AVEC RÉSERVES",
  NON_ADEQUAT: "NON ADÉQUAT",
};

export const VERDICT_STYLE: Record<VerdictGlobal, { fond: string; bord: string; pastille: string }> = {
  ADEQUAT: { fond: "bg-verdict-vert-bg", bord: "border-verdict-vert", pastille: "bg-verdict-vert" },
  ADEQUAT_AVEC_RESERVES: { fond: "bg-verdict-jaune-bg", bord: "border-verdict-jaune", pastille: "bg-verdict-jaune" },
  NON_ADEQUAT: { fond: "bg-verdict-rouge-bg", bord: "border-verdict-rouge", pastille: "bg-verdict-rouge" },
};

interface Props {
  result: StudyResult;
  seuils: { vert: number; orange: number };
  /** `colonne` : panneau desktop ; `barre` : barre repliable en bas (tablette). */
  variante: "colonne" | "barre";
}

function ListeIssues({ titre, issues, severite }: { titre: string; issues: Issue[]; severite: "bloquant" | "reserve" }) {
  if (issues.length === 0) return null;
  const Icone = severite === "bloquant" ? CircleAlert : TriangleAlert;
  return (
    <div>
      <h3 className="mb-1.5 flex items-center gap-2 text-sm font-bold text-primary">
        <Icone className={cn("size-4", severite === "bloquant" ? "text-verdict-rouge" : "text-verdict-jaune")} aria-hidden />
        {titre} ({issues.length})
      </h3>
      <ul className="flex flex-col gap-1.5 text-sm">
        {issues.map((i, k) => (
          <li
            key={k}
            className={cn("rounded border-l-4 px-2 py-1", severite === "bloquant" ? "border-verdict-rouge bg-verdict-rouge-bg" : "border-verdict-jaune bg-verdict-jaune-bg")}
          >
            {i.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResultPanel({ result, seuils, variante }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const v = result.verdict.value;
  const style = VERDICT_STYLE[v.verdict];
  const worst = v.positionDefavorable;
  const aVerifier = result.verdict.value.reserves.some((r) => r.code === "ABAQUE_A_VERIFIER");
  const zone: Zone | null = v.zone;

  const corps = (
    <div className="flex flex-col gap-4">
      {aVerifier && (
        <div role="alert" className="flex gap-2 rounded-md border border-verdict-jaune bg-verdict-jaune-bg p-3 text-sm">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <p>
            <strong>Abaque à vérifier</strong> — valeurs non contrôlées contre la documentation constructeur. Contrôle
            humain obligatoire avant tout usage.
          </p>
        </div>
      )}
      <Gauge taux={v.tauxMax} zone={zone} seuilVert={seuils.vert} seuilOrange={seuils.orange} />
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-foreground/70">Charge totale</dt>
        <dd className="text-right font-semibold tabular-nums">
          {result.chargeTotale.value === null ? "—" : formatMasse(result.chargeTotale.value)}
        </dd>
        <dt className="text-foreground/70">Position défavorable</dt>
        <dd className="text-right font-semibold">{worst ? worst.label : "—"}</dd>
        <dt className="text-foreground/70">Capacité à l&apos;abaque</dt>
        <dd className="text-right font-semibold tabular-nums">
          {worst?.capacite.value == null ? (worst ? "Hors abaque" : "—") : formatMasse(worst.capacite.value)}
        </dd>
      </dl>
      <ListeIssues titre="Points bloquants" issues={v.bloquants} severite="bloquant" />
      <ListeIssues titre="Réserves" issues={v.reserves} severite="reserve" />
    </div>
  );

  const entete = (
    <div className={cn("flex items-center gap-3 rounded-md border-l-8 px-4 py-3", style.fond, style.bord)}>
      <span className={cn("size-3 shrink-0 rounded-full", style.pastille)} aria-hidden />
      <div className="min-w-0">
        <p className="text-lg font-bold leading-tight text-foreground" role="status">
          {VERDICT_LIBELLE[v.verdict]}
        </p>
        {result.nbDonneesManquantes > 0 && (
          <p className="text-xs text-foreground/70">Dossier incomplet : {result.nbDonneesManquantes} donnée(s) manquante(s)</p>
        )}
      </div>
    </div>
  );

  if (variante === "colonne") {
    return (
      <section aria-label="Résultat" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-primary">Résultat en temps réel</h2>
        {entete}
        {corps}
      </section>
    );
  }

  return (
    <section aria-label="Résultat" className="border-t-4 border-primary bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.12)]">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={cn("size-4 shrink-0 rounded-full", style.pastille)} aria-hidden />
        <span className="font-bold">{VERDICT_LIBELLE[v.verdict]}</span>
        <span className="ml-auto text-lg font-bold tabular-nums">{v.tauxMax === null ? (worst ? "Hors abaque" : "—") : formatTaux(v.tauxMax)}</span>
        <ChevronUp className={cn("size-5 shrink-0 text-primary transition-transform", ouvert && "rotate-180")} aria-hidden />
      </button>
      {ouvert && (
        <div className="max-h-[55vh] overflow-y-auto border-t border-border px-4 py-3">
          {corps}
        </div>
      )}
    </section>
  );
}
