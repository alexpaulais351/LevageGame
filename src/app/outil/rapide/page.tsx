import { AdequationRapide } from "@/components/modules/rapide/AdequationRapide";
import { exigerUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Adéquation rapide — Adéquation levage" };

/** Vérification rapide d'une pose (machine, masse × coef. de marge, portée) : sans projet, rien n'est enregistré (D43). */
export default async function PageAdequationRapide() {
  const { supabase, user } = await exigerUtilisateur("/outil/rapide");
  const { data: profil } = await supabase.from("profiles").select("full_name,entreprise_declaree,organization_id").eq("id", user.id).maybeSingle();
  const { data: org } = profil?.organization_id ? await supabase.from("organizations").select("name").eq("id", profil.organization_id).maybeSingle() : { data: null };
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Adéquation rapide</h1>
        <p className="text-sm text-foreground/70">Une charge peut-elle être posée à une distance donnée avec cette machine ?</p>
      </div>
      <AdequationRapide redacteur={profil?.full_name ?? user.email ?? ""} entreprise={org?.name ?? profil?.entreprise_declaree ?? null} />
    </div>
  );
}
