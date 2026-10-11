import { cn } from "@/lib/utils";

const LIBELLES = {
  ADEQUAT: "ADÉQUAT",
  ADEQUAT_AVEC_RESERVES: "ADÉQUAT AVEC RÉSERVES",
  NON_ADEQUAT: "NON ADÉQUAT",
} as const;

const STYLES = {
  ADEQUAT: "border-verdict-vert bg-verdict-vert-bg text-vinci-bleu-dark",
  ADEQUAT_AVEC_RESERVES: "border-verdict-jaune bg-verdict-jaune-bg text-vinci-bleu-dark",
  NON_ADEQUAT: "border-verdict-rouge bg-verdict-rouge-bg text-vinci-rouge-dark",
} as const;

/** Verdict mémorisé dans une version (charte : vert / jaune / rouge, jamais le seul coloris : le libellé est écrit). */
export function BadgeVerdict({ verdict }: { verdict: keyof typeof LIBELLES | null }) {
  if (!verdict) return null;
  return <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-bold", STYLES[verdict])}>{LIBELLES[verdict]}</span>;
}
