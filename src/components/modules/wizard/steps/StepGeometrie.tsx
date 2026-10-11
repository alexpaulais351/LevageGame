"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useStudy } from "@/stores/study";

import { NumberField, TextAreaField, TextField } from "../fields";
import { SousTitre, StepShell } from "../StepShell";
import { useErreurs } from "../use-erreurs";

export function StepGeometrie() {
  const g = useStudy((s) => s.data.geometrie);
  const axeY = useStudy((s) => s.data.machine.selection?.chart?.axisY ?? null);
  const patch = useStudy((s) => s.patch);
  const ajouter = useStudy((s) => s.ajouterPosition);
  const maj = useStudy((s) => s.majPosition);
  const suppr = useStudy((s) => s.supprimerPosition);
  const err = useErreurs("geometrie");

  const libelleY = axeY === "height_m" ? "Hauteur sous abaque" : "Longueur de flèche";
  const avecY = axeY !== null && axeY !== "none";

  return (
    <StepShell
      numero={5}
      titre="Géométrie du levage"
      description="Une capacité est lue à l'abaque pour chaque position ; la plus défavorable détermine le taux d'utilisation."
    >
      {axeY === null && (
        <p className="rounded-md bg-vinci-bleu-xlight p-3 text-sm">
          Choisissez d&apos;abord la machine (étape 4) : l&apos;abaque indique si une longueur de flèche ou une hauteur est
          demandée en plus de la portée.
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {g.positions.map((p, i) => (
          <li key={p.id} className="rounded-lg border border-border bg-vinci-gris-light/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-primary">Position {i + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => suppr(p.id)}
                aria-label={`Supprimer la position ${i + 1}`}
              >
                <Trash2 className="text-vinci-rouge" />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Nom" value={p.nom} onChange={(v) => maj(p.id, { nom: v })} error={err[`positions.${i}.nom`]} />
              <NumberField
                label="Portée (rayon)"
                unite="m"
                value={p.porteeM}
                onChange={(v) => maj(p.id, { porteeM: v })}
                error={err[`positions.${i}.porteeM`]}
              />
              {avecY && (
                <NumberField
                  label={libelleY}
                  unite="m"
                  value={p.yM}
                  onChange={(v) => maj(p.id, { yM: v })}
                  error={err[`positions.${i}.yM`]}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
      {err.positions && g.positions.length === 0 && <p className="text-sm text-vinci-rouge">{err.positions}</p>}
      <Button type="button" variant="outline" size="lg" className="self-start" onClick={ajouter}>
        <Plus />
        Ajouter une position
      </Button>

      <SousTitre>Autres éléments</SousTitre>
      <NumberField
        className="sm:max-w-xs"
        label="Hauteur sous crochet nécessaire"
        unite="m"
        value={g.hauteurSousCrochetM}
        onChange={(v) => patch("geometrie", { hauteurSousCrochetM: v })}
      />
      <TextAreaField
        label="Obstacles"
        value={g.obstacles}
        onChange={(v) => patch("geometrie", { obstacles: v })}
        placeholder="Bâtiments, arbres, autres engins, ouvrages à franchir…"
      />
    </StepShell>
  );
}
