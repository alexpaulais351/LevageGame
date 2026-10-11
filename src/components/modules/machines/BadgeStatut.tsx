import { CheckCircle2, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/** Statut d'un abaque : « À vérifier » (jaune) ou « Vérifié » (vert) — jamais la couleur seule (icône + texte). */
export function BadgeStatut({ status, className }: { status: "a_verifier" | "verifie" | null; className?: string }) {
  if (status === null)
    return (
      <span className={cn("inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-foreground/70", className)}>
        Sans abaque
      </span>
    );
  const verifie = status === "verifie";
  const Icone = verifie ? CheckCircle2 : ShieldAlert;
  return (
    <span
      data-testid="badge-statut"
      data-statut={status}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        verifie ? "border-verdict-vert bg-verdict-vert-bg text-vinci-bleu-dark" : "border-verdict-jaune bg-verdict-jaune-bg text-vinci-bleu-dark",
        className,
      )}
    >
      <Icone className="size-3.5" aria-hidden />
      {verifie ? "Vérifié" : "À vérifier"}
    </span>
  );
}
