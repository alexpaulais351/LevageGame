"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RotateCcw, Save } from "lucide-react";

import { enregistrerVersion } from "@/actions/versions";
import { Button } from "@/components/ui/button";
import { indiceDepuisNumero } from "@/lib/account/indice";
import { jsonStable } from "@/lib/account/version";
import { computeStudy } from "@/lib/study/compute";
import { ETAPES } from "@/lib/study/schemas";
import { thresholds } from "@/lib/study/mapping";
import type { StudyData } from "@/lib/study/types";
import { setPersistanceInvite, useStudy } from "@/stores/study";

import { BrouillonInvite } from "../account/BrouillonInvite";
import { RestaurerVersion } from "../account/RestaurerVersion";
import { ExportPdfButton, PdfMetaContext } from "../pdf/ExportPdfButton";
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

/** Étude d'un projet (compte) chargée dans l'assistant. */
export interface EtudeContexte {
  etudeId: string;
  projetId: string;
  projetNom: string;
  titre: string;
  reference: string | null;
  /** Version chargée (numéro) et version courante de l'étude. */
  versionIndex: number;
  versionCouranteIndex: number;
  /** Version ancienne ouverte en lecture : aucune saisie, restauration possible. */
  lectureSeule: boolean;
  data: StudyData;
  pdf: { redacteur: string; entreprise: string; logoUrl: string | null };
}

interface WizardProps {
  etude?: EtudeContexte;
  /** Utilisateur connecté sur /outil : propose l'enregistrement dans un projet. */
  connecte?: boolean;
  /** Seuils du compte, appliqués à une étude vierge. */
  seuilsCompte?: { vert: number; orange: number } | null;
}

