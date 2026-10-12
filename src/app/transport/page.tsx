import { OutilTransport, type SaisieInitiale } from "@/components/modules/transport/OutilTransport";
import { exigerUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Transport des pièces — Adéquation levage" };

/** Nombre > 0 lu dans l'URL (pré-remplissage depuis une étude), sinon undefined. */
function nombre(v: string | undefined): number | undefined {
  const n = v === undefined ? Number.NaN : Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default async function PageTransport({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; L?: string; l?: string; h?: string; m?: string; nom?: string }>;
}) {
  await exigerUtilisateur("/transport");
  const q = await searchParams;
  const initial: SaisieInitiale = {
    type: q.type,
    longueurM: nombre(q.L),
    largeurM: nombre(q.l),
    hauteurM: nombre(q.h),
    masseKg: nombre(q.m),
    designation: q.nom?.slice(0, 120),
  };
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-primary">Transport des pièces</h1>
        <p className="text-sm text-foreground/80">
          Avant le levage : quel convoi pour amener la pièce sur le chantier ? Catégorie de transport, voiture pilote, démarches et véhicules adaptés.
        </p>
      </div>
      <OutilTransport initial={initial} />
    </div>
  );
}
