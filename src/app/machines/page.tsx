import Link from "next/link";
import { Plus } from "lucide-react";

import { CarteMachine } from "@/components/modules/machines/CarteMachine";
import { Button } from "@/components/ui/button";
import { listerMachines, type MachineResume } from "@/lib/machines/queries";
import { exigerUtilisateur } from "@/lib/supabase/session";
import { cn } from "@/lib/utils";

export const metadata = { title: "Machines — Adéquation levage" };

function Onglet({ href, actif, children, testid }: { href: string; actif: boolean; children: React.ReactNode; testid: string }) {
  return (
    <Link
      href={href}
      data-testid={testid}
      aria-current={actif ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-t-md border-b-4 px-4 text-sm font-bold",
        actif ? "border-primary bg-vinci-bleu-xlight text-primary" : "border-transparent text-foreground/70 hover:text-primary",
      )}
    >
      {children}
    </Link>
  );
}

function parType(machines: MachineResume[]): [string, MachineResume[]][] {
  const m = new Map<string, MachineResume[]>();
  for (const x of machines) m.set(x.typeLabel, [...(m.get(x.typeLabel) ?? []), x]);
  return [...m.entries()];
}

export default async function PageMachines({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams;
  const mes = vue === "mes";
  const ctx = await exigerUtilisateur(mes ? "/machines?vue=mes" : "/machines");
  let machines: MachineResume[] = [];
  let erreur: string | null = null;
  try {
    machines = await listerMachines(ctx.supabase, mes ? "mine" : "public", ctx.user.id);
  } catch (e) {
    erreur = e instanceof Error ? e.message : "Erreur inconnue";
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Machines</h1>
        <Button asChild size="lg">
          <Link href="/machines/nouvelle">
            <Plus />
            Ajouter ma machine
          </Link>
        </Button>
      </div>

      <nav aria-label="Origine des machines" className="flex gap-1 border-b border-border">
        <Onglet href="/machines" actif={!mes} testid="onglet-catalogue">
          Catalogue public
        </Onglet>
        <Onglet href="/machines?vue=mes" actif={mes} testid="onglet-mes-machines">
          Mes machines
        </Onglet>
      </nav>

      {erreur && (
        <p role="alert" className="text-vinci-rouge-dark">
          Catalogue indisponible : {erreur}
        </p>
      )}

      <>
          <p className="text-sm text-foreground/80">
            {mes
              ? "Vos machines, visibles de vous seul. Un abaque saisi par vos soins reste « à vérifier » tant que vous n'avez pas contrôlé chaque valeur contre le document constructeur."
              : "Catalogue public en lecture seule. Chaque abaque indique sa source ; « À vérifier » signale un abaque dont le contrôle humain reste à faire."}
          </p>
          {machines.length === 0 && !erreur ? (
            <p role="status" className="rounded-md bg-vinci-bleu-xlight p-4 text-sm" data-testid="liste-vide">
              {mes ? "Aucune machine personnelle pour le moment. Utilisez « Ajouter ma machine »." : "Catalogue vide — aucun abaque n'est encore chargé."}
            </p>
          ) : (
            parType(machines).map(([type, liste]) => (
              <section key={type} aria-label={type} className="flex flex-col gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-primary-light">{type}</h2>
                {liste.map((m) => (
                  <CarteMachine key={m.id} m={m} />
                ))}
              </section>
            ))
          )}
      </>
    </div>
  );
}
