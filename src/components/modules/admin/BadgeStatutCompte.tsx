import { LIBELLE_STATUT } from "@/lib/admin/comptes";
import type { StatutCompte } from "@/lib/supabase/session";
import { cn } from "@/lib/utils";

const STYLE: Record<StatutCompte, string> = {
  en_attente: "border-verdict-jaune bg-verdict-jaune-bg text-vinci-bleu-dark",
  approuve: "border-verdict-vert bg-verdict-vert-bg text-vinci-bleu-dark",
  refuse: "border-vinci-rouge bg-vinci-rouge-xlight text-vinci-rouge-dark",
  suspendu: "border-vinci-rouge bg-vinci-rouge-xlight text-vinci-rouge-dark",
};

export function BadgeStatutCompte({ statut }: { statut: StatutCompte }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", STYLE[statut])}>{LIBELLE_STATUT[statut]}</span>;
}
