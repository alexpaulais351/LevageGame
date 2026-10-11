"use client";

import { useState, useTransition } from "react";
import { FolderPlus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { creerEtude } from "@/actions/etudes";
import { creerProjet } from "@/actions/projets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ChampForm, ErreurAction } from "./form-bits";

export function CreerProjetForm() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Nouveau projet</CardTitle>
        <CardDescription>Un projet regroupe les adéquations d&apos;un même chantier.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          aria-label="Nouveau projet"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            demarrer(async () => {
              setErreur(null);
              const r = await creerProjet({ nom: f.get("nom"), adresse: f.get("adresse") ?? undefined, client: f.get("client") ?? undefined });
              if (!r.ok) return setErreur(r.error);
              router.push(`/projets/${r.data.id}`);
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <ChampForm label="Nom du projet" name="nom" required />
            <ChampForm label="Adresse du chantier" name="adresse" />
            <ChampForm label="Client" name="client" />
          </div>
          <ErreurAction message={erreur} />
          <Button type="submit" size="lg" className="self-start" disabled={enCours}>
            <FolderPlus />
            {enCours ? "Création…" : "Créer le projet"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function CreerEtudeForm({ projetId }: { projetId: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <form
      aria-label="Nouvelle étude"
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        demarrer(async () => {
          setErreur(null);
          const r = await creerEtude({ projetId, titre: f.get("titre") });
          if (!r.ok) return setErreur(r.error);
          router.push(`/projets/${projetId}/etudes/${r.data.id}`);
        });
      }}
    >
      <div className="sm:w-96">
        <ChampForm label="Titre de la nouvelle étude" name="titre" required />
      </div>
      <Button type="submit" size="lg" disabled={enCours}>
        <Plus />
        {enCours ? "Création…" : "Créer l'étude"}
      </Button>
      <ErreurAction message={erreur} />
    </form>
  );
}
