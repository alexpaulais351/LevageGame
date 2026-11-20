import Link from "next/link";
import { Menu, UserRound } from "lucide-react";

import type { Utilisateur } from "@/lib/supabase/session";

import { Ruban } from "./Ruban";

interface TopbarProps {
  onMenuClick: () => void;
  utilisateur: Utilisateur | null;
  /** Point rouge sur le bouton menu (tablette) : demandes de compte ou tickets à traiter. */
  alerte?: boolean;
}

/** Bandeau illustré en tête des pages : bouton menu (tablette) à gauche, Profil à droite. */
export function Topbar({ onMenuClick, utilisateur, alerte = false }: TopbarProps) {
  return (
    <Ruban
      variante="bandeau"
      gauche={
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={alerte ? "Ouvrir le menu (éléments à traiter)" : "Ouvrir le menu"}
          aria-controls="navigation-principale"
          className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-md text-white hover:bg-vinci-bleu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:hidden"
        >
          <Menu className="size-5" />
          {alerte && <span aria-hidden className="absolute right-2 top-2 size-2.5 rounded-full bg-vinci-rouge ring-2 ring-vinci-bleu" />}
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
