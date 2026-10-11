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
  const ajouterObstacle = useStudy((s) => s.ajouterObstacle);
  const majObstacle = useStudy((s) => s.majObstacle);
  const supprObstacle = useStudy((s) => s.supprimerObstacle);
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TextField label="Nom" value={p.nom} onChange={(v) => maj(p.id, { nom: v })} error={err[`positions.${i}.nom`]} />
              <NumberField
                label="Portée (rayon)"
                unite="m"
                value={p.porteeM}
                onChange={(v) => maj(p.id, { porteeM: v })}
                error={err[`positions.${i}.porteeM`]}
              />
              <NumberField
                label="Angle dans le plan"
                unite="°"
                value={p.angleDeg ?? null}
                onChange={(v) => maj(p.id, { angleDeg: v })}
                hint="0° = haut du plan, sens horaire. Sert à la vue en plan."
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
      <SousTitre>Obstacles chiffrés (schéma en élévation)</SousTitre>
      <ul className="flex flex-col gap-3">
        {(g.obstaclesSaisis ?? []).map((o, i) => (
          <li key={o.id} className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <TextField className="col-span-2 sm:col-span-1" label={`Obstacle ${i + 1}`} value={o.nom} onChange={(v) => majObstacle(o.id, { nom: v })} />
            <NumberField label="Distance à l'axe" unite="m" value={o.distanceM} onChange={(v) => majObstacle(o.id, { distanceM: v })} />
            <NumberField label="Hauteur" unite="m" value={o.hauteurM} onChange={(v) => majObstacle(o.id, { hauteurM: v })} />
            <Button type="button" variant="ghost" size="icon" onClick={() => supprObstacle(o.id)} aria-label={`Supprimer l'obstacle ${i + 1}`}>
              <Trash2 className="text-vinci-rouge" />
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" size="lg" className="self-start" onClick={ajouterObstacle}>
        <Plus />
        Ajouter un obstacle
      </Button>
      <TextAreaField
        label="Obstacles (description libre)"
        value={g.obstacles}
        onChange={(v) => patch("geometrie", { obstacles: v })}
        placeholder="Bâtiments, arbres, autres engins, ouvrages à franchir…"
      />
    </StepShell>
  );
}
