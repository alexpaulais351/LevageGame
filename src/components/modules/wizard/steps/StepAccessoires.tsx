"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AccessoireType } from "@/engine";
import { useStudy } from "@/stores/study";

import { CheckboxField, NumberField, SelectField, TextField, UNITES_MASSE, UnitNumberField } from "../fields";
import { Grille, SousTitre, StepShell } from "../StepShell";
import { useErreurs } from "../use-erreurs";

const TYPES: { value: AccessoireType; label: string }[] = [
  { value: "elingue", label: "Élingue" },
  { value: "manille", label: "Manille" },
  { value: "palonnier", label: "Palonnier" },
  { value: "crochet", label: "Crochet / moufle" },
  { value: "autre", label: "Autre" },
];

export function StepAccessoires() {
  const acc = useStudy((s) => s.data.accessoires);
  const patch = useStudy((s) => s.patch);
  const ajouter = useStudy((s) => s.ajouterAccessoire);
  const maj = useStudy((s) => s.majAccessoire);
  const suppr = useStudy((s) => s.supprimerAccessoire);
  const err = useErreurs("accessoires");

  return (
    <StepShell
      numero={3}
      titre="Accessoires de levage"
      description="Élingues, manilles, palonnier… CMU utile = CMU en levage direct × facteur de mode (lu sur l'étiquette ou la notice)."
    >
      <SousTitre>Configuration d&apos;élingage</SousTitre>
      <Grille cols={3}>
        <NumberField
          label="Nombre de brins"
          value={acc.nbBrins}
          onChange={(v) => patch("accessoires", { nbBrins: v })}
          error={err.nbBrins}
          hint="3 ou 4 brins sans palonnier : 2 brins porteurs retenus."
        />
        <NumberField
          label="Angle β / verticale"
          unite="°"
          value={acc.angleBetaDeg}
          onChange={(v) => patch("accessoires", { angleBetaDeg: v })}
          error={err.angleBetaDeg}
          hint="Conforme ≤ 45° ; réserve jusqu'à 60° ; interdit au-delà."
        />
        <CheckboxField
          className="self-end"
          label="Palonnier / équilibrage déclaré"
          checked={acc.equilibrageDeclare}
          onChange={(v) => patch("accessoires", { equilibrageDeclare: v })}
        />
      </Grille>

      <SousTitre>Accessoires</SousTitre>
      {err.liste && acc.liste.length === 0 && <p className="text-sm text-muted-foreground">{err.liste}</p>}
      <ul className="flex flex-col gap-4">
        {acc.liste.map((a, i) => (
          <li key={a.id} className="rounded-lg border border-border bg-vinci-gris-light/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-primary">Accessoire {i + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => suppr(a.id)}
                aria-label={`Supprimer l'accessoire ${i + 1}`}
              >
                <Trash2 className="text-vinci-rouge" />
              </Button>
            </div>
            <Grille cols={3}>
              <SelectField label="Type" value={a.type} options={TYPES} onChange={(v) => maj(a.id, { type: v })} />
              <TextField
                label="Désignation"
                value={a.label}
                onChange={(v) => maj(a.id, { label: v })}
                error={err[`liste.${i}.label`]}
                placeholder="Ex. élingue 2 brins Ø 16"
              />
              <SelectField
                label="Rôle dans le contrôle"
                value={a.sollicitation}
                options={[
                  { value: "brin", label: "Brin (effort par brin)" },
                  { value: "ensemble", label: "Ensemble (masse totale)" },
                ]}
                onChange={(v) => maj(a.id, { sollicitation: v })}
              />
              <UnitNumberField
                label="CMU en levage direct"
                unites={UNITES_MASSE}
                uniteInitiale={a.cmuDirectKg !== null && a.cmuDirectKg >= 1000 ? 1 : 0}
                value={a.cmuDirectKg}
                onChange={(v) => maj(a.id, { cmuDirectKg: v })}
                error={err[`liste.${i}.cmuDirectKg`]}
              />
              <NumberField
                label="Facteur de mode"
                value={a.facteurMode}
                onChange={(v) => maj(a.id, { facteurMode: v })}
                error={err[`liste.${i}.facteurMode`]}
                hint="Saisi d'après l'étiquette ; aucune valeur par défaut."
              />
              <UnitNumberField
                label="Masse propre"
                unites={UNITES_MASSE}
                value={a.masseKg}
                onChange={(v) => maj(a.id, { masseKg: v })}
                error={err[`liste.${i}.masseKg`]}
                hint="Comptée dans la charge totale."
              />
            </Grille>
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" size="lg" className="self-start" onClick={ajouter}>
        <Plus />
        Ajouter un accessoire
      </Button>
    </StepShell>
  );
}
