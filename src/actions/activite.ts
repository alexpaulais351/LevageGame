"use server";

/** Journal de fréquentation (D41) : une page vue par le compte courant. Jamais bloquant. */
import { contexteApprouve } from "@/lib/supabase/session";

export async function noterVisite(chemin: unknown): Promise<void> {
  if (typeof chemin !== "string" || !chemin.startsWith("/") || chemin.length > 200) return;
  const ctx = await contexteApprouve();
  if (!ctx) return;
  await ctx.supabase.rpc("noter_visite", { chemin }).then(
    () => undefined,
    () => undefined,
  );
}
