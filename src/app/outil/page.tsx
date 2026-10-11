import { Wizard } from "@/components/modules/wizard/Wizard";
import { reglagesUtilisateur } from "@/lib/supabase/domain";
import { contexteUtilisateur } from "@/lib/supabase/session";

export default async function PageOutil() {
  const ctx = await contexteUtilisateur();
  const seuils = ctx ? (await reglagesUtilisateur(ctx.supabase, ctx.user.id)).seuils : null;
  return <Wizard connecte={Boolean(ctx)} seuilsCompte={seuils} />;
}
