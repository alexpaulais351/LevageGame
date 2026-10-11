/**
 * Catalogue machines côté invité : types → constructeurs → modèles → configurations → abaque.
 * Deux implémentations : Supabase (lecture anon) et repli sur un JSON statique.
 */
import type { LoadChart } from "@/engine";

export interface CatalogType {
  id: string;
  code: string;
  label: string;
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
  readonly kind: "supabase" | "statique";
  listTypes(): Promise<CatalogType[]>;
  listManufacturers(typeId: string): Promise<CatalogManufacturer[]>;
  listModels(typeId: string, manufacturerId: string): Promise<CatalogModel[]>;
  listConfigurations(machineId: string): Promise<CatalogConfiguration[]>;
  /** Abaque de la configuration, ou `null` s'il n'y en a pas. */
  getChart(configurationId: string): Promise<LoadChart | null>;
}

/** Forme du JSON statique de repli. */
export interface StaticCatalogData {
  types: CatalogType[];
  manufacturers: CatalogManufacturer[];
  machines: CatalogModel[];
  configurations: CatalogConfiguration[];
  charts: (LoadChart & { configurationId: string })[];
}

export const MESSAGE_CATALOGUE_VIDE =
  "Catalogue vide — aucun abaque vérifié n'est encore chargé";
