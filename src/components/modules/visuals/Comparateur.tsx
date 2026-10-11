"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LoadChart } from "@/engine";
import { getCatalogProvider, getMesMachinesProvider, MESSAGE_CATALOGUE_VIDE } from "@/lib/catalog";
import { formatTaux } from "@/lib/study/format";
import type { StudyResult } from "@/lib/study/compute";
import type { MachineSelection, StudyData } from "@/lib/study/types";
import { formatMasse } from "@/lib/utils";
import { typeMachineDepuis } from "@/lib/visuals/silhouettes";

import { SelectField } from "../wizard/fields";
import { VERDICT_LIBELLE, VERDICT_STYLE } from "../wizard/ResultPanel";
import { useCatalogList } from "../wizard/use-catalog";
import { ChoixSourceMachines, type SourceMachines } from "../wizard/ChoixSourceMachines";
import { cn } from "@/lib/utils";

import { axeYIncompatible, etudeAvecAlternative, evaluerAlternative, type Alternative } from "./comparateur";
import { couleurZone, positionsVisuelles } from "./model";
import { typeDeLaSelection } from "./silhouette-model";
import { MachineVignette } from "./SilhouetteSvg";

interface Props {
  data: StudyData;
  result: StudyResult;
  onAdopter: (alt: Alternative) => void;
}

