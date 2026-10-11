import { notFound } from "next/navigation";

import { listerVersions, ouvrirVersion } from "@/actions/versions";
import { HistoriqueVersions } from "@/components/modules/account/HistoriqueVersions";
import { Wizard } from "@/components/modules/wizard/Wizard";
import { idSchema } from "@/lib/account/schemas";
import { etudeAutorisee, reglagesUtilisateur } from "@/lib/supabase/domain";
import { logoEnDataUri } from "@/lib/supabase/logo";
import { exigerUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Étude — Adéquation levage" };

export default async function PageEtude({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; etudeId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { id, etudeId } = await params;
  const { version } = await searchParams;
  const { supabase, user } = await exigerUtilisateur(`/projets/${id}/etudes/${etudeId}`);
  if (!idSchema.safeParse(id).success || !idSchema.safeParse(etudeId).success) notFound();

  const etude = await etudeAutorisee(supabase, user.id, etudeId);
  if (!etude || etude.project_id !== id) notFound();

  const rv = await listerVersions({ etudeId });
  if (!rv.ok) notFound();
  const versions = rv.data;
  const courante = versions.find((v) => v.courante) ?? versions[0];
  if (!courante) notFound();

  const demandee = Number(version);
  const index = Number.isInteger(demandee) && versions.some((v) => v.index === demandee) ? demandee : courante.index;
  const ov = await ouvrirVersion({ etudeId, index });
  if (!ov.ok) notFound();

  const [reglages, { data: profil }] = await Promise.all([
    reglagesUtilisateur(supabase, user.id),
    supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle(),
  ]);
  const { data: org } = profil?.organization_id
    ? await supabase.from("organizations").select("name,logo_path").eq("id", profil.organization_id).maybeSingle()
    : { data: null };
  const logoUrl = await logoEnDataUri(supabase, org?.logo_path);

  return (
    <div className="flex flex-col gap-8">
      <Wizard
        etude={{
          etudeId,
          projetId: id,
          projetNom: etude.projet.name,
          titre: etude.title,
          reference: etude.reference,
          versionIndex: index,
          versionCouranteIndex: courante.index,
          lectureSeule: index !== courante.index,
          data: ov.data.data,
          pdf: { redacteur: reglages.nom, entreprise: org?.name ?? "", logoUrl },
        }}
      />
      <HistoriqueVersions versions={versions} projetId={id} etudeId={etudeId} indexAffiche={index} />
    </div>
  );
}
