/**
 * Génération du PDF côté client. Ce module (et donc @react-pdf/renderer) n'est chargé que par import
 * dynamique depuis `useExportPDF` : il ne fait pas partie du bundle initial.
 */
import { pdf } from "@react-pdf/renderer";

import { FicheDocument } from "./document";
import { enregistrerPolices } from "./fonts";
import type { PdfModel } from "./model";
import { SyntheseTransportDocument } from "./transport-document";
import type { TransportPdfModel } from "./transport-model";

export interface OptionsGeneration {
  /** Dossier des polices dans le navigateur (défaut "/fonts"). */
  fontBase?: string;
}

/** Rend le modèle en Blob PDF. */
export async function genererFichePdf(model: PdfModel, opts: OptionsGeneration = {}): Promise<Blob> {
  const famille = enregistrerPolices(opts.fontBase ?? "/fonts");
  return pdf(<FicheDocument model={model} fontFamily={famille} />).toBlob();
}

/** Rend la synthèse transport en Blob PDF. */
export async function genererSyntheseTransportPdf(model: TransportPdfModel, opts: OptionsGeneration = {}): Promise<Blob> {
  const famille = enregistrerPolices(opts.fontBase ?? "/fonts");
  return pdf(<SyntheseTransportDocument model={model} fontFamily={famille} />).toBlob();
}
