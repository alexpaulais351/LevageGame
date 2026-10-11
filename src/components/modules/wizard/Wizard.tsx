"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { computeStudy } from "@/lib/study/compute";
import { ETAPES } from "@/lib/study/schemas";
import { thresholds } from "@/lib/study/mapping";
import { useStudy } from "@/stores/study";

import { ETAPES_VISUELS, VisualsPanel } from "../visuals/VisualsPanel";
import { AfficherErreursContext } from "./fields";
import { ResultPanel } from "./ResultPanel";
import { Stepper } from "./Stepper";
import { StepAccessoires } from "./steps/StepAccessoires";
import { StepCharge } from "./steps/StepCharge";
import { StepEnvironnement } from "./steps/StepEnvironnement";
import { StepGeometrie } from "./steps/StepGeometrie";
import { StepMachine } from "./steps/StepMachine";
import { StepOperation } from "./steps/StepOperation";
import { StepPersonnel } from "./steps/StepPersonnel";
import { StepSol } from "./steps/StepSol";
import { StepSynthese } from "./steps/StepSynthese";

export function Wizard() {
  const [hydrate, setHydrate] = useState(false);
  const data = useStudy((s) => s.data);
  const etape = useStudy((s) => s.etape);
  const setEtape = useStudy((s) => s.setEtape);
  const reinitialiser = useStudy((s) => s.reinitialiser);
  const [confirmer, setConfirmer] = useState(false);
  const [toutesErreurs, setToutesErreurs] = useState(false);

  // Hydratation IndexedDB côté client uniquement.
  useEffect(() => {
    let actif = true;
    Promise.resolve(useStudy.persist.rehydrate())
      .catch(() => undefined)
      .finally(() => {
        if (actif) setHydrate(true);
      });
    return () => {
      actif = false;
    };
  }, []);

  const result = useMemo(() => computeStudy(data), [data]);
  const seuils = useMemo(() => {
    const t = thresholds(data);
    return {
      vert: Number.isFinite(t.greenMax) ? t.greenMax : 0.8,
      orange: Number.isFinite(t.orangeMax) ? t.orangeMax : 1,
    };
  }, [data]);

  const aller = (i: number) => {
    setEtape(i);
    setToutesErreurs(false);
  };
  const suivant = () => {
    // Première pression sur une étape incomplète : on affiche les erreurs ; la seconde passe quand même.
    if (!result.completude[etape] && !toutesErreurs) {
      setToutesErreurs(true);
      return;
    }
    aller(etape + 1);
  };

  if (!hydrate) {
    return (
      <p role="status" className="text-muted-foreground">
        Chargement de votre étude…
      </p>
    );
  }

  const corps = [
    <StepOperation key="0" />,
    <StepCharge key="1" />,
    <StepAccessoires key="2" />,
    <StepMachine key="3" />,
    <StepGeometrie key="4" />,
    <StepSol key="5" />,
    <StepEnvironnement key="6" />,
    <StepPersonnel key="7" />,
    <StepSynthese key="8" result={result} />,
  ][etape];

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-6">
      <div className="flex min-w-0 flex-col gap-4 pb-4">
        <header className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
          <div>
            <h1 className="text-2xl font-bold text-primary">Nouvelle adéquation</h1>
            <p className="text-sm text-foreground/70">
              Mode invité — étude conservée dans ce navigateur (non enregistrée).
            </p>
          </div>
          {confirmer ? (
            <div role="alertdialog" aria-label="Confirmer la nouvelle adéquation" className="flex flex-wrap items-center gap-2 rounded-md border border-vinci-rouge bg-vinci-rouge-xlight p-2 text-sm">
              <span>Effacer l&apos;étude en cours ?</span>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                onClick={() => {
                  reinitialiser();
                  setConfirmer(false);
                  setToutesErreurs(false);
                }}
              >
                Confirmer
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={() => setConfirmer(false)}>
                Annuler
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="lg" onClick={() => setConfirmer(true)}>
              <RotateCcw />
              Nouvelle adéquation
            </Button>
          )}
        </header>

        <Stepper courante={etape} completude={result.completude} onSelect={aller} />

        {ETAPES_VISUELS.includes(etape) && <VisualsPanel result={result} seuils={seuils} />}

        <AfficherErreursContext.Provider value={toutesErreurs}>{corps}</AfficherErreursContext.Provider>

        <div className="flex justify-between gap-3">
          <Button type="button" variant="outline" size="lg" disabled={etape === 0} onClick={() => aller(etape - 1)}>
            <ChevronLeft />
            Précédent
          </Button>
          <span className="self-center text-sm text-foreground/70">
            {etape + 1} / {ETAPES.length}
          </span>
          <Button type="button" size="lg" disabled={etape === 8} onClick={suivant}>
            {!result.completude[etape] && toutesErreurs ? "Passer quand même" : "Suivant"}
            <ChevronRight />
          </Button>
        </div>
      </div>

      <aside className="hidden lg:sticky lg:top-0 lg:block" aria-label="Panneau de résultat">
        <ResultPanel result={result} seuils={seuils} variante="colonne" />
      </aside>

      <div className="sticky bottom-0 z-20 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 lg:hidden">
        <ResultPanel result={result} seuils={seuils} variante="barre" />
      </div>
    </div>
  );
}
