import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { classerAvertissements } from "@/lib/charts/build";
import type { RapportAbaque } from "@/lib/charts/validate";

/** Rapport de validation : erreurs bloquantes, capacité croissante, cellules vides, autres avertissements. */
export function RapportValidation({ rapport, nbNoeuds }: { rapport: RapportAbaque; nbNoeuds: number }) {
  const w = classerAvertissements(rapport.warnings);
  const blocs: { titre: string; items: string[] }[] = [
    { titre: "Capacité croissante avec la portée (à contrôler)", items: w.capaciteCroissante },
    { titre: "Cellules vides (aucun nœud enregistré, lecture « hors abaque »)", items: w.cellulesVides },
    { titre: "Autres avertissements", items: w.autres },
  ].filter((b) => b.items.length > 0);
  return (
    <section aria-label="Rapport de validation" className="flex flex-col gap-3 rounded-md border border-border p-4 text-sm" data-testid="rapport-validation">
      <h3 className="font-bold text-primary">Rapport de validation</h3>
      {rapport.errors.length > 0 ? (
        <div role="alert" className="rounded-md border border-vinci-rouge bg-vinci-rouge-xlight p-3" data-testid="rapport-erreurs">
          <p className="flex items-center gap-2 font-semibold text-vinci-rouge-dark">
            <XCircle className="size-5 shrink-0" aria-hidden />
            {rapport.errors.length} erreur{rapport.errors.length > 1 ? "s" : ""} bloquante{rapport.errors.length > 1 ? "s" : ""} — enregistrement impossible
          </p>
          <ul className="mt-2 list-disc pl-6">
            {rapport.errors.slice(0, 12).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {rapport.errors.length > 12 && <li>… et {rapport.errors.length - 12} autre(s)</li>}
          </ul>
        </div>
      ) : (
        <p role="status" className="flex items-center gap-2 font-semibold text-vinci-bleu-dark" data-testid="rapport-ok">
          <CheckCircle2 className="size-5 shrink-0 text-verdict-vert" aria-hidden />
          Aucune erreur bloquante — {nbNoeuds} nœud{nbNoeuds > 1 ? "s" : ""} avec capacité.
        </p>
      )}
      {blocs.map((b) => (
        <div key={b.titre} className="rounded-md border border-verdict-jaune bg-verdict-jaune-bg p-3" data-testid="rapport-avertissements">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-5 shrink-0 text-primary" aria-hidden />
            {b.titre} : {b.items.length}
          </p>
          <ul className="mt-2 list-disc pl-6">
            {b.items.slice(0, 8).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {b.items.length > 8 && <li>… et {b.items.length - 8} autre(s)</li>}
          </ul>
        </div>
      ))}
    </section>
  );
}
