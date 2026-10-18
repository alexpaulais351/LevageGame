import { MachineForm } from "@/components/modules/machines/MachineForm";
import { exigerUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Nouvelle machine — Adéquation levage" };

export default async function PageNouvelleMachine() {
  const { supabase } = await exigerUtilisateur("/machines/nouvelle");
  const [{ data: types }, { data: constructeurs }] = await Promise.all([
    supabase.from("machine_types").select("id,code,label").order("label"),
    supabase.from("manufacturers").select("id,name").order("name"),
  ]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-primary">Ajouter ma machine</h1>
      <MachineForm
        types={(types ?? []).map((t) => ({ id: t.id as string, code: t.code as string, label: t.label as string }))}
        constructeurs={(constructeurs ?? []).map((c) => ({ id: c.id as string, label: c.name as string }))}
      />
    </div>
  );
}
