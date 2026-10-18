import { listerProjets } from "@/actions/projets";
import { OutilTransport, type SaisieInitiale } from "@/components/modules/transport/OutilTransport";
import type { Demandeur } from "@/lib/transport/demande";
import { logoEnDataUri } from "@/lib/supabase/logo";
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
  searchParams: Promise<{ type?: string; L?: string; l?: string; h?: string; m?: string; nom?: string; projet?: string }>;
}) {
  const ctx = await exigerUtilisateur("/transport");
  const q = await searchParams;
  const initial: SaisieInitiale = {
    type: q.type,
    longueurM: nombre(q.L),
    largeurM: nombre(q.l),
    hauteurM: nombre(q.h),
    masseKg: nombre(q.m),
    designation: q.nom?.slice(0, 120),
    projetId: q.projet,
  };

  // Pré-remplissage de la demande : profil, organisation (profil) et projets de l'utilisateur (RLS).
  const { supabase, user } = ctx;
  const [{ data: profil }, projets] = await Promise.all([
    supabase.from("profiles").select("full_name,role,phone,entreprise_declaree,organization_id").eq("id", user.id).maybeSingle(),
    listerProjets(),
  ]);
  const { data: org } = profil?.organization_id
    ? await supabase.from("organizations").select("name,address,siret,logo_path").eq("id", profil.organization_id).maybeSingle()
    : { data: null };
  const logoUrl = await logoEnDataUri(supabase, org?.logo_path);
  const demandeur: Demandeur = {
    nom: profil?.full_name ?? user.email ?? "",
    fonction: profil?.role ?? null,
    entreprise: org?.name ?? profil?.entreprise_declaree ?? null,
    adresse: org?.address ?? null,
    siret: org?.siret ?? null,
    telephone: profil?.phone ?? null,
    email: user.email ?? null,
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-primary">Transport des pièces</h1>
        <p className="text-sm text-foreground/80">
          Avant le levage : quel convoi pour amener la pièce sur le chantier ? Catégorie de transport, voiture pilote, démarches, véhicules adaptés et
          projet de demande administrative.
        </p>
      </div>
      <OutilTransport
        initial={initial}
        contexte={{ demandeur, logoUrl, projets: projets.ok ? projets.data.map((x) => ({ id: x.id, nom: x.nom, adresse: x.adresse, client: x.client })) : [] }}
      />
    </div>
  );
}
