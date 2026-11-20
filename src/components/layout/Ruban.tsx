import type { ReactNode } from "react";

import { VINCI } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const NOM_OUTIL = "ADÉQUATION DE LEVAGE";
const SOUS_TITRE = "Préparer, calculer et justifier vos levages";
const IMAGE = "/ruban-chantier.jpg";

/** Bleu VINCI avec une opacité (suffixe hexadécimal #RRGGBBAA), pour fondre l'illustration dans la bande. */
const bleu = (opacite: number) => VINCI.bleu + Math.round(opacite * 255).toString(16).padStart(2, "0");

/**
 * Ruban illustré « chantier » (pont, grue, piles, tunnel), repris de Contrat Game.
 * - « bandeau » : bande en tête des pages ; l'illustration, entière et à la hauteur de la bande, est calée à droite
 *   et se fond dans le bleu à gauche ; liseré rouge en bas.
 * - « hero » : grand bandeau d'accueil / de connexion, titre en surimpression.
 * L'image est décorative (alt vide) : jamais floutée ni étirée.
 */
export function Ruban({
  variante = "bandeau",
  titre = NOM_OUTIL,
  sousTitre = SOUS_TITRE,
  complement,
  logo,
  gauche,
  droite,
  className,
}: {
  variante?: "hero" | "bandeau";
  titre?: string;
  sousTitre?: string;
  /** Ligne complémentaire sous le sous-titre (variante hero). */
  complement?: ReactNode;
  /** Logo à gauche du titre (variante hero). */
  logo?: ReactNode;
  /** Contenu à gauche du titre (bouton menu sur tablette). */
  gauche?: ReactNode;
  /** Contenu en haut à droite (bouton Profil). */
  droite?: ReactNode;
  className?: string;
}) {
  if (variante === "bandeau") {
    return (
      <header className={cn("relative isolate h-24 shrink-0 overflow-hidden bg-vinci-bleu sm:h-28", className)}>
        <div className="absolute inset-y-0 right-0 -z-10 h-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- illustration décorative à sa largeur naturelle */}
          <img src={IMAGE} alt="" aria-hidden className="h-full w-auto max-w-none" />
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/2"
            style={{ background: `linear-gradient(90deg, ${bleu(1)} 0%, ${bleu(0.75)} 35%, ${bleu(0)} 100%)` }}
          />
        </div>
        {/* Téléphone : l'illustration passe sous le titre, voile bleu pour garder le texte lisible. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 sm:hidden"
          style={{ background: `linear-gradient(90deg, ${bleu(0.94)} 0%, ${bleu(0.8)} 60%, ${bleu(0.35)} 100%)` }}
        />
        <div className={cn("flex h-full items-center gap-2 px-3 sm:px-6", droite && "pr-28")}>
          {gauche}
          <span className="min-w-0 text-white">
            <span className="block text-base font-bold uppercase tracking-wide sm:text-lg">{titre}</span>
            <span className="block text-xs text-white/85 sm:text-sm">{sousTitre}</span>
          </span>
        </div>
        {droite && <div className="absolute right-3 top-3 sm:right-4">{droite}</div>}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-vinci-rouge" />
      </header>
    );
  }

  return (
    <div className={cn("relative isolate min-h-[180px] overflow-hidden rounded-xl bg-vinci-bleu shadow-sm sm:min-h-[210px]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- illustration décorative */}
      <img src={IMAGE} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover object-[85%_50%]" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ background: `linear-gradient(90deg, ${bleu(0.96)} 0%, ${bleu(0.9)} 40%, ${bleu(0.45)} 62%, ${bleu(0)} 80%)` }}
      />
      {/* Téléphone : voile bleu sur toute la largeur, le titre couvre l'illustration. */}
      <div aria-hidden className="absolute inset-0 -z-10 sm:hidden" style={{ background: bleu(0.55) }} />
      <div className="flex h-full min-h-[inherit] items-center gap-4 px-5 py-5 sm:gap-6 sm:px-8">
        {logo}
        <div className="max-w-xl text-white">
          {titre && <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{titre}</h1>}
          {sousTitre && <p className="mt-1 text-sm text-white/90 sm:text-base">{sousTitre}</p>}
          {complement && <div className="mt-2 text-sm text-white/80">{complement}</div>}
        </div>
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-vinci-rouge" />
    </div>
  );
}
