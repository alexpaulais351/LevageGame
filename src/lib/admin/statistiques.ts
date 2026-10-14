/** Indicateurs de fréquentation vus par l'administrateur (RPC admin_statistiques, D41). */
import type { StatutCompte } from "@/lib/supabase/session";

export const PERIODES = [7, 30, 90] as const;
export type Periode = (typeof PERIODES)[number];

export interface PointJour {
  jour: string;
  visiteurs: number;
  vues: number;
  connexions: number;
}

export interface PageVue {
  chemin: string;
  vues: number;
  visiteurs: number;
}

export interface ActiviteCompte {
  id: string;
  email: string;
  nom: string | null;
  entreprise: string | null;
  statut: StatutCompte;
  estAdmin: boolean;
  creeLe: string;
  derniereConnexion: string | null;
  derniereActivite: string | null;
  connexions: number;
  vues: number;
  joursActifs: number;
  projets: number;
  etudes: number;
}

export interface Statistiques {
  jours: number;
  debut: string;
  fin: string;
  comptesParStatut: Record<StatutCompte, number>;
  inscriptions: number;
  actifsJour: number;
  actifs7j: number;
  actifsPeriode: number;
  connexions: number;
  vues: number;
  projets: number;
  etudes: number;
  serie: PointJour[];
  pages: PageVue[];
  comptes: ActiviteCompte[];
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0) || 0);
const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
const liste = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

export function periode(brut: string | undefined): Periode {
  const n = Number(brut);
  return (PERIODES as readonly number[]).includes(n) ? (n as Periode) : 30;
}

export function mapStatistiques(r: Record<string, unknown>): Statistiques {
  const s = (r.comptes_par_statut ?? {}) as Record<string, unknown>;
  return {
    jours: num(r.jours),
    debut: String(r.debut ?? ""),
    fin: String(r.fin ?? ""),
    comptesParStatut: { en_attente: num(s.en_attente), approuve: num(s.approuve), refuse: num(s.refuse), suspendu: num(s.suspendu) },
    inscriptions: num(r.inscriptions),
    actifsJour: num(r.actifs_jour),
    actifs7j: num(r.actifs_7j),
    actifsPeriode: num(r.actifs_periode),
    connexions: num(r.connexions),
    vues: num(r.vues),
    projets: num(r.projets),
    etudes: num(r.etudes),
    serie: liste(r.serie).map((p) => ({ jour: String(p.jour), visiteurs: num(p.visiteurs), vues: num(p.vues), connexions: num(p.connexions) })),
    pages: liste(r.pages).map((p) => ({ chemin: String(p.chemin), vues: num(p.vues), visiteurs: num(p.visiteurs) })),
    comptes: liste(r.comptes).map((c) => ({
      id: String(c.id),
      email: String(c.email ?? ""),
      nom: str(c.nom),
      entreprise: str(c.entreprise),
      statut: c.statut as StatutCompte,
      estAdmin: c.est_admin === true,
      creeLe: String(c.cree_le ?? ""),
      derniereConnexion: str(c.derniere_connexion),
      derniereActivite: str(c.derniere_activite),
      connexions: num(c.connexions),
      vues: num(c.vues),
      joursActifs: num(c.jours_actifs),
      projets: num(c.projets),
      etudes: num(c.etudes),
    })),
  };
}

/** Libellé lisible d'un chemin normalisé (« /projets/:id » → « Projet (fiche) »). */
const LIBELLES: Record<string, string> = {
  "/": "Accueil",
  "/outil": "Nouvelle adéquation",
  "/projets": "Projets (liste)",
  "/projets/:id": "Projet (fiche)",
  "/projets/:id/etudes/:id": "Étude de levage",
  "/machines": "Machines (catalogue)",
  "/machines/:id": "Machine (fiche)",
  "/machines/nouvelle": "Machine personnelle (création)",
  "/transport": "Transport des pièces",
  "/profil": "Profil",
  "/admin/comptes": "Admin : comptes",
  "/admin/comptes/:id": "Admin : fiche compte",
  "/admin/statistiques": "Admin : statistiques",
};

export function libellePage(chemin: string): string {
  return LIBELLES[chemin] ?? chemin;
}

/** « aujourd'hui », « hier », « il y a 5 j », sinon la date (fuseau Europe/Paris). */
export function ilYA(iso: string | null, maintenant: Date = new Date()): string {
  if (!iso) return "jamais";
  const jourParis = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  const ecart = Math.round((Date.parse(jourParis(maintenant)) - Date.parse(jourParis(new Date(iso)))) / 86_400_000);
  if (ecart <= 0) return "aujourd'hui";
  if (ecart === 1) return "hier";
  if (ecart < 30) return `il y a ${ecart} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
}
