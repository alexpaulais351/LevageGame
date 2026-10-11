"use client";

import { useState, useTransition } from "react";
import { History } from "lucide-react";
import { useRouter } from "next/navigation";

import { restaurerVersion } from "@/actions/versions";
import { Button } from "@/components/ui/button";

import { ErreurAction } from "./form-bits";

/** Restaure une ancienne version : crée une NOUVELLE version (historique inchangé) puis ouvre l'étude. */
export function RestaurerVersion({ etudeId, projetId, index }: { etudeId: string; projetId: string; index: number }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        size="lg"
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            setErreur(null);
            const r = await restaurerVersion({ etudeId, index });
            if (!r.ok) return setErreur(r.error);
            router.push(`/projets/${projetId}/etudes/${etudeId}`);
          })
        }
      >
        <History />
        {enCours ? "Restauration…" : "Restaurer cette version"}
      </Button>
      <ErreurAction message={erreur} />
    </div>
  );
}
