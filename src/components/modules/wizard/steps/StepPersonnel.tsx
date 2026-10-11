"use client";

import { useStudy } from "@/stores/study";

import { CheckboxField, TextField } from "../fields";
import { Grille, SousTitre, StepShell } from "../StepShell";
import { useErreurs } from "../use-erreurs";

export function StepPersonnel() {
  const p = useStudy((s) => s.data.personnel);
  const patch = useStudy((s) => s.patch);
  const err = useErreurs("personnel");
  const set = (v: Partial<typeof p>) => patch("personnel", v);

  return (
    <StepShell
      numero={8}
      titre="Personnel et documents"
      description="Les documents non confirmés apparaissent comme réserves dans le verdict."
    >
      <SousTitre>Conducteur</SousTitre>
      <Grille>
        <TextField label="Nom du conducteur" value={p.conducteur} onChange={(v) => set({ conducteur: v })} error={err.conducteur} />
        <TextField label="CACES (catégorie, validité)" value={p.caces} onChange={(v) => set({ caces: v })} error={err.caces} placeholder="Ex. R482 cat. F" />
      </Grille>
      <CheckboxField label="Autorisation de conduite en cours de validité" checked={p.autorisationConduite} onChange={(v) => set({ autorisationConduite: v })} />

      <SousTitre>Équipe de manœuvre</SousTitre>
      <Grille>
        <TextField label="Chef de manœuvre" value={p.chefManoeuvre} onChange={(v) => set({ chefManoeuvre: v })} error={err.chefManoeuvre} />
        <TextField label="Élingueur" value={p.elingueur} onChange={(v) => set({ elingueur: v })} error={err.elingueur} />
      </Grille>

      <SousTitre>Vérifications générales périodiques</SousTitre>
      <CheckboxField label="VGP de l'engin à jour" checked={p.vgpEngin} onChange={(v) => set({ vgpEngin: v })} />
      <CheckboxField label="VGP des accessoires de levage à jour" checked={p.vgpAccessoires} onChange={(v) => set({ vgpAccessoires: v })} />
    </StepShell>
  );
}
