"use client";

import { useStudy } from "@/stores/study";

import { ChoixSegmente, CheckboxField, NumberField, TextAreaField } from "../fields";
import { Grille, SousTitre, StepShell } from "../StepShell";
import { useErreurs } from "../use-erreurs";

export function StepEnvironnement() {
  const e = useStudy((s) => s.data.environnement);
  const patch = useStudy((s) => s.patch);
  const err = useErreurs("environnement");
  const set = (p: Partial<typeof e>) => patch("environnement", p);
  const u = e.uniteVent === "kmh" ? "km/h" : "m/s";

  return (
    <StepShell
      numero={7}
      titre="Environnement"
      description="Vent et lignes électriques : les limites sont celles de la notice constructeur et de la réglementation, saisies par vos soins."
    >
      <SousTitre>Vent</SousTitre>
      <ChoixSegmente
        label="Unité de vitesse"
        value={e.uniteVent}
        onChange={(v) => set({ uniteVent: v })}
        options={[
          { value: "ms", label: "m/s" },
          { value: "kmh", label: "km/h" },
        ]}
      />
      <Grille>
        <NumberField label="Vent prévu" unite={u} value={e.ventPrevu} onChange={(v) => set({ ventPrevu: v })} error={err.ventPrevu} />
        <NumberField label="Limite de la machine" unite={u} value={e.ventLimiteMachine} onChange={(v) => set({ ventLimiteMachine: v })} error={err.ventLimiteMachine} />
      </Grille>
      <CheckboxField
        label="Charge à forte prise au vent (limite réduite exigée)"
        checked={e.chargeFortePriseAuVent}
        onChange={(v) => set({ chargeFortePriseAuVent: v })}
      />
      {e.chargeFortePriseAuVent && (
        <NumberField
          className="sm:max-w-xs"
          label="Limite réduite pour la charge"
          unite={u}
          value={e.ventLimiteCharge}
          onChange={(v) => set({ ventLimiteCharge: v })}
          error={err.ventLimiteCharge}
        />
      )}

      <SousTitre>Lignes électriques et caténaires</SousTitre>
      <ChoixSegmente
        label="Lignes à proximité ?"
        value={e.lignes}
        onChange={(v) => set({ lignes: v })}
        error={err.lignes}
        options={[
          { value: "non", label: "Non" },
          { value: "oui", label: "Oui" },
        ]}
      />
      {e.lignes === "oui" && (
        <Grille cols={3}>
          <NumberField label="Distance minimale prévue" unite="m" value={e.ligneDistancePrevueM} onChange={(v) => set({ ligneDistancePrevueM: v })} error={err.ligneDistancePrevueM} />
          <NumberField
            label="Distance minimale d'approche"
            unite="m"
            value={e.ligneDistanceSeuilM}
            onChange={(v) => set({ ligneDistanceSeuilM: v })}
            error={err.ligneDistanceSeuilM}
            hint="À confirmer sur la réglementation en vigueur (ex. C. trav. R.4534-108) et la NF C 18-510."
          />
          <NumberField label="Tension (facultatif)" unite="kV" value={e.ligneTensionKV} onChange={(v) => set({ ligneTensionKV: v })} />
        </Grille>
      )}

      <SousTitre>Autres contraintes</SousTitre>
      <TextAreaField
        label="Voies ferrées ou circulées, survol, interférences avec d'autres engins, balisage"
        value={e.voiesEtInterferences}
        onChange={(v) => set({ voiesEtInterferences: v })}
      />
    </StepShell>
  );
}
