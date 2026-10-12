"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Info } from "lucide-react";

import { chartSourceLabel, type LoadChart } from "@/engine";
import { getCatalogProvider, getMesMachinesProvider, MESSAGE_CATALOGUE_VIDE } from "@/lib/catalog";
import { formatMasse } from "@/lib/utils";
import { useStudy } from "@/stores/study";
import { LIBELLE_TYPE, typeMachineDepuis } from "@/lib/visuals/silhouettes";

import { Grille, SousTitre, StepShell } from "../StepShell";
import { SelectField, UNITES_MASSE, UnitNumberField } from "../fields";
import { MachineVignette } from "../../visuals/SilhouetteSvg";
import { useErreurs } from "../use-erreurs";
import { useCatalogList } from "../use-catalog";
import { ChoixSourceMachines, type SourceMachines } from "../ChoixSourceMachines";

export function StepMachine() {
  const m = useStudy((s) => s.data.machine);
  const patch = useStudy((s) => s.patch);
  const err = useErreurs("machine");
  const sel = m.selection;
  const [source, setSource] = useState<SourceMachines>(sel?.personnelle ? "mine" : "public");
  const provider = source === "mine" ? getMesMachinesProvider() : getCatalogProvider();

  const [typeId, setTypeId] = useState(sel?.typeId ?? "");
  const [manufId, setManufId] = useState(sel?.manufacturerId ?? "");
  const [machineId, setMachineId] = useState(sel?.machineId ?? "");
  const [configId, setConfigId] = useState(sel?.configurationId ?? "");
  const [chargementAbaque, setChargementAbaque] = useState(false);
  const [erreurAbaque, setErreurAbaque] = useState<string | null>(null);

  const types = useCatalogList(`${source}:types`, () => provider.listTypes());
  const manufs = useCatalogList(typeId ? `${source}:m:${typeId}` : null, () => provider.listManufacturers(typeId));
  const modeles = useCatalogList(typeId && manufId ? `${source}:d:${typeId}:${manufId}` : null, () =>
    provider.listModels(typeId, manufId),
  );
  const configs = useCatalogList(machineId ? `${source}:c:${machineId}` : null, () => provider.listConfigurations(machineId));

  const efface = () => patch("machine", { selection: null });
  const surSource = (v: SourceMachines) => {
    setSource(v);
    setTypeId("");
    setManufId("");
    setMachineId("");
    setConfigId("");
    efface();
  };
  const surType = (v: string) => {
    setTypeId(v);
    setManufId("");
    setMachineId("");
    setConfigId("");
    efface();
  };
  const surManuf = (v: string) => {
    setManufId(v);
    setMachineId("");
    setConfigId("");
    efface();
  };
  const surModele = (v: string) => {
    setMachineId(v);
    setConfigId("");
    efface();
  };
  const surConfig = async (v: string) => {
    setConfigId(v);
    const type = types.items.find((t) => t.id === typeId);
    const fab = manufs.items.find((f) => f.id === manufId);
    const mod = modeles.items.find((x) => x.id === machineId);
    const conf = configs.items.find((c) => c.id === v);
    if (!type || !fab || !mod || !conf) return;
    setChargementAbaque(true);
    setErreurAbaque(null);
    try {
      const chart = await provider.getChart(v);
      patch("machine", {
        selection: {
          typeId,
          typeLabel: type.label,
          manufacturerId: manufId,
          manufacturerName: fab.name,
          machineId,
          model: mod.model,
          configurationId: v,
          configurationLabel: conf.label,
          chart,
          ...(source === "mine" ? { personnelle: true, calage: mod.calage ?? null, photoPath: mod.photoPath ?? null } : {}),
        },
        ...(conf.hookBlockMassKg !== null ? { moufleCrochetKg: conf.hookBlockMassKg } : {}),
      });
    } catch (e) {
      setErreurAbaque(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setChargementAbaque(false);
    }
  };

  const catalogueVide = !types.chargement && !types.erreur && types.items.length === 0 && source === "public";
  const aucuneMachinePerso = source === "mine" && !types.chargement && !types.erreur && types.items.length === 0;
  const opt = <T,>(l: T[], v: (x: T) => string, t: (x: T) => string) => l.map((x) => ({ value: v(x), label: t(x) }));
  const chart: LoadChart | null = sel?.chart ?? null;
  const typeCourant = types.items.find((t) => t.id === typeId);
  const typeVisuel = typeCourant ? typeMachineDepuis(typeCourant.code, typeCourant.label) : null;

  return (
    <StepShell
      numero={4}
      titre="Moyen de levage"
      description="Type, constructeur, modèle puis configuration : l'abaque de la configuration est lu tel que publié, sans extrapolation."
    >
      <ChoixSourceMachines valeur={source} onChange={surSource} nom="étape Moyen de levage" />
      {types.erreur && (
        <p role="alert" className="rounded-md border border-vinci-rouge bg-vinci-rouge-xlight p-3 text-sm">
          Catalogue indisponible : {types.erreur}
        </p>
      )}
      {catalogueVide && (
        <div role="status" className="flex gap-3 rounded-md border border-verdict-jaune bg-verdict-jaune-bg p-4 text-sm">
          <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-semibold">{MESSAGE_CATALOGUE_VIDE}.</p>
            <p className="mt-1">
              Sans abaque, aucune capacité ne peut être lue : le verdict reste « non adéquat » (donnée manquante).
            </p>
          </div>
        </div>
      )}
      {aucuneMachinePerso && (
        <p role="status" className="flex gap-2 rounded-md border border-verdict-jaune bg-verdict-jaune-bg p-3 text-sm" data-testid="aucune-machine-perso">
          <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <span>
            Aucune machine personnelle. Créez-en une depuis la page <Link className="font-semibold underline" href="/machines?vue=mes" target="_blank">Machines</Link> avec son abaque et le PDF constructeur.
          </span>
        </p>
      )}
      {typeVisuel && (
        <div className="flex items-center gap-3" data-testid="apercu-type">
          <MachineVignette type={typeVisuel} largeur={96} className="shrink-0 rounded-md border border-border" />
          <p className="text-sm">
            <span className="font-semibold text-primary">{LIBELLE_TYPE[typeVisuel]}</span>
            <span className="block text-xs text-muted-foreground">Silhouette indicative — ne remplace pas les plans constructeur.</span>
          </p>
        </div>
      )}
      <Grille>
        <SelectField
          label="Type de moyen de levage"
          value={typeId}
          placeholder={types.chargement ? "Chargement…" : "Choisir un type"}
          options={opt(types.items, (t) => t.id, (t) => t.label)}
          disabled={types.items.length === 0}
          onChange={surType}
        />
        <SelectField
          label="Constructeur"
          value={manufId}
          placeholder="Choisir un constructeur"
          options={opt(manufs.items, (f) => f.id, (f) => f.name)}
          disabled={!typeId || manufs.items.length === 0}
          onChange={surManuf}
        />
        <SelectField
          label="Modèle"
          value={machineId}
          placeholder="Choisir un modèle"
          options={opt(modeles.items, (x) => x.id, (x) => x.model)}
          disabled={!manufId || modeles.items.length === 0}
          onChange={surModele}
        />
        <SelectField
          label="Configuration"
          value={configId}
          placeholder="Choisir une configuration"
          options={opt(configs.items, (c) => c.id, (c) => c.label)}
          disabled={!machineId || configs.items.length === 0}
          onChange={surConfig}
          error={err.selection}
        />
      </Grille>

      {chargementAbaque && <p className="text-sm text-muted-foreground">Lecture de l&apos;abaque…</p>}
      {erreurAbaque && (
        <p role="alert" className="text-sm font-medium text-vinci-rouge">
          Abaque indisponible : {erreurAbaque}
        </p>
      )}
      {sel && !chart && !chargementAbaque && (
        <p role="alert" className="text-sm font-medium text-vinci-rouge">
          Aucun abaque pour cette configuration : le calcul de capacité est impossible.
        </p>
      )}
      {chart && (
        <div className="rounded-md border border-border p-4 text-sm">
          <div className="flex items-start gap-2">
            <div>
              <p className="font-semibold text-primary">
                {sel?.manufacturerName} {sel?.model} — {sel?.configurationLabel}
              </p>
              <p className="mt-1 text-muted-foreground">{chartSourceLabel(chart)}</p>
              {sel?.machineId && (
                <Link
                  href={`/machines/${sel.machineId}`}
                  target="_blank"
                  data-testid="lien-fiche-machine"
                  className="mt-1 inline-flex min-h-11 items-center gap-1 font-semibold text-primary-light underline"
                >
                  <FileText className="size-4" aria-hidden />
                  Fiche machine et PDF de l&apos;abaque
                </Link>
              )}
              <p className="mt-1">
                {chart.interpolationAllowed
                  ? "Interpolation en portée autorisée par le constructeur."
                  : "Entre deux nœuds : valeur la plus défavorable (pas d'interpolation)."}{" "}
                {chart.deductionsIncluded
                  ? "Capacités déjà nettes des déductions."
                  : "Capacités brutes : moufle / crochet comptés dans la charge totale."}
              </p>
            </div>
          </div>
        </div>
      )}

      <SousTitre>Masses sous la flèche</SousTitre>
      <Grille cols={3}>
        <UnitNumberField
          label="Moufle / crochet"
          unites={UNITES_MASSE}
          value={m.moufleCrochetKg}
          onChange={(v) => patch("machine", { moufleCrochetKg: v })}
          error={err.moufleCrochetKg}
          hint={
            sel && m.moufleCrochetKg !== null ? `Valeur retenue : ${formatMasse(m.moufleCrochetKg)}` : "À saisir si non fournie par la configuration."
          }
        />
        <UnitNumberField
          label="Fléchette repliée"
          unites={UNITES_MASSE}
          value={m.flechetteReplieeKg}
          onChange={(v) => patch("machine", { flechetteReplieeKg: v })}
          hint="Facultatif, si l'abaque l'impose."
        />
        <UnitNumberField
          label="Autres masses"
          unites={UNITES_MASSE}
          value={m.autresKg}
          onChange={(v) => patch("machine", { autresKg: v })}
          hint="Facultatif."
        />
      </Grille>
    </StepShell>
  );
}
