"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { dupliquerEtude, renommerEtude, supprimerEtude } from "@/actions/etudes";
import { renommerProjet, supprimerProjet } from "@/actions/projets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/account/result";

import { ErreurAction } from "./form-bits";

interface Props {
  /** Nom de l'élément (pour les libellés accessibles et la valeur initiale du renommage). */
  nom: string;
  libelleSuppression: string;
  renommer: (nom: string) => Promise<ActionResult>;
  supprimer: () => Promise<ActionResult>;
  dupliquer?: () => Promise<ActionResult<{ id: string }>>;
  /** Où aller après une duplication réussie (id de la copie). */
  apresDuplication?: (id: string) => string;
}

/** Renommer / dupliquer / supprimer (avec confirmation) une ligne de liste. */
function LigneActions({ nom, libelleSuppression, renommer, supprimer, dupliquer, apresDuplication }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"repos" | "renommer" | "supprimer">("repos");
  const [valeur, setValeur] = useState(nom);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const executer = (f: () => Promise<ActionResult | ActionResult<{ id: string }>>, apres?: (r: unknown) => void) =>
    demarrer(async () => {
      setErreur(null);
      const r = await f();
      if (!r.ok) {
        setErreur(r.error);
        return;
      }
      setMode("repos");
      apres?.("data" in r ? r.data : undefined);
      router.refresh();
    });

  if (mode === "renommer")
    return (
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          executer(() => renommer(valeur));
        }}
      >
        <Input aria-label={`Nouveau nom pour ${nom}`} value={valeur} onChange={(e) => setValeur(e.target.value)} className="h-10 w-56" autoFocus />
        <Button type="submit" size="sm" disabled={enCours}>
          <Check /> Valider
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setMode("repos")}>
          <X /> Annuler
        </Button>
        <ErreurAction message={erreur} />
      </form>
    );

  if (mode === "supprimer")
    return (
      <div role="alertdialog" aria-label={libelleSuppression} className="flex flex-wrap items-center gap-2 rounded-md border border-vinci-rouge bg-vinci-rouge-xlight p-2 text-sm">
        <span>{libelleSuppression}</span>
        <Button type="button" size="sm" variant="destructive" disabled={enCours} onClick={() => executer(supprimer)}>
          Confirmer
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setMode("repos")}>
          Annuler
        </Button>
        <ErreurAction message={erreur} />
      </div>
    );

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button type="button" size="sm" variant="ghost" onClick={() => { setValeur(nom); setMode("renommer"); }} aria-label={`Renommer ${nom}`}>
        <Pencil /> Renommer
      </Button>
      {dupliquer && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={enCours}
          aria-label={`Dupliquer ${nom}`}
          onClick={() =>
            executer(dupliquer, (d) => {
              const id = (d as { id?: string } | undefined)?.id;
              if (id && apresDuplication) router.push(apresDuplication(id));
            })
          }
        >
          <Copy /> Dupliquer
        </Button>
      )}
      <Button type="button" size="sm" variant="ghost" onClick={() => setMode("supprimer")} aria-label={`Supprimer ${nom}`}>
        <Trash2 /> Supprimer
      </Button>
      <ErreurAction message={erreur} />
    </div>
  );
}

export function ProjetActions({ id, nom }: { id: string; nom: string }) {
  const router = useRouter();
  return (
    <LigneActions
      nom={nom}
      libelleSuppression={`Supprimer le projet « ${nom} » et toutes ses études ?`}
      renommer={(n) => renommerProjet({ id, nom: n })}
      supprimer={async () => {
        const r = await supprimerProjet({ id });
        if (r.ok) router.push("/projets");
        return r;
      }}
    />
  );
}

export function EtudeActions({ id, projetId, titre }: { id: string; projetId: string; titre: string }) {
  return (
    <LigneActions
      nom={titre}
      libelleSuppression={`Supprimer l'étude « ${titre} » et toutes ses versions ?`}
      renommer={(t) => renommerEtude({ id, titre: t })}
      supprimer={() => supprimerEtude({ id })}
      dupliquer={() => dupliquerEtude({ id })}
      apresDuplication={(copie) => `/projets/${projetId}/etudes/${copie}`}
    />
  );
}
