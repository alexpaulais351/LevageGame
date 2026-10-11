/** Supabase est-il configuré ? (CI sans variables : build possible, mais aucune page accessible hors /login.) */
export function supabaseConfigure(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
