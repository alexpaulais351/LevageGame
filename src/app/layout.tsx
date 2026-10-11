import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { utilisateurCourant } from "@/lib/supabase/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adéquation levage",
  description:
    "Outil d'aide à la rédaction des adéquations de levage (BTP) : machine, charge, abaque, verdict.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const utilisateur = await utilisateurCourant().catch(() => null);
  return (
    <html lang="fr">
      <body className="antialiased">
        <AppShell utilisateur={utilisateur}>{children}</AppShell>
      </body>
    </html>
  );
}
