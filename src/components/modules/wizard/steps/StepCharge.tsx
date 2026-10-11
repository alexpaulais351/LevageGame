"use client";

import { TextField, NumberField, UnitNumberField, UNITES_MASSE } from "../fields";
import { Grille, StepShell } from "../StepShell";
import { useErreurs } from "../use-erreurs";
import { useStudy } from "@/stores/study";

export function StepCharge() {
  const c = useStudy((s) => s.data.charge);
  const patch = useStudy((s) => s.patch);
  const err = useErreurs("charge");
  const set = (p: Partial<typeof c>) => patch("charge", p);
  return (
    <StepShell numero={2} titre="Charge" description="Masse et encombrement de la charge à lever.">
      <Grille>
        <TextField label="Désignation" value={c.designation} onChange={(v) => set({ designation: v })} error={err.designation} />
        <UnitNumberField
          label="Masse de la charge"
          unites={UNITES_MASSE}
          uniteInitiale={c.masseKg !== null && c.masseKg >= 1000 ? 1 : 0}
          value={c.masseKg}
          onChange={(v) => set({ masseKg: v })}
          error={err.masseKg}
        />
      </Grille>
      <Grille cols={3}>
        <NumberField label="Longueur" unite="m" value={c.longueurM} onChange={(v) => set({ longueurM: v })} />
        <NumberField label="Largeur" unite="m" value={c.largeurM} onChange={(v) => set({ largeurM: v })} />
        <NumberField label="Hauteur" unite="m" value={c.hauteurM} onChange={(v) => set({ hauteurM: v })} />
      </Grille>
      <Grille>
        <TextField
          label="Centre de gravité"
          value={c.centreGravite}
          onChange={(v) => set({ centreGravite: v })}
          placeholder="Position, excentrement éventuel"
        />
        <NumberField
          label="Surface au vent"
          unite="m²"
          value={c.surfaceVentM2}
          onChange={(v) => set({ surfaceVentM2: v })}
          hint="Charge à forte prise au vent : à signaler à l'étape Environnement."
        />
      </Grille>
    </StepShell>
  );
}
