"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, LogOut, PlusCircle, Truck, X, type LucideIcon } from "lucide-react";

import { deconnexion } from "@/actions/auth";
import type { Utilisateur } from "@/lib/supabase/session";
import { cn } from "@/lib/utils";

const LIENS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/outil", label: "Nouvelle adéquation", icon: PlusCircle },
  { href: "/projets", label: "Projets", icon: FolderOpen },
  { href: "/machines", label: "Machines", icon: Truck },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  utilisateur: Utilisateur | null;
}

export function Sidebar({ open, onClose, utilisateur }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        id="navigation-principale"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-vinci-bleu text-white transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-start justify-between border-b border-white/20 px-4 py-5">
          <Link href="/" onClick={onClose} className="block">
            <div className="text-base font-bold tracking-wide">ADÉQUATION LEVAGE</div>
            <div className="mt-1 text-xs text-white/70">Vérification des levages</div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/70 hover:bg-vinci-bleu-dark hover:text-white lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 py-3" aria-label="Navigation principale">
          {LIENS.map(({ href, label, icon: Icon }) => {
            const actif = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={actif ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 border-l-4 px-4 py-3 text-sm transition-colors hover:bg-vinci-bleu-dark",
                  actif
                    ? "border-vinci-rouge bg-vinci-bleu-dark font-semibold text-white"
                    : "border-transparent text-white/70 hover:text-white",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        {utilisateur && (
          <div className="border-t border-white/20 px-4 py-3 text-sm" data-testid="pied-utilisateur">
            <Link href="/profil" onClick={onClose} className="block rounded hover:text-white">
              <div className="truncate font-semibold">{utilisateur.nom}</div>
              <div className="truncate text-xs text-white/70">{utilisateur.email}</div>
            </Link>
            <form action={deconnexion} className="mt-2">
              <button
                type="submit"
                className="flex items-center gap-2 rounded px-1 py-1 text-xs text-white/70 hover:bg-vinci-bleu-dark hover:text-white"
              >
                <LogOut className="size-4" aria-hidden />
                Se déconnecter
              </button>
            </form>
          </div>
        )}
      </aside>
    </>
  );
}
