import Link from "next/link";
import { Menu, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Utilisateur } from "@/lib/supabase/session";

interface TopbarProps {
  onMenuClick: () => void;
  utilisateur: Utilisateur | null;
}

export function Topbar({ onMenuClick, utilisateur }: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Ouvrir le menu"
          aria-controls="navigation-principale"
        >
          <Menu className="size-5" />
        </Button>
        <span className="text-sm font-semibold text-primary lg:hidden">ADÉQUATION LEVAGE</span>
      </div>
      {utilisateur && (
        <Button asChild variant="outline" size="sm">
          <Link href="/profil">
            <UserRound />
            Profil
          </Link>
        </Button>
      )}
    </header>
  );
}
