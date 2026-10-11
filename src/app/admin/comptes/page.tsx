import Link from "next/link";

import { listerComptes } from "@/actions/admin";
import { BadgeStatutCompte } from "@/components/modules/admin/BadgeStatutCompte";
import { DecisionCompte } from "@/components/modules/admin/DecisionCompte";
import { Card } from "@/components/ui/card";
import { LIBELLE_STATUT, STATUTS } from "@/lib/admin/comptes";
import { exigerAdmin, type StatutCompte } from "@/lib/supabase/session";
import { cn } from "@/lib/utils";

export const metadata = { title: "Comptes — Administration" };

const dateFR = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

export default async function PageAdminComptes({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  await exigerAdmin("/admin/comptes");
  const { filtre: brut } = await searchParams;
  const filtre: StatutCompte = STATUTS.includes(brut as StatutCompte) ? (brut as StatutCompte) : "en_attente";
  const r = await listerComptes();
  const comptes = r.ok ? r.data : [];
  const visibles = comptes.filter((c) => c.statut === filtre);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Comptes utilisateurs</h1>
        <p className="text-sm text-foreground/70">Chaque compte créé doit être accepté avant de donner accès à l&apos;outil.</p>
      </div>
      <nav aria-label="Filtrer les comptes" className="flex flex-wrap gap-2">
        {STATUTS.map((s) => {
          const n = comptes.filter((c) => c.statut === s).length;
          const actif = s === filtre;
          return (
            <Link
              key={s}
              href={`/admin/comptes?filtre=${s}`}
              aria-current={actif ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm",
                actif ? "border-primary bg-primary font-semibold text-white" : "border-border bg-background text-primary hover:bg-vinci-bleu-xlight",
              )}
            >
              {LIBELLE_STATUT[s]}
              <span className={cn("rounded-full px-2 text-xs", actif ? "bg-white text-primary" : "bg-vinci-gris-light")}>{n}</span>
            </Link>
          );
        })}
      </nav>
      {!r.ok && (
        <p role="alert" className="text-vinci-rouge-dark">
          {r.error}
        </p>
      )}
      {visibles.length === 0 ? (
        <p className="text-foreground/70">Aucun compte « {LIBELLE_STATUT[filtre].toLowerCase()} ».</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Liste des comptes">
          {visibles.map((c) => (
            <li key={c.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link href={`/admin/comptes/${c.id}`} className="font-semibold text-primary hover:underline">
                    {c.nom || c.email}
                  </Link>{" "}
                  <BadgeStatutCompte statut={c.statut} />
                  {c.estAdmin && <span className="ml-2 text-xs font-semibold text-primary">Administrateur</span>}
                  <div className="truncate text-sm text-foreground/70">
                    {c.email}
                    {c.entreprise ? ` · ${c.entreprise}` : ""} · inscrit le {dateFR(c.creeLe)}
                  </div>
                </div>
                {!c.estAdmin && <DecisionCompte userId={c.id} nom={c.nom || c.email} statut={c.statut} taille="default" />}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
