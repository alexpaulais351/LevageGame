import type { SupabaseClient } from "@supabase/supabase-js";

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

/** Logo du bucket privé user-files sous forme de data-URI (utilisable par le PDF sans CORS). */
export async function logoEnDataUri(supabase: SupabaseClient, chemin: string | null | undefined): Promise<string | null> {
  if (!chemin) return null;
  const { data, error } = await supabase.storage.from("user-files").download(chemin);
  if (error || !data) return null;
  const ext = chemin.split(".").pop()?.toLowerCase() ?? "";
  const buf = Buffer.from(await data.arrayBuffer());
  return `data:${MIME[ext] ?? data.type ?? "image/png"};base64,${buf.toString("base64")}`;
}
