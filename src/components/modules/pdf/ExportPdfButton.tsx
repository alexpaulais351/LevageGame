"use client";

import { FileDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useExportPDF } from "@/hooks/useExportPDF";

/** Bouton « Exporter en PDF » : désactivé pendant la génération (un seul export à la fois). */
export function ExportPdfButton({ variant = "default" }: { variant?: "default" | "outline" }) {
  const { exporter, enCours, erreur } = useExportPDF();
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
