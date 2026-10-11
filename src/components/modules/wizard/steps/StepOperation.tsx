"use client";

import { TextAreaField, TextField } from "../fields";
import { Grille, StepShell } from "../StepShell";
import { useErreurs } from "../use-erreurs";
import { useStudy } from "@/stores/study";

export function StepOperation() {
  const o = useStudy((s) => s.data.operation);
  const patch = useStudy((s) => s.patch);
  const err = useErreurs("operation");
  const set = (p: Partial<typeof o>) => patch("operation", p);
  return (
    <StepShell numero={1} titre="Chantier / opération" description="Identifiez le chantier et décrivez le levage à vérifier.">
      <Grille>
        <TextField label="Projet / chantier" value={o.projet} onChange={(v) => set({ projet: v })} error={err.projet} />
        <TextField label="Lieu" value={o.lieu} onChange={(v) => set({ lieu: v })} error={err.lieu} />
        <TextField label="Date du levage" type="date" value={o.date} onChange={(v) => set({ date: v })} />
        <TextField label="Rédacteur" value={o.redacteur} onChange={(v) => set({ redacteur: v })} />
      </Grille>
      <TextAreaField
        label="Description du levage"
        value={o.description}
        onChange={(v) => set({ description: v })}
        error={err.description}
        placeholder="Ex. : mise en place d'un élément préfabriqué depuis le camion vers la zone de pose"
      />
      <TextAreaField
        label="Intervenants"
        value={o.intervenants}
        onChange={(v) => set({ intervenants: v })}
        placeholder="Entreprises et personnes concernées"
      />
    </StepShell>
  );
}
