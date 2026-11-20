"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { compteursBarreLaterale } from "@/actions/admin";

import type { Utilisateur } from "@/lib/supabase/session";

import { Disclaimer } from "./Disclaimer";
import { Ruban } from "./Ruban";
import { Sidebar } from "./Sidebar";
import { SuiviVisites } from "./SuiviVisites";
import { Topbar } from "./Topbar";

export function AppShell({ children, utilisateur }: { children: React.ReactNode; utilisateur: Utilisateur | null }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const pathname = usePathname();
  const estAdmin = Boolean(utilisateur?.estAdmin);
  const [compteurs, setCompteurs] = useState({
    demandesEnAttente: utilisateur?.demandesEnAttente ?? 0,
    ticketsNouveaux: utilisateur?.ticketsNouveaux ?? 0,
  });

  // Le layout serveur n'est pas re-rendu à chaque navigation : pastilles rechargées à chaque page et toutes les 60 s.
  useEffect(() => {
    if (!estAdmin) return;
    let actif = true;
    const charger = () =>
      compteursBarreLaterale()
        .then((c) => actif && setCompteurs(c))
        .catch(() => undefined);
    charger();
    const minuterie = setInterval(charger, 60_000);
    return () => {
      actif = false;
      clearInterval(minuterie);
    };
  }, [pathname, estAdmin]);

  // Non connecté ou compte non approuvé : ni navigation ni accès aux pages de l'outil.
  if (!utilisateur || utilisateur.statut !== "approuve") {
    return (
      <div className="flex min-h-screen flex-col">
        {/* La page de connexion porte son propre grand bandeau (variante hero). */}
        {pathname !== "/login" && <Ruban variante="bandeau" />}
        <Disclaimer />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SuiviVisites />
      <Sidebar open={menuOuvert} onClose={() => setMenuOuvert(false)} utilisateur={{ ...utilisateur, ...compteurs }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onMenuClick={() => setMenuOuvert(true)}
          utilisateur={utilisateur}
          alerte={compteurs.demandesEnAttente + compteurs.ticketsNouveaux > 0}
        />
        <Disclaimer />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
