import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText } from "lucide-react";

import { listerEtudes } from "@/actions/etudes";
import { CreerEtudeForm } from "@/components/modules/account/CreationForms";
import { EtudeActions, ProjetActions } from "@/components/modules/account/LigneActions";
import { BadgeVerdict } from "@/components/modules/account/BadgeVerdict";
import { Card } from "@/components/ui/card";
import { projetAutorise } from "@/lib/supabase/domain";
import { exigerUtilisateur } from "@/lib/supabase/session";
import { idSchema } from "@/lib/account/schemas";

const dateFR = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

export default async function PageProjet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await exigerUtilisateur(`/projets/${id}`);
  if (!idSchema.safeParse(id).success) notFound();
  const projet = await projetAutorise(supabase, user.id, id);
  if (!projet) notFound();
  const r = await listerEtudes({ projetId: id });
  const etudes = r.ok ? r.data : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/projets" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ChevronLeft className="size-4" aria-hidden /> Projets
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">{projet.name}</h1>
            <p className="text-sm text-foreground/70">
              {[projet.client, projet.site_address].filter(Boolean).join(" · ") || "Aucune précision sur le chantier"}
            </p>
          </div>
          <ProjetActions id={projet.id} nom={projet.name} />
        </div>
      </div>

      {etudes.length === 0 ? (
        <p className="text-foreground/70">Aucune étude dans ce projet. Créez la première ci-dessous.</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Études du projet">
          {etudes.map((e) => (
            <li key={e.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <Link href={`/projets/${id}/etudes/${e.id}`} className="group flex min-w-0 items-center gap-3">
                  <FileText className="size-6 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-primary group-hover:underline">{e.titre}</span>
                    <span className="block text-sm text-foreground/70">
                      {e.reference ?? "Sans référence"} · indice {e.indice ?? "—"} · modifiée le {dateFR(e.majLe)}
                    </span>
                  </span>
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                  <BadgeVerdict verdict={e.verdict} />
                  <EtudeActions id={e.id} projetId={id} titre={e.titre} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card className="p-4">
        <CreerEtudeForm projetId={id} />
      </Card>
    </div>
  );
}
