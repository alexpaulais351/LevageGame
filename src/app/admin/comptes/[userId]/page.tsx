import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { listerComptes } from "@/actions/admin";
import { BadgeStatutCompte } from "@/components/modules/admin/BadgeStatutCompte";
import { DecisionCompte } from "@/components/modules/admin/DecisionCompte";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { idSchema } from "@/lib/account/schemas";
import { exigerAdmin } from "@/lib/supabase/session";

export const metadata = { title: "Demande de compte — Administration" };

const dateHeureFR = (iso: string) => {
  const d = new Date(iso);
  const o = { timeZone: "Europe/Paris" } as const;
  return `${d.toLocaleDateString("fr-FR", { ...o, dateStyle: "long" })} à ${d.toLocaleTimeString("fr-FR", { ...o, hour: "2-digit", minute: "2-digit" })}`;
};

/**
 * Page cible du bouton « Valider la demande » de l'e-mail envoyé à l'administrateur.
 * L'ouverture du lien (GET) n'a AUCUN effet : la décision n'est prise qu'au clic (Server Action).
 * Non connecté : le middleware renvoie vers /login?suivant=<cette page>.
 */
export default async function PageAdminCompte({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  await exigerAdmin(`/admin/comptes/${encodeURIComponent(userId)}`);
  if (!idSchema.safeParse(userId).success) notFound();
  const r = await listerComptes();
  const compte = r.ok ? r.data.find((c) => c.id === userId) : undefined;
  if (!compte) notFound();
  const nom = compte.nom || compte.email;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/admin/comptes" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ChevronLeft className="size-4" aria-hidden /> Comptes utilisateurs
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-primary">
            Demande de compte <BadgeStatutCompte statut={compte.statut} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="font-semibold">Nom</dt>
            <dd>{compte.nom ?? "—"}</dd>
            <dt className="font-semibold">Entreprise</dt>
            <dd>{compte.entreprise ?? "—"}</dd>
            <dt className="font-semibold">E-mail</dt>
            <dd className="break-all">{compte.email}</dd>
            <dt className="font-semibold">Demande du</dt>
            <dd>{dateHeureFR(compte.creeLe)}</dd>
            {compte.statutModifieLe && (
              <>
                <dt className="font-semibold">Dernière décision</dt>
                <dd>{dateHeureFR(compte.statutModifieLe)}</dd>
              </>
            )}
          </dl>
          {compte.estAdmin ? (
            <p className="text-sm text-foreground/70">Compte administrateur : non modifiable depuis l&apos;application.</p>
          ) : (
            <DecisionCompte userId={compte.id} nom={nom} statut={compte.statut} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
