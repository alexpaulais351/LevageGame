import { redirect } from "next/navigation";

import { Ruban } from "@/components/layout/Ruban";
import { LoginForm } from "@/components/modules/account/LoginForm";
import { cheminInterne } from "@/lib/account/result";
import { supabaseConfigure } from "@/lib/supabase/env";
import { contexteUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Connexion — Adéquation levage" };

export default async function PageLogin({
  searchParams,
}: {
  searchParams: Promise<{ suivant?: string; erreur?: string; info?: string; onglet?: string }>;
}) {
  const { suivant, erreur, info, onglet } = await searchParams;
  const cible = cheminInterne(suivant);
  if (await contexteUtilisateur()) redirect(cible);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Ruban
        variante="hero"
        titre="Adéquation de levage"
        sousTitre="Accès réservé aux comptes validés par l'administrateur."
        logo={
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo.svg" alt="" width={64} height={64} className="size-14 shrink-0 rounded-2xl bg-white ring-2 ring-white/80 sm:size-16" />
        }
      />
      {!supabaseConfigure() && (
        <p role="alert" className="rounded-md border border-vinci-rouge bg-vinci-rouge-xlight px-3 py-2 text-sm text-vinci-rouge-dark">
          Les comptes ne sont pas configurés sur cet environnement : l&apos;application est indisponible.
        </p>
      )}
      {info === "confirme" && (
        <p role="status" className="rounded-md border border-vinci-bleu bg-vinci-bleu-xlight px-3 py-2 text-sm text-vinci-bleu-dark">
          Adresse e-mail confirmée. Connectez-vous avec votre mot de passe.
        </p>
      )}
      <LoginForm suivant={cible} erreurLien={erreur === "lien"} ongletInitial={onglet === "inscription" ? "inscription" : "connexion"} />
    </div>
  );
}