export function Wizard({ etude, connecte = false, seuilsCompte = null }: WizardProps) {
  const [hydrate, setHydrate] = useState(false);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [erreurSave, setErreurSave] = useState<string | null>(null);
  const [enregistrement, demarrerSave] = useTransition();
  // Recharger le store uniquement quand l'étude (ou la version lue) change, pas après un enregistrement.
  const cleChargement = etude ? `${etude.etudeId}:${etude.lectureSeule ? etude.versionIndex : "edition"}` : null;
  const data = useStudy((s) => s.data);
  const etape = useStudy((s) => s.etape);
  const setEtape = useStudy((s) => s.setEtape);
  const reinitialiser = useStudy((s) => s.reinitialiser);
  const [confirmer, setConfirmer] = useState(false);
  const [toutesErreurs, setToutesErreurs] = useState(false);

  // Étude de projet : chargement dans le store, brouillon invité (IndexedDB) laissé intact.
  useEffect(() => {
    if (!etude) return;
    setPersistanceInvite(false);
    useStudy.getState().charger(etude.data);
    setBaseline(jsonStable(useStudy.getState().data));
    setMessage(null);
    setHydrate(true);
    return () => setPersistanceInvite(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleChargement]);

  // Hydratation IndexedDB côté client uniquement (mode invité).
  useEffect(() => {
    if (etude) return;
    let actif = true;
    Promise.resolve(useStudy.persist.rehydrate())
      .catch(() => undefined)
      .finally(() => {
        if (!actif) return;
        // Étude vierge d'un utilisateur connecté : ses seuils par défaut s'appliquent.
        const { majLe, data: d } = useStudy.getState();
        if (seuilsCompte && majLe === null && (d.seuils.vertPct !== seuilsCompte.vert || d.seuils.orangePct !== seuilsCompte.orange)) {
          useStudy.getState().appliquerSeuilsCompte(seuilsCompte.vert, seuilsCompte.orange);
        }
        setHydrate(true);
      });
    return () => {
      actif = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modifie = useMemo(
    () => Boolean(etude && !etude.lectureSeule && baseline !== null && jsonStable(data) !== baseline),
    [etude, baseline, data],
  );

  // Alerte de fermeture avec des modifications non enregistrées.
  useEffect(() => {
    if (!modifie) return;
    const f = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [modifie]);

  const enregistrer = () =>
    demarrerSave(async () => {
      setErreurSave(null);
      setMessage(null);
      const instantane = useStudy.getState().data;
      const r = await enregistrerVersion({ etudeId: etude!.etudeId, data: instantane });
      if (!r.ok) return setErreurSave(r.error);
      setBaseline(jsonStable(instantane));
      setMessage(`Version ${r.data.indice} enregistrée.`);
    });

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

  const metaPdf = etude
    ? {
        reference: etude.reference ?? undefined,
        indice: indiceDepuisNumero(etude.versionIndex),
        redacteur: etude.pdf.redacteur,
        entreprise: etude.pdf.entreprise,
        logoUrl: etude.pdf.logoUrl,
      }
    : undefined;

  return (
    <PdfMetaContext.Provider value={metaPdf}>
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-6">
      <div className="flex min-w-0 flex-col gap-4 pb-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          {etude ? (
            <div className="min-w-64 flex-1">
              <Link href={`/projets/${etude.projetId}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <ChevronLeft className="size-4" aria-hidden /> {etude.projetNom}
              </Link>
              <h1 className="break-words text-2xl font-bold text-primary">{etude.titre}</h1>
              <p className="text-sm text-foreground/70">
                {etude.reference ?? "Sans référence"} · indice {indiceDepuisNumero(etude.versionIndex)}
                {etude.lectureSeule ? " (lecture seule)" : ` · version courante ${indiceDepuisNumero(etude.versionCouranteIndex)}`}
                {modifie && <strong className="ml-2 text-vinci-rouge-dark">Modifications non enregistrées</strong>}
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-primary">Nouvelle adéquation</h1>
              <p className="text-sm text-foreground/70">
                {connecte
                  ? "Étude en cours conservée dans ce navigateur (non enregistrée dans un projet)."
                  : "Mode invité — étude conservée dans ce navigateur (non enregistrée)."}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-start gap-2">
          <ExportPdfButton variant="outline" />
          {etude && !etude.lectureSeule && (
            <Button type="button" size="lg" onClick={enregistrer} disabled={enregistrement} aria-busy={enregistrement}>
              <Save />
              {enregistrement ? "Enregistrement…" : "Enregistrer une version"}
            </Button>
          )}
          {etude?.lectureSeule && (
            <>
              <RestaurerVersion etudeId={etude.etudeId} projetId={etude.projetId} index={etude.versionIndex} />
              <Button asChild variant="outline" size="lg">
                <Link href={`/projets/${etude.projetId}/etudes/${etude.etudeId}`}>Version courante</Link>
              </Button>
            </>
          )}
          {!etude && (confirmer ? (
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
          ))}
          </div>
        </header>
        {(message || erreurSave) && (
          <p
            role={erreurSave ? "alert" : "status"}
            className={erreurSave ? "text-sm font-medium text-vinci-rouge-dark" : "rounded-md border border-primary-light bg-vinci-bleu-xlight px-3 py-2 text-sm text-vinci-bleu-dark"}
          >
            {erreurSave ?? message}
          </p>
        )}
        {etude?.lectureSeule && (
          <p role="note" className="rounded-md border border-verdict-jaune bg-verdict-jaune-bg px-3 py-2 text-sm text-vinci-bleu-dark">
            Version {indiceDepuisNumero(etude.versionIndex)} ouverte en lecture seule. Pour la reprendre, utilisez « Restaurer cette
            version » : elle deviendra une nouvelle version, l&apos;historique n&apos;est jamais modifié.
          </p>
        )}
        {!etude && connecte && <BrouillonInvite source="store" variante="bouton" />}

        <Stepper courante={etape} completude={result.completude} onSelect={aller} />

        {ETAPES_VISUELS.includes(etape) && (
          <div className={etude?.lectureSeule ? "pointer-events-none" : undefined}>
            <VisualsPanel result={result} seuils={seuils} />
          </div>
        )}

        <fieldset
          disabled={etude?.lectureSeule}
          className="m-0 min-w-0 border-0 p-0 [&_input:disabled]:bg-vinci-gris-light [&_input:disabled]:opacity-100 [&_select:disabled]:bg-vinci-gris-light [&_select:disabled]:opacity-100 [&_textarea:disabled]:bg-vinci-gris-light [&_textarea:disabled]:opacity-100"
        >
          <AfficherErreursContext.Provider value={toutesErreurs}>{corps}</AfficherErreursContext.Provider>
        </fieldset>

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
    </PdfMetaContext.Provider>
  );
}
