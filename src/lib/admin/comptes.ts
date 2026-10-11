/** Comptes utilisateurs vus par l'administrateur (RPC admin_lister_comptes). */
import { z } from "zod";

import type { StatutCompte } from "@/lib/supabase/session";

export interface CompteAdmin {
  id: string;
  email: string;
  nom: string | null;
  entreprise: string | null;
  statut: StatutCompte;
  estAdmin: boolean;
  creeLe: string;
  statutModifieLe: string | null;
}

export const STATUTS: StatutCompte[] = ["en_attente", "approuve", "refuse", "suspendu"];

export const LIBELLE_STATUT: Record<StatutCompte, string> = {
  en_attente: "En attente",
  approuve: "Approuvé",
  refuse: "Refusé",
  suspendu: "Suspendu",
};

/** Décisions possibles de l'administrateur (jamais de retour à « en attente »). */
export type Decision = "accepter" | "refuser" | "suspendre" | "reactiver";

export const DECISION_STATUT: Record<Decision, Exclude<StatutCompte, "en_attente">> = {
  accepter: "approuve",
  refuser: "refuse",
  suspendre: "suspendu",
  reactiver: "approuve",
};

export const LIBELLE_DECISION: Record<Decision, string> = {
  accepter: "Accepter",
  refuser: "Refuser",
  suspendre: "Suspendre",
  reactiver: "Réactiver",
};

/** Actions proposées selon le statut courant. */
export function decisionsPossibles(statut: StatutCompte): Decision[] {
  switch (statut) {
    case "en_attente":
      return ["accepter", "refuser"];
    case "approuve":
      return ["suspendre"];
    case "refuse":
      return ["accepter"];
    case "suspendu":
      return ["reactiver"];
  }
}

export const decisionSchema = z.object({
  userId: z.uuid("Identifiant invalide"),
  decision: z.enum(["accepter", "refuser", "suspendre", "reactiver"]),
});

export function mapCompte(r: Record<string, unknown>): CompteAdmin {
  return {
    id: r.id as string,
    email: (r.email as string | null) ?? "",
    nom: (r.nom as string | null) ?? null,
    entreprise: (r.entreprise as string | null) ?? null,
    statut: r.statut as StatutCompte,
    estAdmin: Boolean(r.est_admin),
    creeLe: r.created_at as string,
    statutModifieLe: (r.statut_modifie_le as string | null) ?? null,
  };
}