function Colonne({ titre, sous, result, data }: { titre: string; sous: string; result: StudyResult; data: StudyData }) {
  const v = result.verdict.value;
  const positions = positionsVisuelles(data, result);
  const typeVisuel = data.machine.selection ? typeDeLaSelection(data.machine.selection) : null;
  return (
    <section className="min-w-0 rounded-lg border border-border p-3" aria-label={titre}>
      <div className="mb-2 flex items-start gap-3">
        {typeVisuel && <MachineVignette type={typeVisuel.type} largeur={80} className="shrink-0 rounded-md border border-border" />}
        <div className="min-w-0">
          <h4 className="text-xs font-bold uppercase tracking-wide text-primary">{titre}</h4>
          <p className="break-words text-sm font-semibold">{sous}</p>
        </div>
      </div>
      <div className={cn("mb-2 rounded border-l-8 px-3 py-2", VERDICT_STYLE[v.verdict].fond, VERDICT_STYLE[v.verdict].bord)}>
        <p className="text-sm font-bold">{VERDICT_LIBELLE[v.verdict]}</p>
        <p className="text-lg font-bold tabular-nums" data-testid="taux-pire-cas">
          {v.tauxMax === null ? (v.positionDefavorable ? "Hors abaque" : "—") : formatTaux(v.tauxMax)}
        </p>
        <p className="text-xs text-foreground/70">taux — position la plus défavorable{v.positionDefavorable ? ` : ${v.positionDefavorable.label}` : ""}</p>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
        <dt className="text-foreground/70">Charge totale</dt>
        <dd className="text-right font-semibold tabular-nums">{result.chargeTotale.value === null ? "—" : formatMasse(result.chargeTotale.value)}</dd>
        {positions.map((p) => (
          <div key={p.id} className="contents">
            <dt className="flex items-center gap-2 text-foreground/70">
              <span className="inline-block size-3 shrink-0 rounded-full" style={{ background: couleurZone(p.zone) }} aria-hidden />
              {p.nom}
            </dt>
            <dd className="text-right font-semibold tabular-nums">{p.horsAbaque ? "Hors abaque" : p.capaciteKg === null ? "—" : formatMasse(p.capaciteKg)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Panneau « Comparer » : évalue une autre machine / configuration sur le même levage, sans toucher à l'étude. */
export function Comparateur({ data, result, onAdopter }: Props) {
  const sel = data.machine.selection;
  const [source, setSource] = useState<SourceMachines>(sel?.personnelle ? "mine" : "public");
  const provider = source === "mine" ? getMesMachinesProvider() : getCatalogProvider();
  const [typeId, setTypeId] = useState(sel?.typeId ?? "");
  const [manufId, setManufId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [configId, setConfigId] = useState("");
  const [chart, setChart] = useState<{ configId: string; chart: LoadChart | null; erreur: string | null } | null>(null);

  const types = useCatalogList(`${source}:types`, () => provider.listTypes());
  const manufs = useCatalogList(typeId ? `${source}:m:${typeId}` : null, () => provider.listManufacturers(typeId));
  const modeles = useCatalogList(typeId && manufId ? `${source}:d:${typeId}:${manufId}` : null, () => provider.listModels(typeId, manufId));
  const configs = useCatalogList(machineId ? `${source}:c:${machineId}` : null, () => provider.listConfigurations(machineId));

  useEffect(() => {
    if (!configId) return;
    let annule = false;
    provider
      .getChart(configId)
      .then((c) => !annule && setChart({ configId, chart: c, erreur: null }))
      .catch((e: unknown) => !annule && setChart({ configId, chart: null, erreur: e instanceof Error ? e.message : "Erreur inconnue" }));
    return () => {
      annule = true;
    };
  }, [configId, provider]);

  const alt: Alternative | null = useMemo(() => {
    const type = types.items.find((t) => t.id === typeId);
    const fab = manufs.items.find((f) => f.id === manufId);
    const mod = modeles.items.find((x) => x.id === machineId);
    const conf = configs.items.find((c) => c.id === configId);
    if (!type || !fab || !mod || !conf || !chart || chart.configId !== configId || !chart.chart) return null;
    const selection: MachineSelection = {
      typeId,
      typeLabel: type.label,
      manufacturerId: manufId,
      manufacturerName: fab.name,
      machineId,
      model: mod.model,
      configurationId: configId,
      configurationLabel: conf.label,
      chart: chart.chart,
      ...(source === "mine" ? { personnelle: true, calage: mod.calage ?? null, photoPath: mod.photoPath ?? null } : {}),
    };
    return { selection, moufleCrochetKg: conf.hookBlockMassKg };
  }, [source, types.items, manufs.items, modeles.items, configs.items, typeId, manufId, machineId, configId, chart]);

  const resultAlt = useMemo(() => (alt ? evaluerAlternative(data, alt) : null), [alt, data]);
  const memeConfig = alt !== null && sel?.configurationId === alt.selection.configurationId;
  const catalogueVide = !types.chargement && !types.erreur && types.items.length === 0 && source === "public";
  const aucuneMachinePerso = source === "mine" && !types.chargement && !types.erreur && types.items.length === 0;
  const surSource = (v: SourceMachines) => {
    setSource(v);
    setTypeId("");
    setManufId("");
    setMachineId("");
    setConfigId("");
    setChart(null);
  };
  const opt = <T,>(l: T[], v: (x: T) => string, t: (x: T) => string) => l.map((x) => ({ value: v(x), label: t(x) }));
  const typeTeste = types.items.find((t) => t.id === typeId);
  const typeTesteVisuel = typeTeste ? typeMachineDepuis(typeTeste.code, typeTeste.label) : null;
  const nomActuelle = sel ? `${sel.manufacturerName} ${sel.model} — ${sel.configurationLabel}` : "Aucune machine choisie";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/80">
        Testez une autre machine ou configuration sur le même levage (charge, accessoires et positions inchangés). L&apos;étude n&apos;est
        modifiée que si vous adoptez la configuration.
      </p>
      <ChoixSourceMachines valeur={source} onChange={surSource} nom="comparateur" />
      {aucuneMachinePerso && (
        <p role="status" className="flex gap-2 rounded-md border border-verdict-jaune bg-verdict-jaune-bg p-3 text-sm">
          <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          Aucune machine personnelle : créez-en une depuis la page Machines.
        </p>
      )}
      {types.erreur && <p role="alert" className="rounded-md border border-vinci-rouge bg-vinci-rouge-xlight p-3 text-sm">Catalogue indisponible : {types.erreur}</p>}
      {catalogueVide && (
        <p role="status" className="flex gap-2 rounded-md border border-verdict-jaune bg-verdict-jaune-bg p-3 text-sm">
          <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          {MESSAGE_CATALOGUE_VIDE}
        </p>
      )}
      {typeTesteVisuel && (
        <div className="flex items-center gap-3" data-testid="apercu-type-comparateur">
          <MachineVignette type={typeTesteVisuel} largeur={72} className="shrink-0 rounded-md border border-border" />
          <p className="text-xs text-foreground/70">Silhouette indicative du type testé — ne remplace pas les plans constructeur.</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SelectField label="Type" value={typeId} placeholder="Choisir…" options={opt(types.items, (t) => t.id, (t) => t.label)}
          onChange={(v) => { setTypeId(v); setManufId(""); setMachineId(""); setConfigId(""); setChart(null); }} />
        <SelectField label="Constructeur" value={manufId} placeholder="Choisir…" disabled={!typeId} options={opt(manufs.items, (f) => f.id, (f) => f.name)}
          onChange={(v) => { setManufId(v); setMachineId(""); setConfigId(""); setChart(null); }} />
        <SelectField label="Modèle" value={machineId} placeholder="Choisir…" disabled={!manufId} options={opt(modeles.items, (x) => x.id, (x) => x.model)}
          onChange={(v) => { setMachineId(v); setConfigId(""); setChart(null); }} />
        <SelectField label="Configuration" value={configId} placeholder="Choisir…" disabled={!machineId} options={opt(configs.items, (c) => c.id, (c) => c.label)}
          onChange={(v) => { setConfigId(v); setChart(null); }} />
      </div>
      {chart?.erreur && <p role="alert" className="text-sm text-vinci-rouge">Abaque indisponible : {chart.erreur}</p>}
      {configId && chart && chart.configId === configId && !chart.chart && !chart.erreur && (
        <p role="status" className="text-sm">Aucun abaque pour cette configuration : comparaison impossible.</p>
      )}

      {resultAlt && alt && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Colonne titre="Étude actuelle" sous={nomActuelle} result={result} data={data} />
            <Colonne
              titre="Configuration testée"
              sous={`${alt.selection.manufacturerName} ${alt.selection.model} — ${alt.selection.configurationLabel}`}
              result={resultAlt}
              data={etudeAvecAlternative(data, alt)}
            />
          </div>
          {axeYIncompatible(data, alt.selection.chart) && (
            <p className="text-xs text-foreground/70">
              Cet abaque demande une longueur de flèche / une hauteur que vos positions ne renseignent pas : capacités « hors abaque » jusqu&apos;à saisie à l&apos;étape 5.
            </p>
          )}
          <Button type="button" size="lg" className="self-start" disabled={memeConfig} onClick={() => onAdopter(alt)}>
            <Check />
            {memeConfig ? "Configuration déjà adoptée" : "Adopter cette configuration"}
          </Button>
        </>
      )}
    </div>
  );
}
