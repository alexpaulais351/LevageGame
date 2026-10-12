"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import type { StudyResult } from "@/lib/study/compute";
import { formatCalcValue, formatNombreAuto, formatTaux } from "@/lib/study/format";
import { erreursZod, seuilsSchema } from "@/lib/study/schemas";
import { cn, formatMasse } from "@/lib/utils";
import { useStudy } from "@/stores/study";

import { ExportPdfButton } from "../../pdf/ExportPdfButton";
import { CalcDetail } from "../CalcDetail";
import { NumberField, TextAreaField } from "../fields";
import { ZONE_FOND } from "../Gauge";
import { VERDICT_LIBELLE, VERDICT_STYLE } from "../ResultPanel";
import { Grille, SousTitre, StepShell } from "../StepShell";

const SIGNATAIRES = ["Rédacteur", "Chef de manœuvre", "Conducteur", "Responsable chantier"];

function Resume({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-foreground/70">{libelle}</dt>
      <dd className="break-words font-semibold">{valeur || "—"}</dd>
    </div>
  );
}

export function StepSynthese({ result }: { result: StudyResult }) {
  const data = useStudy((s) => s.data);
  const patch = useStudy((s) => s.patch);
  const ajouterReserve = useStudy((s) => s.ajouterReserve);
  const majReserve = useStudy((s) => s.majReserve);
  const supprimerReserve = useStudy((s) => s.supprimerReserve);
  const errSeuils = useMemo(() => erreursZod(seuilsSchema, data.seuils), [data.seuils]);

  const v = result.verdict.value;
  const style = VERDICT_STYLE[v.verdict];
  const sel = data.machine.selection;
  const axeY = sel?.chart?.axisY ?? "none";
  const ylib = axeY === "height_m" ? "Hauteur" : "Flèche";

  return (
    <StepShell numero={9} titre="Synthèse" description="Résultat, détail de chaque calcul, réserves et signatures.">
      <div className={cn("rounded-md border-l-8 px-4 py-3", style.fond, style.bord)}>
        <p className="text-xl font-bold">{VERDICT_LIBELLE[v.verdict]}</p>
        <p className="text-sm">
          Taux d&apos;utilisation (position la plus défavorable) :{" "}
          <strong>{v.tauxMax === null ? "hors abaque / non calculable" : formatTaux(v.tauxMax)}</strong>
          {v.positionDefavorable && <> — « {v.positionDefavorable.label} »</>}
        </p>
      </div>

      <ExportPdfButton />

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Resume libelle="Projet" valeur={data.operation.projet} />
        <Resume libelle="Lieu" valeur={data.operation.lieu} />
        <Resume libelle="Date" valeur={data.operation.date ? data.operation.date.split("-").reverse().join("/") : ""} />
        <Resume libelle="Charge" valeur={`${data.charge.designation}${data.charge.masseKg !== null ? ` — ${formatMasse(data.charge.masseKg)}` : ""}`} />
        <Resume libelle="Machine" valeur={sel ? `${sel.manufacturerName} ${sel.model}` : ""} />
        <Resume libelle="Configuration" valeur={sel?.configurationLabel ?? ""} />
      </dl>

      <SousTitre>Positions de levage</SousTitre>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-vinci-bleu text-white">
              <th className="px-3 py-2 font-bold">Position</th>
              <th className="px-3 py-2 text-right font-bold">Portée</th>
              {axeY !== "none" && <th className="px-3 py-2 text-right font-bold">{ylib}</th>}
              <th className="px-3 py-2 text-right font-bold">Capacité</th>
              <th className="px-3 py-2 text-right font-bold">Taux</th>
            </tr>
          </thead>
          <tbody>
            {data.geometrie.positions.map((p) => {
              const r = v.positions.find((x) => x.id === p.id);
              return (
                <tr key={p.id} className="odd:bg-background even:bg-vinci-gris-light">
                  <td className="px-3 py-2">{p.nom || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.porteeM === null ? "—" : `${formatNombreAuto(p.porteeM)} m`}</td>
                  {axeY !== "none" && <td className="px-3 py-2 text-right tabular-nums">{p.yM === null ? "—" : `${formatNombreAuto(p.yM)} m`}</td>}
                  <td className="px-3 py-2 text-right tabular-nums">
                    {!r ? "—" : r.capacite.value === null ? "Hors abaque" : formatMasse(r.capacite.value)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span className="inline-flex items-center gap-2">
                      {r?.zone && <span className={cn("size-3 rounded-full", ZONE_FOND[r.zone])} aria-hidden />}
                      {r ? formatTaux(r.taux) : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SousTitre>Détail des calculs</SousTitre>
      <div className="flex flex-col gap-4">
        <CalcDetail
          titre="Charge totale"
          calc={result.chargeTotale}
          resume={result.chargeTotale.value === null ? "non calculable" : formatMasse(result.chargeTotale.value)}
        />
        {v.positions.map((p) => (
          <CalcDetail
            key={p.id}
            titre={`Capacité à l'abaque — ${p.label}`}
            calc={p.capacite}
            resume={`${p.capacite.value === null ? "hors abaque" : formatMasse(p.capacite.value)} · taux ${formatTaux(p.taux)}`}
          />
        ))}
        <CalcDetail titre="Taux d'utilisation et verdict" calc={result.verdict} resume={VERDICT_LIBELLE[v.verdict]} />
        <CalcDetail
          titre="Élingage et CMU"
          calc={result.elingage}
          resume={
            result.elingage.value.effortParBrinKg === null
              ? undefined
              : `T = ${formatMasse(result.elingage.value.effortParBrinKg)} par brin`
          }
        />
        {result.elingage.value.accessoires.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-vinci-bleu text-white">
                  <th className="px-3 py-2 font-bold">Accessoire</th>
                  <th className="px-3 py-2 text-right font-bold">CMU</th>
                  <th className="px-3 py-2 text-right font-bold">Effort</th>
                  <th className="px-3 py-2 text-right font-bold">Taux</th>
                  <th className="px-3 py-2 font-bold">Conforme</th>
                </tr>
              </thead>
              <tbody>
                {result.elingage.value.accessoires.map((a) => (
                  <tr key={a.id} className="odd:bg-background even:bg-vinci-gris-light">
                    <td className="px-3 py-2">{a.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{a.cmuUtileKg === null ? "—" : formatMasse(a.cmuUtileKg)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{a.effortKg === null ? "—" : formatMasse(a.effortKg)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTaux(a.taux)}</td>
                    <td className="px-3 py-2 font-semibold">{a.conforme ? "Oui" : "Non"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result.sol && (
          <CalcDetail
            titre="Appuis et sol"
            calc={result.sol}
            resume={
              result.sol.value.pressionKPa === null ? undefined : `p = ${formatCalcValue({ value: result.sol.value.pressionKPa, unit: "kPa", label: "" })}`
            }
          />
        )}
        <CalcDetail titre="Vent" calc={result.vent} />
        {result.ligne && <CalcDetail titre="Lignes électriques" calc={result.ligne} />}
      </div>

      <SousTitre>Seuils du verdict</SousTitre>
      <Grille>
        <NumberField
          label="Seuil vert (taux inférieur à)"
          unite="%"
          value={data.seuils.vertPct}
          onChange={(x) => patch("seuils", { vertPct: x })}
          error={errSeuils.vertPct}
        />
        <NumberField
          label="Seuil orange (taux jusqu'à)"
          unite="%"
          value={data.seuils.orangePct}
          onChange={(x) => patch("seuils", { orangePct: x })}
          error={errSeuils.orangePct}
          hint="Au-delà de 100 % : toujours non adéquat."
        />
      </Grille>

      <SousTitre>Réserves libres</SousTitre>
      <ul className="flex flex-col gap-3">
        {data.reserves.liste.map((r, i) => (
          <li key={r.id} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <TextAreaField label={`Réserve ${i + 1}`} value={r.texte} onChange={(t) => majReserve(r.id, t)} />
            </div>
            <Button type="button" variant="ghost" size="icon" className="mt-6" onClick={() => supprimerReserve(r.id)} aria-label={`Supprimer la réserve ${i + 1}`}>
              <Trash2 className="text-vinci-rouge" />
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" size="lg" className="self-start" onClick={ajouterReserve}>
        <Plus />
        Ajouter une réserve
      </Button>

      <SousTitre>Signatures</SousTitre>
      <div className="grid gap-4 sm:grid-cols-2">
        {SIGNATAIRES.map((role) => (
          <div key={role} className="break-inside-avoid rounded-lg border border-border p-4">
            <p className="font-bold text-primary">{role}</p>
            <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-5 text-sm">
              {["Nom", "Fonction", "Date"].map((c) => (
                <div key={c} className="contents">
                  <span className="text-foreground/70">{c} :</span>
                  <span className="border-b border-foreground/40" />
                </div>
              ))}
            </div>
            <div className="mt-4 h-20 rounded border border-dashed border-foreground/40" aria-label={`Cadre de signature — ${role}`} />
          </div>
        ))}
      </div>
    </StepShell>
  );
}
