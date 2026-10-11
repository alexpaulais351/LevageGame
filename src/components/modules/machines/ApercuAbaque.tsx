"use client";

import { useMemo, useState } from "react";

import type { LoadChart } from "@/engine";
import { computeStudy } from "@/lib/study/compute";
import { createInitialData } from "@/lib/study/defaults";
import { formatNombreAuto } from "@/lib/study/format";

import { lignesAbaque } from "../visuals/geometry";
import { LoadChartView } from "../visuals/LoadChartView";

const SEUILS = { vert: 0.8, orange: 1 };
const AUCUNE = () => undefined;

/** Courbe de charge en escalier d'un abaque (aperçu avant enregistrement, fiche machine) — réutilise LoadChartView. */
export function ApercuAbaque({ chart }: { chart: LoadChart }) {
  const ys = useMemo(() => lignesAbaque(chart).map((l) => l.y).filter((y): y is number => y !== null), [chart]);
  const [choix, setChoix] = useState<number | null>(null);
  const yActif = chart.axisY === "none" ? null : ys.includes(choix as number) ? choix : (ys[0] ?? null);

  const { data, result } = useMemo(() => {
    const d = createInitialData();
    d.machine.selection = {
      typeId: "",
      typeLabel: "",
      manufacturerId: "",
      manufacturerName: "",
      machineId: "",
      model: "",
      configurationId: "",
      configurationLabel: "",
      chart,
    };
    d.geometrie.positions = [{ id: "apercu", nom: "Aperçu", porteeM: null, yM: yActif, angleDeg: null }];
    return { data: d, result: computeStudy(d) };
  }, [chart, yActif]);

  return (
    <div className="flex flex-col gap-3" data-testid="apercu-abaque">
      {ys.length > 1 && (
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{chart.axisY === "height_m" ? "Hauteur mise en avant" : "Flèche mise en avant"}</span>
          <select
            className="h-11 rounded-md border border-input bg-background px-3 text-base"
            value={yActif ?? ""}
            onChange={(e) => setChoix(Number(e.target.value))}
          >
            {ys.map((y) => (
              <option key={y} value={y}>
                {formatNombreAuto(y)} m
              </option>
            ))}
          </select>
        </label>
      )}
      <LoadChartView data={data} result={result} seuils={SEUILS} selectionId="apercu" onSelect={AUCUNE} onPortee={AUCUNE} />
    </div>
  );
}
