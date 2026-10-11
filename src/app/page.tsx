import { redirect } from "next/navigation";

import { contexteUtilisateur, etatCompte } from "@/lib/supabase/session";

/** Accueil : aiguillage selon l'état du compte (le middleware applique les mêmes règles). */
export default async function Accueil() {
  if (!(await contexteUtilisateur())) redirect("/login");
  const etat = await etatCompte();
  redirect(etat?.statut === "approuve" ? "/projets" : "/compte-en-attente");
}
