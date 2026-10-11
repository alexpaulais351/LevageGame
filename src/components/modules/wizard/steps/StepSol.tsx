"use client";

import { useStudy } from "@/stores/study";

import { ChoixSegmente, NumberField, TextAreaField, UNITES_EFFORT, UnitNumberField } from "../fields";
import { Grille, SousTitre, StepShell } from "../StepShell";
import { useErreurs } from "../use-erreurs";

export function StepSol() {
  const s = useStudy((st) => st.data.sol);
  const patch = useStudy((st) => st.patch);
  const err = useErreurs("sol");
  const set = (p: Partial<typeof s>) => patch("sol", p);

  return (
    <StepShell
      numero={6}
      titre="Appuis et sol"
      description="Pression transmise au sol comparée à la portance admissible saisie (aucune valeur par défaut)."
    >
      <ChoixSegmente
        label="Mode d'appui"
        value={s.mode}
        onChange={(v) => set({ mode: v })}
        error={err.mode}
        options={[
          { value: "stabilisateurs", label: "Stabilisateurs" },
          { value: "chenilles", label: "Chenilles" },
          { value: "non_applicable", label: "Non applicable" },
        ]}
      />
      {s.mode === "non_applicable" && (
        <p className="text-sm text-muted-foreground">
          Aucun contrôle de pression n&apos;est calculé : justifiez l&apos;absence de contrôle dans les réserves libres.
        </p>
      )}
      {(s.mode === "stabilisateurs" || s.mode === "chenilles") && (
        <>
          <Grille>
            <UnitNumberField
              label="Effort maximal sous appui"
              unites={UNITES_EFFORT}
              value={s.effortMaxKN}
              onChange={(v) => set({ effortMaxKN: v })}
              error={err.effortMaxKN}
              hint={s.mode === "chenilles" ? "Effort total transmis par les deux chenilles." : "Donnée constructeur ou calcul."}
            />
            <NumberField
              label="Portance admissible du sol"
              unite="kPa"
              value={s.portanceKPa}
              onChange={(v) => set({ portanceKPa: v })}
              error={err.portanceKPa}
              hint="Issue de l'étude de sol ou du plan d'installation."
            />
          </Grille>
          {s.mode === "stabilisateurs" ? (
            <>
              <SousTitre>Surface de répartition</SousTitre>
              <ChoixSegmente
                label="Type de surface"
                value={s.typeSurface}
                onChange={(v) => set({ typeSurface: v })}
                options={[
                  { value: "plaque", label: "Plaque de répartition" },
                  { value: "patin", label: "Patin" },
                ]}
              />
              {s.typeSurface === "plaque" ? (
                <Grille>
                  <NumberField label="Longueur de plaque" unite="m" value={s.plaqueLongueurM} onChange={(v) => set({ plaqueLongueurM: v })} error={err.plaqueLongueurM} />
                  <NumberField label="Largeur de plaque" unite="m" value={s.plaqueLargeurM} onChange={(v) => set({ plaqueLargeurM: v })} error={err.plaqueLargeurM} />
                </Grille>
              ) : (
                <NumberField className="sm:max-w-xs" label="Surface du patin" unite="m²" value={s.patinSurfaceM2} onChange={(v) => set({ patinSurfaceM2: v })} error={err.patinSurfaceM2} />
              )}
            </>
          ) : (
            <>
              <SousTitre>Chenilles</SousTitre>
              <Grille>
                <NumberField label="Longueur d'appui d'une chenille" unite="m" value={s.chenilleLongueurM} onChange={(v) => set({ chenilleLongueurM: v })} error={err.chenilleLongueurM} />
                <NumberField label="Largeur de tuile" unite="m" value={s.chenilleTuileM} onChange={(v) => set({ chenilleTuileM: v })} error={err.chenilleTuileM} />
              </Grille>
            </>
          )}
        </>
      )}
      <TextAreaField
        label="Proximité de fouilles, talus, réseaux enterrés, ouvrages"
        value={s.proximites}
        onChange={(v) => set({ proximites: v })}
      />
    </StepShell>
  );
}
