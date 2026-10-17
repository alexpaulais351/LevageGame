import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardList, Zap } from "lucide-react";

import { exigerUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Nouvelle adéquation — Adéquation levage" };

const carte = "flex flex-col gap-1 rounded-lg border-2 p-4 transition-colors";

/** Choix du type d'adéquation : rapide (une pose, sans enregistrement) ou projet (dossier complet). */
export default async function PageOutil({ searchParams }: { searchParams: Promise<{ projet?: string }> }) {
  await exigerUtilisateur("/outil");
  // Anciens liens « nouvelle adéquation dans ce projet » : directement vers l'adéquation projet.
  const { projet } = await searchParams;
  if (projet) redirect(`/outil/projet?projet=${encodeURIComponent(projet)}`);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-primary">Nouvelle adéquation</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/outil/rapide" className={`${carte} border-primary bg-vinci-bleu-xlight hover:bg-vinci-bleu-xlight/70`} data-testid="lien-rapide">
          <span className="flex items-center gap-2 font-bold text-primary">
            <Zap className="size-5" aria-hidden />
            Adéquation rapide
            <ArrowRight className="ml-auto size-4" aria-hidden />
          </span>
          <span className="text-sm text-foreground/80">Vérifier une seule pose : machine, masse de la charge avec coefficient de marge, portée. Sans projet ni enregistrement.</span>
        </Link>
        <Link href="/outil/projet" className={`${carte} border-border hover:border-primary hover:bg-vinci-bleu-xlight`} data-testid="lien-projet">
          <span className="flex items-center gap-2 font-bold text-primary">
            <ClipboardList className="size-5" aria-hidden />
            Adéquation projet
            <ArrowRight className="ml-auto size-4" aria-hidden />
          </span>
          <span className="text-sm text-foreground/80">Dossier complet en 9 étapes, enregistré dans un projet, avec PDF : charge, élingage, machine, sol, vent, personnel.</span>
        </Link>
      </div>
    </div>
  );
}
