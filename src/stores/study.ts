"use client";

/**
 * Store Zustand de l'étude en cours d'édition (en mémoire uniquement).
 * La persistance passe exclusivement par les versions enregistrées en base (projets) :
 * aucun brouillon local (IndexedDB, localStorage…).
 */
import { create } from "zustand";

import { accessoireVide, fusionnerAvecDefauts, createInitialData, nouvelId, obstacleVide, positionVide } from "@/lib/study/defaults";
import type { AccessoireSaisie, ObstacleSaisie, PositionSaisie, SectionKey, StudyData } from "@/lib/study/types";

export interface StudyState {
  data: StudyData;
  etape: number;
  majLe: string | null;
  patch: <K extends SectionKey>(section: K, patch: Partial<StudyData[K]>) => void;
  setEtape: (n: number) => void;
  ajouterAccessoire: () => void;
  majAccessoire: (id: string, patch: Partial<AccessoireSaisie>) => void;
  supprimerAccessoire: (id: string) => void;
  ajouterPosition: () => void;
  majPosition: (id: string, patch: Partial<PositionSaisie>) => void;
  supprimerPosition: (id: string) => void;
  ajouterObstacle: () => void;
  majObstacle: (id: string, patch: Partial<ObstacleSaisie>) => void;
  supprimerObstacle: (id: string) => void;
  ajouterReserve: () => void;
  majReserve: (id: string, texte: string) => void;
  supprimerReserve: (id: string) => void;
  /** Charge une étude existante (version d'un projet) ; `etape` conservée si fournie. */
  charger: (data: StudyData, etape?: number) => void;
}

export const useStudy = create<StudyState>()((setState) => {
    const touch = (data: StudyData) => ({ data, majLe: new Date().toISOString() });
    return {
      data: createInitialData(),
      etape: 0,
      majLe: null,
      patch: (section, p) =>
        setState((s) => touch({ ...s.data, [section]: { ...s.data[section], ...p } })),
      setEtape: (n) => setState({ etape: Math.min(8, Math.max(0, n)) }),
      ajouterAccessoire: () =>
        setState((s) =>
          touch({
            ...s.data,
            accessoires: { ...s.data.accessoires, liste: [...s.data.accessoires.liste, accessoireVide()] },
          }),
        ),
      majAccessoire: (id, p) =>
        setState((s) =>
          touch({
            ...s.data,
            accessoires: {
              ...s.data.accessoires,
              liste: s.data.accessoires.liste.map((a) => (a.id === id ? { ...a, ...p } : a)),
            },
          }),
        ),
      supprimerAccessoire: (id) =>
        setState((s) =>
          touch({
            ...s.data,
            accessoires: { ...s.data.accessoires, liste: s.data.accessoires.liste.filter((a) => a.id !== id) },
          }),
        ),
      ajouterPosition: () =>
        setState((s) =>
          touch({
            ...s.data,
            geometrie: { ...s.data.geometrie, positions: [...s.data.geometrie.positions, positionVide()] },
          }),
        ),
      majPosition: (id, p) =>
        setState((s) =>
          touch({
            ...s.data,
            geometrie: {
              ...s.data.geometrie,
              positions: s.data.geometrie.positions.map((x) => (x.id === id ? { ...x, ...p } : x)),
            },
          }),
        ),
      supprimerPosition: (id) =>
        setState((s) =>
          touch({
            ...s.data,
            geometrie: { ...s.data.geometrie, positions: s.data.geometrie.positions.filter((x) => x.id !== id) },
          }),
        ),
      ajouterObstacle: () =>
        setState((s) =>
          touch({
            ...s.data,
            geometrie: {
              ...s.data.geometrie,
              obstaclesSaisis: [...(s.data.geometrie.obstaclesSaisis ?? []), obstacleVide()],
            },
          }),
        ),
      majObstacle: (id, p) =>
        setState((s) =>
          touch({
            ...s.data,
            geometrie: {
              ...s.data.geometrie,
              obstaclesSaisis: (s.data.geometrie.obstaclesSaisis ?? []).map((o) => (o.id === id ? { ...o, ...p } : o)),
            },
          }),
        ),
      supprimerObstacle: (id) =>
        setState((s) =>
          touch({
            ...s.data,
            geometrie: {
              ...s.data.geometrie,
              obstaclesSaisis: (s.data.geometrie.obstaclesSaisis ?? []).filter((o) => o.id !== id),
            },
          }),
        ),
      ajouterReserve: () =>
        setState((s) =>
          touch({
            ...s.data,
            reserves: { liste: [...s.data.reserves.liste, { id: nouvelId(), texte: "" }] },
          }),
        ),
      majReserve: (id, texte) =>
        setState((s) =>
          touch({
            ...s.data,
            reserves: { liste: s.data.reserves.liste.map((r) => (r.id === id ? { ...r, texte } : r)) },
          }),
        ),
      supprimerReserve: (id) =>
        setState((s) =>
          touch({ ...s.data, reserves: { liste: s.data.reserves.liste.filter((r) => r.id !== id) } }),
        ),
      charger: (data, etape = 0) => setState({ data: fusionnerAvecDefauts(data), etape: Math.min(8, Math.max(0, etape)), majLe: null }),
    };
});
