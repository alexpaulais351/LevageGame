import Link from "next/link";
import { FolderOpen } from "lucide-react";

import { listerProjets } from "@/actions/projets";
import { CreerProjetForm } from "@/components/modules/account/CreationForms";
import { ProjetActions } from "@/components/modules/account/LigneActions";
import { Card } from "@/components/ui/card";
import { exigerUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Projets — Adéquation levage" };

const dateFR = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

export default async function PageProjets() {
  await exigerUtilisateur("/projets");
  const r = await listerProjets();
  const projets = r.ok ? r.data : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-primary">Projets</h1>
      {!r.ok && (
        <p role="alert" className="text-vinci-rouge-dark">
          {r.error}
        </p>
      )}
      {projets.length === 0 ? (
        <p className="text-foreground/70">Aucun projet pour le moment. Créez votre premier projet ci-dessous.</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Liste des projets">
          {projets.map((p) => (
            <li key={p.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <Link href={`/projets/${p.id}`} className="group flex min-w-0 items-center gap-3">
                  <FolderOpen className="size-6 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-primary group-hover:underline">{p.nom}</span>
                    <span className="block text-sm text-foreground/70">
                      {p.nbEtudes} étude{p.nbEtudes > 1 ? "s" : ""}
                      {p.client ? ` · ${p.client}` : ""}
                      {p.adresse ? ` · ${p.adresse}` : ""} · modifié le {dateFR(p.majLe)}
                    </span>
                  </span>
                </Link>
                <ProjetActions id={p.id} nom={p.nom} />
              </Card>
            </li>
          ))}
        </ul>
      )}
      <CreerProjetForm />
    </div>
  );
}
