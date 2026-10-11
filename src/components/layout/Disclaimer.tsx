import { TriangleAlert } from "lucide-react";

export function Disclaimer() {
  return (
    <div
      role="note"
      className="flex items-start gap-2 border-b border-border bg-vinci-rouge-xlight px-4 py-2 text-xs text-vinci-bleu-dark sm:text-sm"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-vinci-rouge" aria-hidden />
      <p>
        Outil d&apos;aide à la rédaction. L&apos;adéquation doit être validée par une personne
        compétente, sur la base de la documentation constructeur de la machine réellement
        présente sur le chantier.
      </p>
    </div>
  );
}
