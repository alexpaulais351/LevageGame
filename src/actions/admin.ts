"use server";

/**
 * Administration des comptes : uniquement via les RPC SECURITY DEFINER qui revérifient est_admin
 * en base. Le contrôle applicatif (contexteAdmin) s'ajoute en défense en profondeur.
 */
import { revalidatePath } from "next/cache";

import { mapStatistiques, periode, type Statistiques } from "@/lib/admin/statistiques";
import { decisionSchema, DECISION_STATUT, mapCompte, type CompteAdmin } from "@/lib/admin/comptes";
import { echec, ok, type ActionResult } from "@/lib/account/result";
import { premiereErreur } from "@/lib/account/schemas";
import { contexteAdmin } from "@/lib/supabase/session";

const REFUS = "Action réservée à l'administrateur.";

export async function listerComptes(): Promise<ActionResult<CompteAdmin[]>> {
  const ctx = await contexteAdmin();
  if (!ctx) return echec(REFUS);
  const { data, error } = await ctx.supabase.rpc("admin_lister_comptes");
  if (error) return echec("Impossible de charger les comptes.");
  return ok(((data ?? []) as Record<string, unknown>[]).map(mapCompte));
}

/** Indicateurs de fréquentation (connexions, pages vues, activité par compte) sur 7, 30 ou 90 jours. */
export async function lireStatistiques(jours: unknown): Promise<ActionResult<Statistiques>> {
  const ctx = await contexteAdmin();
  if (!ctx) return echec(REFUS);
  const { data, error } = await ctx.supabase.rpc("admin_statistiques", { jours: periode(String(jours)) });
  if (error || !data) return echec("Impossible de charger les statistiques.");
  return ok(mapStatistiques(data as Record<string, unknown>));
}

/** Accepter / refuser / suspendre / réactiver un compte (jamais le sien : refusé en base). */
export async function deciderCompte(input: unknown): Promise<ActionResult> {
  const ctx = await contexteAdmin();
  if (!ctx) return echec(REFUS);
  const p = decisionSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  if (p.data.userId === ctx.user.id) return echec("Vous ne pouvez pas modifier votre propre compte.");
  const { error } = await ctx.supabase.rpc("admin_definir_statut", { user_id: p.data.userId, statut: DECISION_STATUT[p.data.decision] });
  if (error) {
    if (error.code === "P0002") return echec("Compte introuvable.");
    if (error.code === "42501") return echec("Ce compte ne peut pas être modifié depuis l'application.");
    return echec("La décision n'a pas pu être enregistrée.");
  }
  revalidatePath("/admin/comptes");
  revalidatePath(`/admin/comptes/${p.data.userId}`);
  revalidatePath("/", "layout");
  return ok();
}
