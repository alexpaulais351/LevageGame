import { createStaticProvider } from "./static-provider";
import { createSupabaseProvider } from "./supabase-provider";
import type { CatalogProvider } from "./types";

export * from "./types";
export { createStaticProvider } from "./static-provider";
export { createSupabaseProvider, mapChartRow } from "./supabase-provider";

/** Supabase est-il configuré (URL + clé anon publiques) ? */
export function supabaseConfigure(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

let instance: CatalogProvider | null = null;

/** Fournisseur par défaut : Supabase si configuré, sinon le JSON statique de repli. */
export function getCatalogProvider(): CatalogProvider {
  return (instance ??= supabaseConfigure() ? createSupabaseProvider() : createStaticProvider());
}
