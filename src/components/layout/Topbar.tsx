import Link from "next/link";
import { LogIn, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
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
      <Button asChild variant="outline" size="sm">
        <Link href="/login">
          <LogIn />
          Connexion
        </Link>
      </Button>
    </header>
  );
}
