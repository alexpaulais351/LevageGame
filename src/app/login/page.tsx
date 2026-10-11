import { redirect } from "next/navigation";

import { LoginForm } from "@/components/modules/account/LoginForm";
import { cheminInterne } from "@/lib/account/result";
import { contexteUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Connexion — Adéquation levage" };

export default async function PageLogin({ searchParams }: { searchParams: Promise<{ next?: string; erreur?: string }> }) {
  const { next, erreur } = await searchParams;
  const cible = cheminInterne(next);
  if (await contexteUtilisateur()) redirect(cible);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Connexion</h1>
      <LoginForm next={cible} erreurLien={erreur === "lien"} />
    </div>
  );
}
