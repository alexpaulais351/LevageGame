"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, FileText, Info, MoveHorizontal, Ruler } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalcDetail } from "@/components/modules/wizard/CalcDetail";
import { Gauge } from "@/components/modules/wizard/Gauge";
import { VERDICT_LIBELLE, VERDICT_STYLE } from "@/components/modules/wizard/ResultPanel";
import { NumberField, UnitNumberField, UNITES_MASSE } from "@/components/modules/wizard/fields";
import { Grille, StepShell } from "@/components/modules/wizard/StepShell";
import { StepMachine } from "@/components/modules/wizard/steps/StepMachine";
import { ElevationView } from "@/components/modules/visuals/ElevationView";
import { aimanter, domaineDeplacement, lignesAbaque } from "@/components/modules/visuals/geometry";
import { couleurZone } from "@/components/modules/visuals/model";
import { useExportAdequationRapide } from "@/hooks/useExportPDF";
import { accessoireVide } from "@/lib/study/defaults";
import { formatTaux } from "@/lib/study/format";
import { calculRapide, donneesRapides, ID_POSE_RAPIDE, resultatVisuelRapide } from "@/lib/study/rapide";
import { cn, formatMasse, formatNombreFR } from "@/lib/utils";
import { useStudy } from "@/stores/study";

const m = (v: number) => `${formatNombreFR(v, 2).replace(/,00$/, "")} m`;

/**
 * Adéquation rapide (D43) : une pose, sans projet ni dossier. Rien n'est enregistré.
 * Réutilise le store de l'assistant (réinitialisé à l'ouverture) et l'étape Moyen de levage.
 */
