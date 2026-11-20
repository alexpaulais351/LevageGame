"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import type { Utilisateur } from "@/lib/supabase/session";

import { Disclaimer } from "./Disclaimer";
import { Ruban } from "./Ruban";
import { Sidebar } from "./Sidebar";
import { SuiviVisites } from "./SuiviVisites";
import { Topbar } from "./Topbar";

export function AppShell({ children, utilisateur }: { children: React.ReactNode; utilisateur: Utilisateur | null }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const pathname = usePathname();

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
      <Sidebar open={menuOuvert} onClose={() => setMenuOuvert(false)} utilisateur={utilisateur} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMenuOuvert(true)} utilisateur={utilisateur} />
        <Disclaimer />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
