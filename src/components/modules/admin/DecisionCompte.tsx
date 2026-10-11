"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deciderCompte } from "@/actions/admin";
import { ErreurAction } from "@/components/modules/account/form-bits";
import { Button } from "@/components/ui/button";
import { decisionsPossibles, LIBELLE_DECISION, type Decision } from "@/lib/admin/comptes";
import type { StatutCompte } from "@/lib/supabase/session";

const DESTRUCTIVE: Decision[] = ["refuser", "suspendre"];

/**
 * Boutons de décision avec confirmation explicite. Aucune action sur simple affichage :
 * la décision part uniquement au clic sur « Confirmer » (Server Action).
 */
export function DecisionCompte({ userId, nom, statut, taille = "lg" }: { userId: string; nom: string; statut: StatutCompte; taille?: "lg" | "default" }) {
  const router = useRouter();
  const [aConfirmer, setAConfirmer] = useState<Decision | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const confirmer = (d: Decision) =>
    demarrer(async () => {
      setErreur(null);
      const r = await deciderCompte({ userId, decision: d });
      if (!r.ok) return setErreur(r.error);
      setAConfirmer(null);
      router.refresh();
    });

  if (aConfirmer)
    return (
      <div role="alertdialog" aria-label={`Confirmer : ${LIBELLE_DECISION[aConfirmer]}`} className="flex flex-wrap items-center gap-2 rounded-md border border-primary bg-vinci-bleu-xlight p-2 text-sm">
        <span>
          {LIBELLE_DECISION[aConfirmer]} le compte de <strong>{nom}</strong> ?
        </span>
        <Button type="button" size={taille} variant={DESTRUCTIVE.includes(aConfirmer) ? "destructive" : "default"} disabled={enCours} onClick={() => confirmer(aConfirmer)}>
          {enCours ? "Enregistrement…" : "Confirmer"}
        </Button>
        <Button type="button" size={taille} variant="outline" disabled={enCours} onClick={() => setAConfirmer(null)}>
          Annuler
        </Button>
        <ErreurAction message={erreur} />
      </div>
    );

  return (
    <div className="flex flex-wrap gap-2">
      {decisionsPossibles(statut).map((d) => (
        <Button key={d} type="button" size={taille} variant={DESTRUCTIVE.includes(d) ? "outline" : "default"} onClick={() => setAConfirmer(d)}>
          {LIBELLE_DECISION[d]}
        </Button>
      ))}
    </div>
  );
}
