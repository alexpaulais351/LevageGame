"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Undo2 } from "lucide-react";

import { marquerVerifie, remettreAVerifier } from "@/actions/machines";
import { Button } from "@/components/ui/button";

import { ErreurAction } from "../account/form-bits";

/** « Marquer comme vérifié » (case de confirmation obligatoire) ou retour à « à vérifier ». */
export function VerificationAbaque({ chartId, status }: { chartId: string; status: "a_verifier" | "verifie" }) {
  const router = useRouter();
  const id = useId();
  const [confirme, setConfirme] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const executer = (f: () => Promise<{ ok: boolean; error?: string }>) =>
    demarrer(async () => {
      setErreur(null);
      const r = await f();
      if (!r.ok) return setErreur(r.error ?? "Échec.");
      setConfirme(false);
      router.refresh();
    });

  if (status === "verifie") {
    return (
      <div className="flex flex-col gap-2">
        <Button type="button" variant="outline" disabled={enCours} onClick={() => executer(() => remettreAVerifier({ chartId }))}>
          <Undo2 />
          Remettre « à vérifier »
        </Button>
        <ErreurAction message={erreur} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3" data-testid="bloc-verification">
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-2 text-sm">
        <input id={id} type="checkbox" className="mt-0.5 size-5 shrink-0" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} />
        J&apos;ai contrôlé chaque valeur contre le document constructeur
      </label>
      <Button type="button" className="self-start" disabled={!confirme || enCours} onClick={() => executer(() => marquerVerifie({ chartId, confirme }))}>
        <CheckCircle2 />
        {enCours ? "Enregistrement…" : "Marquer comme vérifié"}
      </Button>
      <ErreurAction message={erreur} />
    </div>
  );
}
