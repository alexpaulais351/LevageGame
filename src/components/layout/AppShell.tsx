"use client";

import { useState } from "react";

import { Disclaimer } from "./Disclaimer";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={menuOuvert} onClose={() => setMenuOuvert(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMenuOuvert(true)} />
        <Disclaimer />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
