"use client";

import { createContext, useContext } from "react";
import { FileDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useExportPDF } from "@/hooks/useExportPDF";
import type { PdfMeta } from "@/lib/pdf/model";

type MetaCompte = Partial<Pick<PdfMeta, "reference" | "indice" | "redacteur" | "entreprise" | "logoUrl">>;

/** Métadonnées PDF du compte (étude de projet) fournies par l'assistant à tous les boutons d'export. */
export const PdfMetaContext = createContext<MetaCompte | undefined>(undefined);

/** Bouton « Exporter en PDF » : désactivé pendant la génération (un seul export à la fois). */
export function ExportPdfButton({
  variant = "default",
  meta,
}: {
  variant?: "default" | "outline";
  /** Référence, indice, rédacteur, entreprise, logo (sinon : contexte de l'assistant). */
  meta?: MetaCompte;
}) {
  const contexte = useContext(PdfMetaContext);
  const m = meta ?? contexte;
  const { exporter, enCours, erreur } = useExportPDF(m ?? {});
  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant={variant} size="lg" onClick={() => void exporter()} disabled={enCours} aria-busy={enCours}>
        {enCours ? <Loader2 className="animate-spin" /> : <FileDown />}
        {enCours ? "Génération du PDF…" : "Exporter en PDF"}
      </Button>
      {erreur && (
        <p role="alert" className="text-sm text-vinci-rouge-dark">
          {erreur}
        </p>
      )}
    </div>
  );
}
