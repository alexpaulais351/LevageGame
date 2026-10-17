import Link from "next/link";
import { ArrowRight, ClipboardList, Zap } from "lucide-react";

import { listerProjets } from "@/actions/projets";
import { NouvelleAdequationForm } from "@/components/modules/account/NouvelleAdequationForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigerUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Nouvelle adéquation — Adéquation levage" };

/** Toute adéquation appartient à un projet : choix ou création du projet, puis création de l'étude (version A). */
export default async function PageOutil({ searchParams }: { searchParams: Promise<{ projet?: string }> }) {
  await exigerUtilisateur("/outil");
  const { projet } = await searchParams;
  const r = await listerProjets();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-primary">Nouvelle adéquation</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/outil/rapide" className="flex flex-col gap-1 rounded-lg border-2 border-primary bg-vinci-bleu-xlight p-4 hover:bg-vinci-bleu-xlight/70" data-testid="lien-rapide">
          <span className="flex items-center gap-2 font-bold text-primary">
            <Zap className="size-5" aria-hidden />
            Adéquation rapide
            <ArrowRight className="ml-auto size-4" aria-hidden />
          </span>
          <span className="text-sm text-foreground/80">Vérifier une seule pose : machine, masse de la charge avec coefficient de marge, portée. Sans projet ni enregistrement.</span>
        </Link>
        <a href="#adequation-projet" className="flex flex-col gap-1 rounded-lg border-2 border-border p-4 hover:border-primary hover:bg-vinci-bleu-xlight">
          <span className="flex items-center gap-2 font-bold text-primary">
            <ClipboardList className="size-5" aria-hidden />
            Adéquation projet
          </span>
          <span className="text-sm text-foreground/80">Dossier complet en 9 étapes, enregistré dans un projet, avec PDF : charge, élingage, machine, sol, vent, personnel.</span>
        </a>
      </div>
      <Card id="adequation-projet">
        <CardHeader>
          <CardTitle className="text-primary">Adéquation projet : projet et étude</CardTitle>
          <CardDescription>
            Choisissez le projet (chantier) de l&apos;adéquation, ou créez-en un, puis nommez l&apos;étude. Elle est enregistrée
            immédiatement (version A) et s&apos;ouvre dans l&apos;assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {r.ok ? (
            <NouvelleAdequationForm projets={r.data} projetInitial={projet} />
          ) : (
            <p role="alert" className="text-vinci-rouge-dark">
              {r.error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
