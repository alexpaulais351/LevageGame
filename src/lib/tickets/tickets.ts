/**
 * Tickets : demandes des utilisateurs à l'administrateur (D54). Libellés, couleurs (palette VINCI / verdict),
 * schémas Zod et conversion des lignes de la RPC `lister_tickets`.
 */
import { z } from "zod";

/** Ton de la pastille : classes Tailwind de la palette du projet uniquement. */
export type Ton = "bleu" | "jaune" | "vert" | "rouge" | "gris";

interface Option<V extends string> {
  value: V;
  label: string;
  ton: Ton;
}

export const CATEGORIES_TICKET = [
  { value: "amelioration", label: "Amélioration", ton: "bleu" },
  { value: "anomalie", label: "Anomalie / bug", ton: "rouge" },
  { value: "export", label: "Export (PDF, Word)", ton: "bleu" },
  { value: "affichage", label: "Affichage / ergonomie", ton: "bleu" },
  { value: "donnees", label: "Données / projet", ton: "gris" },
  { value: "abaque", label: "Intégration d'abaque", ton: "jaune" },
  { value: "autre", label: "Autre", ton: "gris" },
] as const satisfies readonly Option<string>[];

export const PRIORITES_TICKET = [
  { value: "basse", label: "Basse", ton: "gris" },
  { value: "normale", label: "Normale", ton: "bleu" },
  { value: "haute", label: "Haute", ton: "rouge" },
] as const satisfies readonly Option<string>[];

export const STATUTS_TICKET = [
  { value: "nouveau", label: "Nouveau", ton: "jaune" },
  { value: "en_cours", label: "En cours", ton: "bleu" },
  { value: "resolu", label: "Résolu", ton: "vert" },
  { value: "refuse", label: "Refusé", ton: "gris" },
] as const satisfies readonly Option<string>[];

export type CategorieTicket = (typeof CATEGORIES_TICKET)[number]["value"];
export type PrioriteTicket = (typeof PRIORITES_TICKET)[number]["value"];
export type StatutTicket = (typeof STATUTS_TICKET)[number]["value"];

/** Adresse de réception des fichiers d'abaques (le ticket reste à ouvrir pour le suivi). */
export const EMAIL_ABAQUES = "alexandre.paulais@vinci-construction.com";
export const SUJET_ABAQUE = "Adéquation de levage – intégration d'abaque";
export const MAILTO_ABAQUE = `mailto:${EMAIL_ABAQUES}?subject=${encodeURIComponent(SUJET_ABAQUE)}`;

export function optionDe<O extends { value: string }>(liste: readonly O[], v: string): O {
  return liste.find((o) => o.value === v) ?? liste[liste.length - 1];
}

const valeurs = <O extends { value: string }>(l: readonly O[]) => l.map((o) => o.value) as [O["value"], ...O["value"][]];

export const creationTicketSchema = z.object({
  titre: z.string().trim().min(3, "Titre trop court (3 caractères minimum)").max(160, "160 caractères maximum"),
  description: z.string().trim().min(5, "Décrivez votre demande").max(10000, "10 000 caractères maximum"),
  categorie: z.enum(valeurs(CATEGORIES_TICKET), "Type de demande invalide"),
  priorite: z.enum(valeurs(PRIORITES_TICKET), "Priorité invalide"),
  page: z
    .string()
    .trim()
    .max(300, "300 caractères maximum")
    .optional()
    .transform((v) => v || null),
});

export const traitementTicketSchema = z.object({
  id: z.uuid("Identifiant invalide"),
  statut: z.enum(valeurs(STATUTS_TICKET), "Statut invalide"),
  priorite: z.enum(valeurs(PRIORITES_TICKET), "Priorité invalide"),
  reponse: z
    .string()
    .trim()
    .max(10000, "10 000 caractères maximum")
    .optional()
    .transform((v) => v || null),
});

export interface Ticket {
  id: string;
  numero: number;
  titre: string;
  description: string;
  categorie: string;
  priorite: string;
  statut: string;
  page: string | null;
  reponse: string | null;
  creeLe: string;
  majLe: string;
  auteurId: string;
  auteurNom: string;
  auteurEmail: string;
}

export function mapTicket(r: Record<string, unknown>): Ticket {
  const email = (r.auteur_email as string | null) ?? "";
  return {
    id: r.id as string,
    numero: Number(r.numero),
    titre: r.titre as string,
    description: r.description as string,
    categorie: r.categorie as string,
    priorite: r.priorite as string,
    statut: r.statut as string,
    page: (r.page as string | null) ?? null,
    reponse: (r.reponse as string | null) ?? null,
    creeLe: r.created_at as string,
    majLe: r.updated_at as string,
    auteurId: r.auteur_id as string,
    auteurNom: ((r.auteur_nom as string | null) ?? "").trim() || email.split("@")[0] || "Utilisateur",
    auteurEmail: email,
  };
}

const ORDRE_PRIORITE: Record<string, number> = { haute: 0, normale: 1, basse: 2 };

/** Administrateur : priorité haute d'abord, puis du plus récent au plus ancien. */
export function trierPourAdmin(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => (ORDRE_PRIORITE[a.priorite] ?? 1) - (ORDRE_PRIORITE[b.priorite] ?? 1) || b.creeLe.localeCompare(a.creeLe));
}

export type FiltreTicket = "a_traiter" | StatutTicket | "tous";

export const aTraiter = (t: Pick<Ticket, "statut">) => t.statut === "nouveau" || t.statut === "en_cours";

export function filtrerTickets(tickets: Ticket[], filtre: FiltreTicket): Ticket[] {
  if (filtre === "tous") return tickets;
  if (filtre === "a_traiter") return tickets.filter(aTraiter);
  return tickets.filter((t) => t.statut === filtre);
}

/** L'auteur peut supprimer son ticket tant qu'il n'est pas pris en charge ; l'administrateur, toujours. */
export const peutSupprimer = (t: Pick<Ticket, "statut" | "auteurId">, moiId: string, estAdmin: boolean) =>
  estAdmin || (t.auteurId === moiId && t.statut === "nouveau");
