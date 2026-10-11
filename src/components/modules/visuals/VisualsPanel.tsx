"use client";

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StudyResult } from "@/lib/study/compute";
import { cn } from "@/lib/utils";
import { useStudy } from "@/stores/study";

import { Comparateur } from "./Comparateur";
import { ElevationView } from "./ElevationView";
import { LoadChartView } from "./LoadChartView";
import { PlanView } from "./PlanView";
import { couleurZone, positionSelectionnee, positionsVisuelles, type PropsVue } from "./model";

/** Étapes (index) où le panneau de visuels est affiché : Machine, Géométrie, Synthèse. */
export const ETAPES_VISUELS = [3, 4, 8];

interface Props {
  result: StudyResult;
  seuils: { vert: number; orange: number };
}

/** Onglets Courbe / Élévation / Plan (+ Comparer), avec bouton plein écran. Se met à jour en direct avec le store. */
export function VisualsPanel({ result, seuils }: Props) {
  const data = useStudy((s) => s.data);
  const majPosition = useStudy((s) => s.majPosition);
  const patch = useStudy((s) => s.patch);
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [plein, setPlein] = useState(false);

  useEffect(() => {
    if (!plein) return;
    const fermer = (e: KeyboardEvent) => e.key === "Escape" && setPlein(false);
    document.addEventListener("keydown", fermer);
    return () => document.removeEventListener("keydown", fermer);
  }, [plein]);

  const positions = positionsVisuelles(data, result);
  const sel = positionSelectionnee(positions, result, selectionId);

  const vue: PropsVue = {
    data,
    result,
    seuils,
    selectionId: sel?.id ?? null,
    onSelect: setSelectionId,
    onPortee: (id, porteeM) => majPosition(id, { porteeM }),
  };

  return (
    <section
      aria-label="Visuels interactifs"
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4",
        plein && "fixed inset-0 z-50 overflow-auto rounded-none border-0 bg-background",
      )}
    >
      <Tabs defaultValue="courbe">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="h-auto flex-wrap">
            {[
              ["courbe", "Courbe"],
              ["elevation", "Élévation"],
              ["plan", "Plan"],
              ["comparer", "Comparer"],
            ].map(([v, t]) => (
              <TabsTrigger key={v} value={v} className="min-h-11 px-4 text-base">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button type="button" variant="outline" size="lg" onClick={() => setPlein((p) => !p)} aria-pressed={plein}>
            {plein ? <X /> : <Maximize2 />}
            {plein ? "Quitter le plein écran" : "Plein écran"}
          </Button>
        </div>

        {positions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Position affichée">
            <span className="text-sm text-foreground/70">Position :</span>
            {positions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectionId(p.id)}
                aria-pressed={p.id === sel?.id}
                className={cn(
                  "min-h-11 rounded-md border px-3 text-sm font-semibold",
                  p.id === sel?.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
                )}
              >
                <span className="mr-2 inline-block size-3 rounded-full align-middle" style={{ background: couleurZone(p.zone) }} aria-hidden />
                {p.nom}
              </button>
            ))}
          </div>
        )}

        <TabsContent value="courbe">
          <LoadChartView {...vue} />
        </TabsContent>
        <TabsContent value="elevation">
          <ElevationView {...vue} />
        </TabsContent>
        <TabsContent value="plan">
          <PlanView {...vue} />
        </TabsContent>
        <TabsContent value="comparer" forceMount className="data-[state=inactive]:hidden">
          <Comparateur
            data={data}
            result={result}
            onAdopter={(alt) => patch("machine", { selection: alt.selection, ...(alt.moufleCrochetKg !== null ? { moufleCrochetKg: alt.moufleCrochetKg } : {}) })}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
