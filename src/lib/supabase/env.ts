/** Supabase est-il configuré ? (CI / démo sans variables : l'app reste utilisable en mode invité.) */
export function supabaseConfigure(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
