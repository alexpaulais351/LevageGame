import Link from "next/link";
import { Menu, UserRound } from "lucide-react";

import type { Utilisateur } from "@/lib/supabase/session";

import { Ruban } from "./Ruban";

interface TopbarProps {
  onMenuClick: () => void;
  utilisateur: Utilisateur | null;
}

/** Bandeau illustré en tête des pages : bouton menu (tablette) à gauche, Profil à droite. */
export function Topbar({ onMenuClick, utilisateur }: TopbarProps) {
  return (
    <Ruban
      variante="bandeau"
      gauche={
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Ouvrir le menu"
          aria-controls="navigation-principale"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-white hover:bg-vinci-bleu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:hidden"
        >
          <Menu className="size-5" />
        </button>
      }
      droite={
        utilisateur && (
          <Link
            href="/profil"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-vinci-bleu bg-white px-3 text-sm font-semibold text-vinci-bleu shadow-sm hover:bg-vinci-bleu-xlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <UserRound className="size-4" aria-hidden />
            Profil
          </Link>
        )
      }
    />
  );
}
