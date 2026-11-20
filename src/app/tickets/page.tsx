import { listerTickets } from "@/actions/tickets";
import { TicketsClient } from "@/components/modules/tickets/TicketsClient";
import { trierPourAdmin } from "@/lib/tickets/tickets";
import { etatCompte, exigerUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Demandes — Adéquation levage" };

/** Tickets : l'administrateur voit toutes les demandes ; un utilisateur, les siennes (RLS + RPC lister_tickets). */
export default async function PageTickets() {
  const ctx = await exigerUtilisateur("/tickets");
  const estAdmin = Boolean((await etatCompte())?.estAdmin);
  const r = await listerTickets();
  const tickets = r.ok ? r.data : [];
  return (
    <>
      {!r.ok && (
        <p role="alert" className="mx-auto mb-4 max-w-5xl text-vinci-rouge-dark">
          {r.error}
        </p>
      )}
      <TicketsClient tickets={estAdmin ? trierPourAdmin(tickets) : tickets} estAdmin={estAdmin} moiId={ctx.user.id} />
    </>
  );
}
