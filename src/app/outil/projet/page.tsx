import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { listerProjets } from "@/actions/projets";
import { NouvelleAdequationForm } from "@/components/modules/account/NouvelleAdequationForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigerUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Adéquation projet — Adéquation levage" };

/** Adéquation projet : choix ou création du projet, puis création de l'étude (version A) et ouverture de l'assistant. */
export default async function PageAdequationProjet({ searchParams }: { searchParams: Promise<{ projet?: string }> }) {
  await exigerUtilisateur("/outil/projet");
  const { projet } = await searchParams;
  const r = await listerProjets();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/outil" className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline">
          <ArrowLeft className="size-4" aria-hidden />
          Nouvelle adéquation
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-primary">Adéquation projet</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Projet et étude</CardTitle>
          <CardDescription>
            Choisissez le projet (chantier) de l&apos;adéquation, ou créez-en un, puis nommez l&apos;étude. Elle est enregistrée immédiatement (version A) et
            s&apos;ouvre dans l&apos;assistant.
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
