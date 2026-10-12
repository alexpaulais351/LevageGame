import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { bucketPdf, liensPdf, nomFichierPdf } from "./pdf";

describe("PDF des abaques", () => {
  it("bucket selon l'origine de la machine", () => {
    expect(bucketPdf(false)).toBe("chart-sources");
    expect(bucketPdf(true)).toBe("user-files");
  });
  it("nom de fichier de téléchargement nettoyé", () => {
    expect(nomFichierPdf("Liebherr", "LTM 1070-4.1")).toBe("Abaque Liebherr LTM 1070-4.1.pdf");
    expect(nomFichierPdf("A/B", 'x:"y"')).toBe("Abaque A B x y.pdf");
  });
  it("liens voir + télécharger ; fichier absent ⇒ aucun lien", async () => {
    const from = vi.fn(() => ({
      createSignedUrls: async (chemins: string[]) => ({
        data: chemins.map((p) => (p === "absent.pdf" ? { path: p, signedUrl: "", error: "Object not found" } : { path: p, signedUrl: `https://s/${p}`, error: null })),
      }),
      createSignedUrl: async (p: string, _d: number, o: { download: string }) => ({ data: { signedUrl: `https://s/${p}?download=${o.download}` } }),
    }));
    const supabase = { storage: { from } } as unknown as SupabaseClient;
    const r = await liensPdf(supabase, false, [
      { chemin: "catalogue/a.pdf", nom: "A.pdf" },
      { chemin: "catalogue/a.pdf", nom: "A.pdf" },
      { chemin: "absent.pdf", nom: "B.pdf" },
    ]);
    expect(from).toHaveBeenCalledWith("chart-sources");
    expect([...r.keys()]).toEqual(["catalogue/a.pdf"]);
    expect(r.get("catalogue/a.pdf")).toEqual({ voir: "https://s/catalogue/a.pdf", telecharger: "https://s/catalogue/a.pdf?download=A.pdf" });
    expect((await liensPdf(supabase, true, [])).size).toBe(0);
  });
});
