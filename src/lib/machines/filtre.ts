/** Aides pures pour la liste compacte des machines : résumé, filtrage, regroupement, machines sans abaque. */
import sansAbaqueJson from "../../../data/machines-sans-abaque.json";

import type { MachineResume } from "./queries";

export type StatutListe = "a_verifier" | "verifie" | null;

export interface ItemListe {
  id: string;
  typeCode: string;
  typeLabel: string;
  manufacturerName: string;
  model: string;
  nbConfigs: number;
  /** null = aucune configuration n'a d'abaque ; « vérifié » seulement si toutes les configurations le sont. */
  statut: StatutListe;
  perso: boolean;
  /** Chemin du PDF source du premier abaque qui en a un (bucket selon `perso`). */
  pdfPath: string | null;
  /** URL signée d'ouverture du PDF (ajoutée côté serveur), sinon null. */
  pdfUrl: string | null;
}

export interface Filtres {
  recherche: string;
  type: string | null;
  constructeur: string | null;
}

export interface Groupe {
  typeLabel: string;
  items: ItemListe[];
}

export const TYPES_LABELS: Record<string, string> = {
  grue_mobile: "Grue mobile sur pneus",
  grue_mobile_chenilles: "Grue mobile sur chenilles",
  grue_tour: "Grue à tour",
  telescopique_fixe: "Chariot télescopique fixe",
  telescopique_rotatif: "Chariot télescopique rotatif",
  pelle_pneus: "Pelle sur pneus",
  pelle_chenilles: "Pelle sur chenilles",
  pelle_rail_route: "Pelle rail-route",
};

export function versItem(m: MachineResume): ItemListe {
  const statuts = m.configurations.map((c) => c.abaque?.status ?? null);
  const avec = statuts.filter((s) => s !== null);
  const statut: StatutListe = avec.length === 0 ? null : avec.length === statuts.length && avec.every((s) => s === "verifie") ? "verifie" : "a_verifier";
  return {
    id: m.id,
    typeCode: m.typeCode,
    typeLabel: m.typeLabel,
    manufacturerName: m.manufacturerName,
    model: m.model,
    nbConfigs: m.configurations.length,
    statut,
    perso: m.perso,
    pdfPath: m.configurations.find((c) => c.abaque?.source?.pdfPath)?.abaque?.source?.pdfPath ?? null,
    pdfUrl: null,
  };
}

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

export function filtrer(items: ItemListe[], f: Filtres): ItemListe[] {
  const mots = norm(f.recherche).split(/\s+/).filter(Boolean);
  return items.filter((i) => {
    if (f.type && i.typeLabel !== f.type) return false;
    if (f.constructeur && i.manufacturerName !== f.constructeur) return false;
    const texte = norm(`${i.manufacturerName} ${i.model}`);
    return mots.every((m) => texte.includes(m));
  });
}

export function grouperParType(items: ItemListe[]): Groupe[] {
  const m = new Map<string, ItemListe[]>();
  for (const i of items) m.set(i.typeLabel, [...(m.get(i.typeLabel) ?? []), i]);
  return [...m.entries()].map(([typeLabel, liste]) => ({ typeLabel, items: liste }));
}

export function valeursDistinctes(items: ItemListe[], cle: "typeLabel" | "manufacturerName"): string[] {
  return [...new Set(items.map((i) => i[cle]))].sort((a, b) => a.localeCompare(b, "fr"));
}

export interface MachineSansAbaque {
  manufacturer: string;
  model: string;
  typeLabel: string;
  motif: string;
  besoin: string;
}

interface LigneSansAbaque {
  manufacturer: string;
  model: string;
  type_code: string;
  motif: string;
  besoin: string;
}

export function machinesSansAbaque(lignes: LigneSansAbaque[] = sansAbaqueJson.machines as LigneSansAbaque[]): MachineSansAbaque[] {
  return lignes
    .map((l) => ({ manufacturer: l.manufacturer, model: l.model, typeLabel: TYPES_LABELS[l.type_code] ?? l.type_code, motif: l.motif, besoin: l.besoin }))
    .sort((a, b) => a.typeLabel.localeCompare(b.typeLabel, "fr") || a.manufacturer.localeCompare(b.manufacturer, "fr") || a.model.localeCompare(b.model, "fr"));
}
