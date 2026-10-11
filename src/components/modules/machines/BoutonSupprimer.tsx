"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { supprimerConfiguration, supprimerMachine } from "@/actions/machines";
import { Button } from "@/components/ui/button";

import { ErreurAction } from "../account/form-bits";

/** Suppression avec confirmation en deux temps (machine ou configuration personnelle). */
export function BoutonSupprimer({ cible, id, libelle, retour }: { cible: "machine" | "configuration"; id: string; libelle: string; retour?: string }) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  if (!confirmer)
    return (
      <Button type="button" variant="outline" onClick={() => setConfirmer(true)} aria-label={`Supprimer ${libelle}`}>
        <Trash2 />
        Supprimer
      </Button>
    );
  return (
    <div role="alertdialog" aria-label={`Confirmer la suppression de ${libelle}`} className="flex flex-col gap-2 rounded-md border border-vinci-rouge bg-vinci-rouge-xlight p-3 text-sm">
      <p className="font-semibold text-vinci-rouge-dark">
        Supprimer {libelle} ?{" "}
        {cible === "machine" ? "Configurations, abaques, photo et PDF joints seront effacés." : "Son abaque et sa source seront effacés."} Les études déjà enregistrées gardent leur copie de l&apos;abaque.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={enCours}
          className="bg-vinci-rouge text-white hover:bg-vinci-rouge-dark"
          onClick={() =>
            demarrer(async () => {
              setErreur(null);
              const r = cible === "machine" ? await supprimerMachine({ id }) : await supprimerConfiguration({ id });
              if (!r.ok) return setErreur(r.error);
              if (retour) router.push(retour);
              router.refresh();
            })
          }
        >
          {enCours ? "Suppression…" : "Confirmer la suppression"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setConfirmer(false)}>
          Annuler
        </Button>
      </div>
      <ErreurAction message={erreur} />
    </div>
  );
}
