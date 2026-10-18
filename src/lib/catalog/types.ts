/**
 * Catalogue machines (comptes approuvés) : types → constructeurs → modèles → configurations → abaque.
 * Implémentation unique : Supabase, sous RLS.
 */
import type { LoadChart } from "@/engine";

export interface CatalogType {
  id: string;
  code: string;
  label: string;
  /** Nombre de modèles du type dans la portée listée. */
  nbModeles?: number;
}

export interface CatalogManufacturer {
  id: string;
  name: string;
}

export interface CatalogModel {
  id: string;
  typeId: string;
  manufacturerId: string;
  model: string;
  /** Emprise des stabilisateurs (machines personnelles : saisie par l'utilisateur), si connue. */
  calage?: { longueurM: number; largeurM: number } | null;
  /** Photo de la machine réelle (bucket privé user-files), machines personnelles uniquement. */
  photoPath?: string | null;
}

export interface CatalogConfiguration {
  id: string;
  machineId: string;
  label: string;
  /** Masse de la moufle / du crochet associés à cette configuration (kg), si connue. */
  hookBlockMassKg: number | null;
  notes: string | null;
}

export interface CatalogProvider {
  readonly kind: "supabase";
  listTypes(): Promise<CatalogType[]>;
  listManufacturers(typeId: string): Promise<CatalogManufacturer[]>;
  listModels(typeId: string, manufacturerId: string): Promise<CatalogModel[]>;
  listConfigurations(machineId: string): Promise<CatalogConfiguration[]>;
  /** Abaque de la configuration, ou `null` s'il n'y en a pas. */
  getChart(configurationId: string): Promise<LoadChart | null>;
}

export const MESSAGE_CATALOGUE_VIDE =
  "Catalogue vide — aucun abaque vérifié n'est encore chargé";
