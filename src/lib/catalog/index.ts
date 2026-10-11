import { createStaticProvider } from "./static-provider";
import { createSupabaseProvider } from "./supabase-provider";
import type { CatalogProvider } from "./types";

export * from "./types";
export { createStaticProvider } from "./static-provider";
export { calageDepuisSpecs, createSupabaseProvider, mapChartRow, type PorteeCatalogue } from "./supabase-provider";

/** Supabase est-il configuré (URL + clé anon publiques) ? */
export function supabaseConfigure(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

let instance: CatalogProvider | null = null;
let instancePerso: CatalogProvider | null = null;

/** Fournisseur par défaut : Supabase si configuré, sinon le JSON statique de repli. */
export function getCatalogProvider(): CatalogProvider {
  return (instance ??= supabaseConfigure() ? createSupabaseProvider() : createStaticProvider());
}

/** Machines personnelles de l'utilisateur connecté (vide pour un invité ; absent sans Supabase). */
export function getMesMachinesProvider(): CatalogProvider | null {
  return supabaseConfigure() ? (instancePerso ??= createSupabaseProvider("mine")) : null;
}