export function AdequationRapide({ redacteur, entreprise }: { redacteur: string; entreprise: string | null }) {
  const [pret, setPret] = useState(false);
  useEffect(() => {
    useStudy.getState().charger(donneesRapides());
    setPret(true);
  }, []);

  const data = useStudy((s) => s.data);
  const patch = useStudy((s) => s.patch);
  const majPosition = useStudy((s) => s.majPosition);
  const r = useMemo(() => calculRapide(data), [data]);
  const etude = useMemo(() => resultatVisuelRapide(data, r), [data, r]);
  const chartSel = data.machine.selection?.chart ?? null;
  const yPose = data.geometrie.positions[0]?.yM ?? null;
  const domaine = useMemo(
    () => (chartSel ? domaineDeplacement(lignesAbaque(chartSel), chartSel.axisY === "none" ? null : yPose) : null),
    [chartSel, yPose],
  );
  const exportPdf = useExportAdequationRapide();
  const exporterPdf = () =>
    exportPdf.exporter(async () => {
      const { buildRapidePdfModel, nomFichierRapide } = await import("@/lib/pdf/rapide-model");
      const date = new Date();
      return {
        model: buildRapidePdfModel({ data, resultat: r, redacteur, entreprise, date }),
        nom: nomFichierRapide({ modele: data.machine.selection?.model, date }),
      };
    });

  if (!pret) return null;
  const c = data.charge;
  const pos = data.geometrie.positions.find((p) => p.id === ID_POSE_RAPIDE) ?? data.geometrie.positions[0];
  const chart = data.machine.selection?.chart ?? null;
  const axeY = chart?.axisY ?? "none";
  const ysAbaque = chart && axeY !== "none" ? [...new Set(chart.points.map((x) => x.y).filter((x): x is number => x !== null))].sort((a, b) => a - b) : [];
  const masseAccessoires = data.accessoires.liste[0]?.masseKg ?? null;
  const setAccessoires = (v: number | null) =>
    patch("accessoires", { liste: v === null ? [] : [{ ...(data.accessoires.liste[0] ?? accessoireVide()), label: "Accessoires de levage", masseKg: v }] });

  const v = r.verdict.value;
  const p0 = v.positions[0] ?? null;
  const pret2 = chart !== null && r.chargeTotale.value !== null && pos?.porteeM !== null;
  const style = VERDICT_STYLE[v.verdict];
  const seuils = { vert: data.seuils.vertPct ?? 90, orange: data.seuils.orangePct ?? 100 };

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-start gap-2 rounded-md border border-vinci-gris bg-vinci-gris-light p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span>
          Vérification rapide d&apos;<strong>une pose</strong> à l&apos;abaque : capacité et taux d&apos;utilisation uniquement. Le sol, le vent, l&apos;élingage, les
          lignes électriques et le personnel ne sont pas contrôlés, et rien n&apos;est enregistré. Pour un dossier complet, utilisez l&apos;
          <Link href="/outil/projet" className="font-semibold text-primary underline">
            adéquation projet
          </Link>
          .
        </span>
      </p>

      <StepMachine numero={1} simplifie />

      <StepShell numero={2} titre="Charge et portée" description="Masse de la charge, marge, accessoires et distance de pose.">
        <Grille>
          <UnitNumberField
            label="Masse de la charge"
            unites={UNITES_MASSE}
            uniteInitiale={c.masseKg !== null && c.masseKg >= 1000 ? 1 : 0}
            value={c.masseKg}
            onChange={(x) => patch("charge", { masseKg: x })}
          />
          <NumberField
            label="Coefficient de marge sur la masse"
            value={c.coefMarge}
            onChange={(x) => patch("charge", { coefMarge: x })}
            hint="Ex. 1,1 = +10 % si la masse est estimée. 1 = sans marge."
          />
          <UnitNumberField
            label="Accessoires de levage (facultatif)"
            unites={UNITES_MASSE}
            uniteInitiale={0}
            value={masseAccessoires}
            onChange={setAccessoires}
            hint="Masse des élingues, palonnier, manilles."
          />
        </Grille>
        <Grille>
          <NumberField
            label="Portée (distance de pose)"
            unite="m"
            value={pos?.porteeM ?? null}
            onChange={(x) => pos && majPosition(pos.id, { porteeM: x })}
            hint="Axe de rotation de la machine → centre de la charge, à l'horizontale."
          />
          {axeY !== "none" && (
            <NumberField
              label={axeY === "height_m" ? "Hauteur de levage (abaque)" : "Longueur de flèche (abaque)"}
              unite="m"
              value={pos?.yM ?? null}
              onChange={(x) => pos && majPosition(pos.id, { yM: x })}
              hint={
                ysAbaque.length > 0
                  ? `Valeurs publiées : ${ysAbaque.map((x) => formatNombreFR(x, 1).replace(/,0$/, "")).join(" · ")} m. Une valeur intermédiaire retient la plus défavorable des deux lignes.`
                  : "Ordonnée de l'abaque de la configuration choisie."
              }
            />
          )}
        </Grille>
      </StepShell>

      <section aria-label="Résultat de l'adéquation rapide" data-testid="resultat-rapide" className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-primary">3. Résultat</h2>
        {!pret2 ? (
          <Card className="p-4 text-sm text-foreground/80">
            Choisissez la machine et sa configuration, saisissez la masse, le moufle / crochet et la portée pour obtenir le résultat.
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" size="lg" disabled={exportPdf.enCours} onClick={() => void exporterPdf()} data-testid="exporter-rapide">
                <FileText />
                {exportPdf.enCours ? "Préparation du PDF…" : "Exporter la synthèse PDF"}
              </Button>
              {exportPdf.erreur && (
                <span role="alert" className="text-sm font-medium text-vinci-rouge-dark">
                  {exportPdf.erreur}
                </span>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="flex flex-col gap-4 p-4">
                <div className={cn("flex items-center gap-3 rounded-md border-l-8 px-4 py-3", style.fond, style.bord)}>
                  <span className={cn("size-3 shrink-0 rounded-full", style.pastille)} aria-hidden />
                  <p className="text-lg font-bold" role="status" data-testid="verdict-rapide">
                    {VERDICT_LIBELLE[v.verdict]}
                  </p>
                </div>
                <Gauge taux={v.tauxMax} zone={v.zone} seuilVert={seuils.vert / 100} seuilOrange={seuils.orange / 100} />
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-foreground/70">Charge totale</dt>
                  <dd className="text-right font-semibold tabular-nums">{formatMasse(r.chargeTotale.value as number)}</dd>
                  <dt className="text-foreground/70">Capacité à {m(pos!.porteeM as number)}</dt>
                  <dd className="text-right font-semibold tabular-nums">{p0?.capacite.value == null ? "Hors abaque" : formatMasse(p0.capacite.value)}</dd>
                  <dt className="text-foreground/70">Taux d&apos;utilisation</dt>
                  <dd className="text-right font-semibold tabular-nums">{v.tauxMax === null ? "—" : formatTaux(v.tauxMax)}</dd>
                </dl>
                {v.bloquants.length > 0 && (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {v.bloquants.map((i, k) => (
                      <li key={k} className="flex gap-2 rounded border-l-4 border-verdict-rouge bg-verdict-rouge-bg px-2 py-1">
                        <CircleAlert className="mt-0.5 size-4 shrink-0 text-verdict-rouge" aria-hidden />
                        {i.message}
                      </li>
                    ))}
                  </ul>
                )}
                {v.reserves.length > 0 && (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {v.reserves.map((i, k) => (
                      <li key={k} className="rounded border-l-4 border-verdict-jaune bg-verdict-jaune-bg px-2 py-1">
                        {i.message}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card className="flex flex-col gap-2 p-4" data-testid="portee-max">
                <h3 className="flex items-center gap-2 font-bold text-primary">
                  <Ruler className="size-4" aria-hidden />
                  Jusqu&apos;où peut-on poser cette charge ?
                </h3>
                {r.porteeMax?.value != null ? (
                  <>
                    <p className="text-3xl font-bold tabular-nums text-primary">{m(r.porteeMax.value)}</p>
                    <p className="text-sm">
                      Portée maximale lue aux nœuds de l&apos;abaque pour {formatMasse(r.chargeTotale.value as number)}
                      {axeY !== "none" && pos?.yM != null ? ` (${axeY === "height_m" ? "hauteur" : "flèche"} ${m(pos.yM)})` : ""} : capacité{" "}
                      {formatMasse(Number(r.porteeMax.inputs.cap.value))} à ce nœud. Limite : {String(r.porteeMax.inputs.limite?.value ?? "")} ; aucune extrapolation.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-vinci-rouge-dark">{r.porteeMax?.warnings.join(" ") || "Portée maximale non calculable."}</p>
                )}
                <Link href="/outil/projet" className="mt-auto inline-flex items-center gap-1 self-start text-sm font-semibold text-primary underline">
                  Faire l&apos;adéquation complète (projet)
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Card>
            </div>
            <CalcDetail titre="Charge totale" calc={r.chargeTotale} resume={formatMasse(r.chargeTotale.value as number)} />
          </>
        )}
      </section>

      {chart !== null && pos && (
        <section aria-label="Schéma interactif de la pose" data-testid="schema-rapide" className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-primary">4. Schéma de la pose</h2>
          <Card className="flex flex-col gap-4 p-4">
            {domaine && (
              <div className="flex flex-col gap-2">
                <label htmlFor="curseur-portee" className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <MoveHorizontal className="size-4 text-primary" aria-hidden />
                    Déplacer la charge (portée)
                  </span>
                  <span className="flex items-center gap-2 tabular-nums">
                    <span className="text-lg text-primary">{pos.porteeM === null ? "—" : m(pos.porteeM)}</span>
                    {pret2 && (
                      <span className="rounded px-2 py-0.5 text-xs font-bold text-white" style={{ background: couleurZone(v.zone) }}>
                        {v.tauxMax === null ? "Hors abaque" : formatTaux(v.tauxMax)}
                      </span>
                    )}
                  </span>
                </label>
                <input
                  id="curseur-portee"
                  type="range"
                  data-testid="curseur-portee"
                  className="h-11 w-full cursor-pointer accent-primary"
                  min={domaine.min}
                  max={domaine.max}
                  step={0.1}
                  value={pos.porteeM ?? domaine.min}
                  onChange={(e) => majPosition(pos.id, { porteeM: aimanter(Number(e.target.value), 0.1, domaine) })}
                  aria-valuetext={pos.porteeM === null ? "portée non saisie" : m(pos.porteeM)}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-foreground/70">
                  <span>
                    Plage de l&apos;abaque : {m(domaine.min)} → {m(domaine.max)}
                  </span>
                  {r.porteeMax?.value != null && (
                    <Button type="button" variant="outline" size="sm" onClick={() => majPosition(pos.id, { porteeM: r.porteeMax!.value as number })}>
                      Placer à la portée max ({m(r.porteeMax.value)})
                    </Button>
                  )}
                </div>
              </div>
            )}
            <ElevationView
              data={data}
              result={etude}
              seuils={seuils}
              selectionId={pos.id}
              onSelect={() => undefined}
              onPortee={(id, porteeM) => majPosition(id, { porteeM })}
            />
          </Card>
        </section>
      )}
    </div>
  );
}
