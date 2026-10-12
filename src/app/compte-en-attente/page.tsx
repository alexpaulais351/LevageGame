import { Clock, LogOut, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { deconnexion } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { contexteUtilisateur, etatCompte, type StatutCompte } from "@/lib/supabase/session";

export const metadata = { title: "Compte en attente — Adéquation levage" };

const TEXTES: Record<Exclude<StatutCompte, "approuve">, { titre: string; corps: string }> = {
  en_attente: {
    titre: "Compte en attente de validation",
    corps:
      "Votre compte a bien été créé. L'administrateur doit l'accepter avant que vous puissiez accéder à l'outil, au catalogue machines et à vos projets. Vous pourrez vous connecter normalement une fois la demande acceptée.",
  },
  refuse: {
    titre: "Demande de compte refusée",
    corps: "L'administrateur n'a pas accepté cette demande de compte. Aucune donnée n'est accessible. Contactez l'administrateur si vous pensez qu'il s'agit d'une erreur.",
  },
  suspendu: {
    titre: "Compte suspendu",
    corps: "L'accès de ce compte a été suspendu par l'administrateur. Aucune donnée n'est accessible tant que le compte n'est pas réactivé.",
  },
};

export default async function PageCompteEnAttente({ searchParams }: { searchParams: Promise<{ nouveau?: string }> }) {
  const ctx = await contexteUtilisateur();
  if (!ctx) redirect("/login");
  const etat = await etatCompte();
  if (etat?.statut === "approuve") redirect("/");
  const statut = etat?.statut ?? "en_attente";
  const { nouveau } = await searchParams;
  const texte = TEXTES[statut];
  const bloque = statut !== "en_attente";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <Card className={bloque ? "border-vinci-rouge" : "border-primary"}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${bloque ? "text-vinci-rouge-dark" : "text-primary"}`}>
            {bloque ? <ShieldAlert className="size-5" aria-hidden /> : <Clock className="size-5" aria-hidden />}
            {texte.titre}
          </CardTitle>
          <CardDescription>
            Compte : <strong>{ctx.user.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {nouveau && statut === "en_attente" && (
            <p role="status" className="rounded-md border border-primary-light bg-vinci-bleu-xlight px-3 py-2 text-sm text-vinci-bleu-dark">
              Votre demande a été transmise à l&apos;administrateur.
            </p>
          )}
          <p data-testid="statut-compte" data-statut={statut}>
            {texte.corps}
          </p>
          <form action={deconnexion}>
            <Button type="submit" variant="outline" size="lg">
              <LogOut />
              Se déconnecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
