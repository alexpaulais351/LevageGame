import Link from "next/link";

import { DisponibiliteAbaques } from "@/components/modules/machines/DisponibiliteAbaques";
import { ListeMachines } from "@/components/modules/machines/ListeMachines";
import { machinesSansAbaque, versItem } from "@/lib/machines/filtre";
import { bucketPdf } from "@/lib/machines/pdf";
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
  const abaques = vue === "abaques";
  const ctx = await exigerUtilisateur(abaques ? "/machines?vue=abaques" : "/machines");
  let machines: MachineResume[] = [];
  let erreur: string | null = null;
  try {
    machines = await listerMachines(ctx.supabase, "public", ctx.user.id);
  } catch (e) {
    erreur = e instanceof Error ? e.message : "Erreur inconnue";
  }

  // Lien d'ouverture du PDF source de chaque machine (une seule requête de signature).
  const items = machines.map(versItem);
  if (!abaques) {
    const chemins = [...new Set(items.filter((x) => x.pdfPath).map((x) => x.pdfPath as string))];
    if (chemins.length > 0) {
      const { data } = await ctx.supabase.storage.from(bucketPdf(false)).createSignedUrls(chemins, 3600);
      const urls = new Map((data ?? []).filter((d) => d.path && d.signedUrl && !d.error).map((d) => [d.path as string, d.signedUrl]));
      for (const x of items) if (x.pdfPath) x.pdfUrl = urls.get(x.pdfPath) ?? null;
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Machines</h1>
        <Link href="/tickets" className="text-sm font-semibold text-primary underline">
          Demander l&apos;intégration d&apos;une machine ou d&apos;un abaque
        </Link>
      </div>

      <nav aria-label="Vues du catalogue" className="flex gap-1 overflow-x-auto border-b border-border">
        <Onglet href="/machines" actif={!abaques} testid="onglet-catalogue">
          Catalogue public
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
            Catalogue public en lecture seule. Chaque abaque indique sa source ; « À vérifier » signale un abaque dont le contrôle humain reste à faire.
          </p>
          {!erreur && (
            <ListeMachines
              items={items}
              vide="Catalogue vide — aucun abaque n'est encore chargé."
            />
          )}
        </>
      )}
    </div>
  );
}
