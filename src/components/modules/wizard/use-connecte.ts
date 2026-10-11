"use client";

import { useEffect, useState } from "react";

import { supabaseConfigure } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/client";

/** L'utilisateur est-il connecté ? (`false` pour un invité ou sans Supabase ; jamais de stockage local.) */
export function useConnecte(): boolean {
  const [connecte, setConnecte] = useState(false);
  useEffect(() => {
    if (!supabaseConfigure()) return;
    let annule = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!annule) setConnecte(Boolean(data.user));
      })
      .catch(() => undefined);
    return () => {
      annule = true;
    };
  }, []);
  return connecte;
}
