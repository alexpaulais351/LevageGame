import Link from "next/link";
import { Plus } from "lucide-react";

import { DisponibiliteAbaques } from "@/components/modules/machines/DisponibiliteAbaques";
import { ListeMachines } from "@/components/modules/machines/ListeMachines";
import { Button } from "@/components/ui/button";
import { machinesSansAbaque, versItem } from "@/lib/machines/filtre";
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
        "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-t-md border-b-4 px-4 text-sm font-bold",
        actif ? "border-primary bg-vinci-bleu-xlight text-primary" : "border-transparent text-foreground/70 hover:text-primary",
      )}
    >
      {children}
    </Link>
  );
}

export default async function PageMachines({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams;
  const mes = vue === "mes";
  const abaques = vue === "abaques";
  const ctx = await exigerUtilisateur(mes ? "/machines?vue=mes" : abaques ? "/machines?vue=abaques" : "/machines");
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

      <nav aria-label="Origine des machines" className="flex gap-1 overflow-x-auto border-b border-border">
        <Onglet href="/machines" actif={!mes && !abaques} testid="onglet-catalogue">
          Catalogue public
        </Onglet>
        <Onglet href="/machines?vue=mes" actif={mes} testid="onglet-mes-machines">
          Mes machines
        </Onglet>
        <Onglet href="/machines?vue=abaques" actif={abaques} testid="onglet-abaques">
          Disponibilité des abaques
        </Onglet>
      </nav>

      {erreur && (
        <p role="alert" className="text-vinci-rouge-dark">
          Catalogue indisponible : {erreur}
        </p>
      )}

      {abaques ? (
        !erreur && <DisponibiliteAbaques avec={machines.map(versItem)} sans={machinesSansAbaque()} />
      ) : (
        <>
          <p className="text-sm text-foreground/80">
            {mes
              ? "Vos machines, visibles de vous seul. Un abaque saisi par vos soins reste « à vérifier » tant que vous n'avez pas contrôlé chaque valeur contre le document constructeur."
              : "Catalogue public en lecture seule. Chaque abaque indique sa source ; « À vérifier » signale un abaque dont le contrôle humain reste à faire."}
          </p>
          {!erreur && (
            <ListeMachines
              items={machines.map(versItem)}
              vide={mes ? "Aucune machine personnelle pour le moment. Utilisez « Ajouter ma machine »." : "Catalogue vide — aucun abaque n'est encore chargé."}
            />
          )}
        </>
      )}
    </div>
  );
}
