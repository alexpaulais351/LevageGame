import type { Calc } from "@/engine";
import { formatCalcValue } from "@/lib/study/format";

/** Détail d'un calcul du moteur : formule, entrées avec unités, source, avertissements. */
export function CalcDetail({ titre, calc, resume }: { titre: string; calc: Calc<unknown>; resume?: string }) {
  const entrees = Object.entries(calc.inputs);
  return (
    <section className="break-inside-avoid rounded-lg border border-border">
      <header className="flex flex-wrap items-baseline justify-between gap-2 bg-vinci-bleu px-4 py-2 text-white">
        <h4 className="font-bold">{titre}</h4>
        {resume && <span className="text-sm font-semibold">{resume}</span>}
      </header>
      <div className="flex flex-col gap-3 p-4 text-sm">
        <p>
          <span className="font-semibold text-primary">Formule : </span>
          {calc.formula}
        </p>
        {entrees.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-vinci-bleu text-white">
                  <th className="px-3 py-1.5 font-bold">Entrée</th>
                  <th className="px-3 py-1.5 text-right font-bold">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {entrees.map(([cle, e]) => (
                  <tr key={cle} className="odd:bg-background even:bg-vinci-gris-light">
                    <td className="px-3 py-1.5">{e.label}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatCalcValue(e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {calc.source && (
          <p>
            <span className="font-semibold text-primary">Source : </span>
            {calc.source}
          </p>
        )}
        {calc.warnings.length > 0 && (
          <ul className="list-disc pl-5 text-vinci-rouge-dark">
            {calc.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
