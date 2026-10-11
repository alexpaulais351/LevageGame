import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Espace insécable fine (U+202F), séparateur de milliers français. */
const ESPACE_MILLIERS = " ";

/**
 * Formate un nombre à la française : "1 234,50".
 * Implémentation manuelle (pas de toLocaleString) pour un rendu identique serveur/client.
 */
export function formatNombreFR(n: number, decimales = 2): string {
  if (!Number.isFinite(n)) return "";
  const d = Math.max(0, Math.floor(decimales));
  const fixed = Math.abs(n).toFixed(d);
  const [entier, frac] = fixed.split(".");
  const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_MILLIERS);
  const negatif = n < 0 && Number(fixed) !== 0;
  return `${negatif ? "-" : ""}${groupe}${frac ? "," + frac : ""}`;
}

/** Masse en kg ; affichée en tonnes ("1,25 t") dès 1000 kg. */
export function formatMasse(kg: number): string {
  if (Math.abs(kg) >= 1000) {
    const t = kg / 1000;
    const dec = Number.isInteger(Math.round(t * 100) / 100) ? 0 : 2;
    return `${formatNombreFR(t, dec)} t`;
  }
  const dec = Number.isInteger(kg) ? 0 : 2;
  return `${formatNombreFR(kg, dec)} kg`;
}

/** Date au format JJ/MM/AAAA (fuseau local). */
export function formatDateFR(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const jj = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${jj}/${mm}/${d.getFullYear()}`;
}

/** "#004489" ou "#048" → { r, g, b } ; null si invalide. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
