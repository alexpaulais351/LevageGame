import { redirect } from "next/navigation";

import { LoginForm } from "@/components/modules/account/LoginForm";
import { cheminInterne } from "@/lib/account/result";
import { supabaseConfigure } from "@/lib/supabase/env";
import { contexteUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Connexion — Adéquation levage" };

export default async function PageLogin({
  searchParams,
}: {
  searchParams: Promise<{ suivant?: string; erreur?: string; onglet?: string }>;
}) {
  const { suivant, erreur, onglet } = await searchParams;
  const cible = cheminInterne(suivant);
  if (await contexteUtilisateur()) redirect(cible);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Adéquation de levage</h1>
      <p className="text-sm text-foreground/80">
        Accès réservé : chaque nouveau compte est validé par l&apos;administrateur avant de donner accès à l&apos;outil.
      </p>
      {!supabaseConfigure() && (
        <p role="alert" className="rounded-md border border-vinci-rouge bg-vinci-rouge-xlight px-3 py-2 text-sm text-vinci-rouge-dark">
          Les comptes ne sont pas configurés sur cet environnement : l&apos;application est indisponible.
        </p>
      )}
      <LoginForm suivant={cible} erreurLien={erreur === "lien"} ongletInitial={onglet === "inscription" ? "inscription" : "connexion"} />
    </div>
  );
}
