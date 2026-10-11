"use client";

/**
 * Store Zustand de l'étude en cours (mode invité).
 * Persistance : IndexedDB via idb-keyval (jamais localStorage / sessionStorage).
 * Hydratation côté client uniquement (`skipHydration` + `persist.rehydrate()` dans un effet).
 */
import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { accessoireVide, createInitialData, fusionnerAvecDefauts, nouvelId, obstacleVide, positionVide } from "@/lib/study/defaults";
import type { AccessoireSaisie, ObstacleSaisie, PositionSaisie, SectionKey, StudyData } from "@/lib/study/types";

const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

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
  /** Nouvelle adéquation : repart d'une étude vierge (la confirmation est demandée par l'UI). */
  reinitialiser: () => void;
}

export const useStudy = create<StudyState>()(
  persist(
    (setState) => {
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
        reinitialiser: () => setState({ data: createInitialData(), etape: 0, majLe: null }),
      };
    },
    {
      name: "levage-etude-invite",
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      skipHydration: true,
      partialize: (s) => ({ data: s.data, etape: s.etape, majLe: s.majLe }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Pick<StudyState, "data" | "etape" | "majLe">>;
        return {
          ...current,
          data: fusionnerAvecDefauts(p.data),
          etape: typeof p.etape === "number" ? Math.min(8, Math.max(0, p.etape)) : 0,
          majLe: p.majLe ?? null,
        };
      },
    },
  ),
);
