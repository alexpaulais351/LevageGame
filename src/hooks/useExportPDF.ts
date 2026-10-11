"use client";

/**
 * Export PDF de la fiche d'adéquation — seul point d'entrée (CLAUDE.md).
 * - @react-pdf/renderer est chargé par import dynamique au premier export (hors bundle initial) ;
 * - garde anti-double-téléchargement partagée par tous les boutons : un seul export à la fois.
 */
import { useCallback, useSyncExternalStore } from "react";

import { computeStudy } from "@/lib/study/compute";
import type { StudyData } from "@/lib/study/types";
import { buildPdfModel, type PdfMeta } from "@/lib/pdf/model";
import { nomFichierPdf } from "@/lib/pdf/filename";
import { useStudy } from "@/stores/study";

let enCours = false;
let erreur: string | null = null;
const abonnes = new Set<() => void>();
const notifier = () => abonnes.forEach((f) => f());
const abonner = (f: () => void) => {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
};

function telecharger(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export interface UseExportPDF {
  exporter: () => Promise<void>;
  enCours: boolean;
  erreur: string | null;
}

export function useExportPDF(options: Partial<Pick<PdfMeta, "reference" | "indice" | "redacteur" | "entreprise" | "logoUrl" | "invite">> = {}): UseExportPDF {
  const etatEnCours = useSyncExternalStore(abonner, () => enCours, () => false);
  const etatErreur = useSyncExternalStore(abonner, () => erreur, () => null);
  const { reference, indice, redacteur, entreprise, logoUrl, invite = true } = options;

  const exporter = useCallback(async () => {
    if (enCours) return;
    enCours = true;
    erreur = null;
    notifier();
    try {
      const data: StudyData = useStudy.getState().data;
      const maintenant = new Date();
      const model = buildPdfModel(data, computeStudy(data), { reference, indice, redacteur, entreprise, logoUrl, invite, genereLe: maintenant });
      const { genererFichePdf } = await import("@/lib/pdf/generate");
      const blob = await genererFichePdf(model);
      telecharger(blob, nomFichierPdf({ reference, projet: data.operation.projet, date: maintenant }));
    } catch {
      erreur = "L'export PDF a échoué. Réessayez ; si le problème persiste, rechargez la page.";
    } finally {
      enCours = false;
      notifier();
    }
  }, [reference, indice, redacteur, entreprise, logoUrl, invite]);

  return { exporter, enCours: etatEnCours, erreur: etatErreur };
}
