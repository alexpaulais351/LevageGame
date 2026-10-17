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
import type { TransportPdfModel } from "@/lib/pdf/transport-model";
import type { RapidePdfModel } from "@/lib/pdf/rapide-model";
import { createClient } from "@/lib/supabase/client";
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

/** Photo de la machine personnelle (bucket privé, session de l'utilisateur) en data-URI ; `null` si absente ou illisible. */
async function photoMachine(chemin: string | null | undefined): Promise<string | null> {
  if (!chemin) return null;
  try {
    const { data, error } = await createClient().storage.from("user-files").download(chemin);
    if (error || !data) return null;
    return await new Promise<string | null>((resolve) => {
      const lecteur = new FileReader();
      lecteur.onload = () => resolve(typeof lecteur.result === "string" ? lecteur.result : null);
      lecteur.onerror = () => resolve(null);
      lecteur.readAsDataURL(data);
    });
  } catch {
    return null;
  }
}

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

export function useExportPDF(options: Partial<Pick<PdfMeta, "reference" | "indice" | "redacteur" | "entreprise" | "logoUrl">> = {}): UseExportPDF {
  const etatEnCours = useSyncExternalStore(abonner, () => enCours, () => false);
  const etatErreur = useSyncExternalStore(abonner, () => erreur, () => null);
  const { reference, indice, redacteur, entreprise, logoUrl } = options;

  const exporter = useCallback(async () => {
    if (enCours) return;
    enCours = true;
    erreur = null;
    notifier();
    try {
      const data: StudyData = useStudy.getState().data;
      const maintenant = new Date();
      const sel = data.machine.selection;
      const machinePhotoUrl = sel?.personnelle ? await photoMachine(sel.photoPath) : null;
      const model = buildPdfModel(data, computeStudy(data), { reference, indice, redacteur, entreprise, logoUrl, machinePhotoUrl, genereLe: maintenant });
      const { genererFichePdf } = await import("@/lib/pdf/generate");
      const blob = await genererFichePdf(model);
      telecharger(blob, nomFichierPdf({ reference, projet: data.operation.projet, date: maintenant }));
    } catch {
      erreur = "L'export PDF a échoué. Réessayez ; si le problème persiste, rechargez la page.";
    } finally {
      enCours = false;
      notifier();
    }
  }, [reference, indice, redacteur, entreprise, logoUrl]);

  return { exporter, enCours: etatEnCours, erreur: etatErreur };
}

/**
 * Export de la synthèse transport (outil /transport) : même garde anti-double export que la fiche.
 * Le modèle est construit par l'appelant (`buildTransportPdfModel`) au moment du clic.
 */
export function useExportSyntheseTransport(): { exporter: (fabriquer: () => Promise<{ model: TransportPdfModel; nom: string }>) => Promise<void>; enCours: boolean; erreur: string | null } {
  const etatEnCours = useSyncExternalStore(abonner, () => enCours, () => false);
  const etatErreur = useSyncExternalStore(abonner, () => erreur, () => null);
  const exporter = useCallback(async (fabriquer: () => Promise<{ model: TransportPdfModel; nom: string }>) => {
    if (enCours) return;
    enCours = true;
    erreur = null;
    notifier();
    try {
      const { model, nom } = await fabriquer();
      const { genererSyntheseTransportPdf } = await import("@/lib/pdf/generate");
      telecharger(await genererSyntheseTransportPdf(model), nom);
    } catch {
      erreur = "L'export PDF a échoué. Réessayez ; si le problème persiste, rechargez la page.";
    } finally {
      enCours = false;
      notifier();
    }
  }, []);
  return { exporter, enCours: etatEnCours, erreur: etatErreur };
}

/** Export de la synthèse d'adéquation rapide (/outil/rapide) : même garde anti-double export. */
export function useExportAdequationRapide(): { exporter: (fabriquer: () => Promise<{ model: RapidePdfModel; nom: string }>) => Promise<void>; enCours: boolean; erreur: string | null } {
  const etatEnCours = useSyncExternalStore(abonner, () => enCours, () => false);
  const etatErreur = useSyncExternalStore(abonner, () => erreur, () => null);
  const exporter = useCallback(async (fabriquer: () => Promise<{ model: RapidePdfModel; nom: string }>) => {
    if (enCours) return;
    enCours = true;
    erreur = null;
    notifier();
    try {
      const { model, nom } = await fabriquer();
      const { genererSyntheseRapidePdf } = await import("@/lib/pdf/generate");
      telecharger(await genererSyntheseRapidePdf(model), nom);
    } catch {
      erreur = "L'export PDF a échoué. Réessayez ; si le problème persiste, rechargez la page.";
    } finally {
      enCours = false;
      notifier();
    }
  }, []);
  return { exporter, enCours: etatEnCours, erreur: etatErreur };
}
