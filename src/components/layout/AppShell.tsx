"use client";

import { useState } from "react";

import type { Utilisateur } from "@/lib/supabase/session";

import { Disclaimer } from "./Disclaimer";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children, utilisateur }: { children: React.ReactNode; utilisateur: Utilisateur | null }) {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={menuOuvert} onClose={() => setMenuOuvert(false)} utilisateur={utilisateur} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMenuOuvert(true)} utilisateur={utilisateur} />
        <Disclaimer />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
