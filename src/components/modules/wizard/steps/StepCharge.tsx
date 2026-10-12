"use client";

import Link from "next/link";
import { Container } from "lucide-react";

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
        <NumberField
          label="Coefficient de marge sur la masse"
          value={c.coefMarge}
          onChange={(v) => set({ coefMarge: v })}
          error={err.coefMarge}
          hint="Ex. 1,1 = +10 % si la masse est estimée. 1 = sans marge."
        />
      </Grille>
      <Grille cols={3}>
        <NumberField label="Longueur" unite="m" value={c.longueurM} onChange={(v) => set({ longueurM: v })} />
        <NumberField label="Largeur" unite="m" value={c.largeurM} onChange={(v) => set({ largeurM: v })} />
        <NumberField label="Hauteur" unite="m" value={c.hauteurM} onChange={(v) => set({ hauteurM: v })} />
      </Grille>
      <Link
        href={lienTransport(c)}
        target="_blank"
        data-testid="lien-transport"
        className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-primary-light underline"
      >
        <Container className="size-4" aria-hidden />
        Préparer le transport de cette pièce (convoi, voiture pilote, camion)
      </Link>
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

/** Lien vers l'outil Transport, pré-rempli avec les dimensions et la masse saisies. */
function lienTransport(c: { designation: string; masseKg: number | null; longueurM: number | null; largeurM: number | null; hauteurM: number | null }): string {
  const q = new URLSearchParams();
  const ajoute = (k: string, v: number | null) => {
    if (v !== null && v > 0) q.set(k, String(v));
  };
  ajoute("L", c.longueurM);
  ajoute("l", c.largeurM);
  ajoute("h", c.hauteurM);
  ajoute("m", c.masseKg);
  if (c.designation.trim()) q.set("nom", c.designation.trim());
  const s = q.toString();
  return s ? `/transport?${s}` : "/transport";
}
