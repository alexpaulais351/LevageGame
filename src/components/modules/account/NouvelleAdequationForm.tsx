"use client";

import { useState, useTransition } from "react";
import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { nouvelleAdequation } from "@/actions/etudes";
import type { ProjetResume } from "@/actions/projets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ErreurAction } from "./form-bits";

const NOUVEAU = "__nouveau__";

/** Nouvelle adéquation : choix (ou création) du projet, titre de l'étude, puis ouverture de l'assistant. */
export function NouvelleAdequationForm({ projets, projetInitial }: { projets: ProjetResume[]; projetInitial?: string }) {
  const router = useRouter();
  const initial = projets.some((p) => p.id === projetInitial) ? projetInitial! : (projets[0]?.id ?? NOUVEAU);
  const [choix, setChoix] = useState(initial);
  const [nomProjet, setNomProjet] = useState("");
  const [titre, setTitre] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  return (
    <form
      aria-label="Nouvelle adéquation"
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        demarrer(async () => {
          setErreur(null);
          const r = await nouvelleAdequation({ titre, ...(choix === NOUVEAU ? { nouveauProjet: nomProjet } : { projetId: choix }) });
          if (!r.ok) return setErreur(r.error);
          router.push(`/projets/${r.data.projetId}/etudes/${r.data.etudeId}`);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nouvelle-projet">Projet</Label>
          <select
            id="nouvelle-projet"
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {projets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
            <option value={NOUVEAU}>Nouveau projet…</option>
          </select>
        </div>
        {choix === NOUVEAU && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nouvelle-nom-projet">Nom du nouveau projet</Label>
            <Input id="nouvelle-nom-projet" value={nomProjet} onChange={(e) => setNomProjet(e.target.value)} required maxLength={160} className="h-11 text-base" />
          </div>
        )}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="nouvelle-titre">Titre de l&apos;étude</Label>
          <Input
            id="nouvelle-titre"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
            maxLength={200}
            placeholder="Ex. : Pose des prédalles R+3"
            className="h-11 text-base"
          />
        </div>
      </div>
      <ErreurAction message={erreur} />
      <Button type="submit" size="lg" className="self-start" disabled={enCours}>
        <PlusCircle />
        {enCours ? "Création…" : "Créer l'étude et ouvrir l'assistant"}
      </Button>
    </form>
  );
}
