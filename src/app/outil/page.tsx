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
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Projet et étude</CardTitle>
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
