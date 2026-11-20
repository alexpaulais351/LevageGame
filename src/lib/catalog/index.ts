import { createSupabaseProvider } from "./supabase-provider";
import type { CatalogProvider } from "./types";

export * from "./types";
export { calageDepuisSpecs, createSupabaseProvider, mapChartRow, type PorteeCatalogue } from "./supabase-provider";

let instance: CatalogProvider | null = null;

/** Catalogue public (RLS : compte approuvé exigé). */
export function getCatalogProvider(): CatalogProvider {
  return (instance ??= createSupabaseProvider());
}
