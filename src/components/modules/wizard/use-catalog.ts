"use client";

import { useEffect, useState } from "react";

/** Charge une liste asynchrone du catalogue ; `cle === null` ⇒ rien à charger. */
export function useCatalogList<T>(cle: string | null, charger: () => Promise<T[]>) {
  const [res, setRes] = useState<{ cle: string | null; items: T[]; erreur: string | null }>({
    cle: null,
    items: [],
    erreur: null,
  });
  useEffect(() => {
    if (cle === null) return;
    let annule = false;
    charger()
      .then((items) => {
        if (!annule) setRes({ cle, items, erreur: null });
      })
      .catch((e: unknown) => {
        if (!annule) setRes({ cle, items: [], erreur: e instanceof Error ? e.message : "Erreur inconnue" });
      });
    return () => {
      annule = true;
    };
    // `charger` est recréé à chaque rendu : seule la clé déclenche un rechargement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);
  const pret = res.cle === cle;
  return {
    items: cle !== null && pret ? res.items : [],
    chargement: cle !== null && !pret,
    erreur: cle !== null && pret ? res.erreur : null,
  };
}
