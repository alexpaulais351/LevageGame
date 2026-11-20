"use server";

/**
 * Tickets (D54) : création par tout compte approuvé, traitement par l'administrateur.
 * Les droits sont portés par la RLS (`tickets_*`) ; les contrôles ci-dessous s'y ajoutent (défense en profondeur).
 */
import { revalidatePath } from "next/cache";

import { echec, ok, type ActionResult } from "@/lib/account/result";
import { idSchema, premiereErreur } from "@/lib/account/schemas";
import { ACCES_REFUSE, contexteAdmin, contexteApprouve } from "@/lib/supabase/session";
import { creationTicketSchema, mapTicket, traitementTicketSchema, type Ticket } from "@/lib/tickets/tickets";

function revalider() {
  revalidatePath("/tickets");
  revalidatePath("/", "layout"); // pastille de la barre latérale
}

/** Tickets visibles : tous pour l'administrateur, les siens sinon. */
export async function listerTickets(): Promise<ActionResult<Ticket[]>> {
  const ctx = await contexteApprouve();
  if (!ctx) return echec(ACCES_REFUSE);
  const { data, error } = await ctx.supabase.rpc("lister_tickets");
  if (error) return echec("Impossible de charger les demandes.");
  return ok(((data ?? []) as Record<string, unknown>[]).map(mapTicket));
}

export async function creerTicket(input: unknown): Promise<ActionResult<{ numero: number }>> {
  const ctx = await contexteApprouve();
  if (!ctx) return echec(ACCES_REFUSE);
  const p = creationTicketSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const { data, error } = await ctx.supabase
    .from("tickets")
    .insert({ auteur_id: ctx.user.id, ...p.data })
    .select("numero")
    .single();
  if (error || !data) return echec("La demande n'a pas pu être envoyée.");
  revalider();
  return ok({ numero: Number(data.numero) });
}

/** Administrateur : statut, priorité et réponse à l'auteur. */
export async function traiterTicket(input: unknown): Promise<ActionResult> {
  const ctx = await contexteAdmin();
  if (!ctx) return echec("Action réservée à l'administrateur.");
  const p = traitementTicketSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const { id, ...maj } = p.data;
  const { data, error } = await ctx.supabase.from("tickets").update(maj).eq("id", id).select("id");
  if (error) return echec("Le traitement n'a pas pu être enregistré.");
  if (!data?.length) return echec("Ticket introuvable.");
  revalider();
  return ok();
}

export async function supprimerTicket(id: unknown): Promise<ActionResult> {
  const ctx = await contexteApprouve();
  if (!ctx) return echec(ACCES_REFUSE);
  const p = idSchema.safeParse(id);
  if (!p.success) return echec(premiereErreur(p.error));
  const { data, error } = await ctx.supabase.from("tickets").delete().eq("id", p.data).select("id");
  if (error) return echec("La suppression a échoué.");
  if (!data?.length) return echec("Seul un ticket non encore pris en charge peut être supprimé par son auteur.");
  revalider();
  return ok();
}
