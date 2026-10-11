import { notFound } from "next/navigation";

import { ConfigurationForm } from "@/components/modules/machines/ConfigurationForm";
import { idSchema } from "@/lib/account/schemas";
import { lireMachine } from "@/lib/machines/queries";
import { exigerUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Modifier la configuration — Adéquation levage" };

export default async function PageModifierConfiguration({ params }: { params: Promise<{ id: string; configId: string }> }) {
  const { id, configId } = await params;
  const { supabase, user } = await exigerUtilisateur(`/machines/${id}/configurations/${configId}`);
  if (!idSchema.safeParse(id).success || !idSchema.safeParse(configId).success) notFound();
  const m = await lireMachine(supabase, id);
  const { data: owner } = await supabase.from("machines").select("owner_id").eq("id", id).eq("owner_id", user.id).maybeSingle();
  const c = m?.configurations.find((x) => x.id === configId);
  if (!m || !owner || !c) notFound();
  const { data: pj } = await supabase.from("attachments").select("id").eq("machine_id", id).eq("kind", "pdf_constructeur").limit(1);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Modifier la configuration</h1>
        <p className="text-foreground/70">
          {m.manufacturerName} {m.model} — {c.label}
        </p>
      </div>
      <ConfigurationForm
        machineId={m.id}
        pdfExistant={(pj?.length ?? 0) > 0}
        existante={{
          id: c.id,
          label: c.label,
          params: Object.entries(c.params).map(([cle, valeur]) => ({ cle, valeur: String(valeur ?? "") })),
          moufleKg: c.moufleKg,
          notes: c.notes,
        }}
      />
    </div>
  );
}
