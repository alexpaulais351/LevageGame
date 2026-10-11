"use client";

import { useMemo } from "react";

import { erreursEtape, type CleEtape } from "@/lib/study/schemas";
import { useStudy } from "@/stores/study";

/** Erreurs Zod de l'étape courante, recalculées à chaque modification de l'étude. */
export function useErreurs(cle: Exclude<CleEtape, "synthese">): Record<string, string> {
  const data = useStudy((s) => s.data);
  return useMemo(() => erreursEtape(cle, data), [cle, data]);
}
