import { notFound } from "next/navigation";

import { MachineForm } from "@/components/modules/machines/MachineForm";
import { idSchema } from "@/lib/account/schemas";
import { lireMachine } from "@/lib/machines/queries";
import { exigerUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Modifier la machine — Adéquation levage" };

export default async function PageModifierMachine({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await exigerUtilisateur(`/machines/${id}/modifier`);
  if (!idSchema.safeParse(id).success) notFound();
  const m = await lireMachine(supabase, id);
  if (!m || !m.perso) notFound();
  const { data: owner } = await supabase.from("machines").select("owner_id").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!owner) notFound();
  const [{ data: types }, { data: constructeurs }] = await Promise.all([
    supabase.from("machine_types").select("id,label").order("label"),
    supabase.from("manufacturers").select("id,name").order("name"),
  ]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-primary">
        {m.manufacturerName} {m.model}
      </h1>
      <MachineForm
        types={(types ?? []).map((t) => ({ id: t.id as string, label: t.label as string }))}
        constructeurs={(constructeurs ?? []).map((c) => ({ id: c.id as string, label: c.name as string }))}
        initial={{ id: m.id, typeId: m.typeId, manufacturerId: m.manufacturerId, model: m.model, specs: m.specs, photoUrl: m.photoUrl }}
      />
    </div>
  );
}
