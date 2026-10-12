import { LogOut } from "lucide-react";

import { deconnexion } from "@/actions/auth";
import { EntrepriseForm, ProfilForm, SeuilsForm } from "@/components/modules/account/ProfilForms";
import { Button } from "@/components/ui/button";
import { logoEnDataUri } from "@/lib/supabase/logo";
import { exigerUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Profil — Adéquation levage" };

export default async function PageProfil() {
  const { supabase, user } = await exigerUtilisateur("/profil");
  const [{ data: profil }, { data: reglages }] = await Promise.all([
    supabase.from("profiles").select("full_name,role,phone,organization_id").eq("id", user.id).maybeSingle(),
    supabase.from("user_settings").select("threshold_green,threshold_orange").eq("user_id", user.id).maybeSingle(),
  ]);
  const { data: org } = profil?.organization_id
    ? await supabase.from("organizations").select("name,address,logo_path").eq("id", profil.organization_id).maybeSingle()
    : { data: null };
  const logo = await logoEnDataUri(supabase, org?.logo_path);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Profil</h1>
        <form action={deconnexion}>
          <Button type="submit" variant="outline">
            <LogOut />
            Se déconnecter
          </Button>
        </form>
      </div>
      <ProfilForm
        nom={profil?.full_name ?? ""}
        fonction={profil?.role ?? ""}
        telephone={profil?.phone ?? ""}
        email={user.email ?? ""}
      />
      <EntrepriseForm nom={org?.name ?? ""} adresse={org?.address ?? ""} logo={logo} />
      <SeuilsForm vert={Number(reglages?.threshold_green ?? 90)} orange={Number(reglages?.threshold_orange ?? 100)} />
    </div>
  );
}
