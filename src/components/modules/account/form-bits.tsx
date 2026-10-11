"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EtatForm } from "@/lib/account/result";

/** Champ libellé + input pour les formulaires de compte (cibles tactiles ≥ 44 px). */
export function ChampForm({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  autoComplete,
  hint,
  inputMode,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
  inputMode?: "text" | "decimal" | "email" | "tel";
  minLength?: number;
}) {
  const id = `${useId()}-${name}`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        minLength={minLength}
        className="h-11 text-base"
      />
      {hint && <p className="text-xs text-primary-light">{hint}</p>}
    </div>
  );
}

/** Retour d'un formulaire : erreur (rouge) ou confirmation (bleu), annoncé aux lecteurs d'écran. */
export function RetourForm({ etat }: { etat: EtatForm }) {
  if (etat.error)
    return (
      <p role="alert" className="rounded-md border border-vinci-rouge bg-vinci-rouge-xlight px-3 py-2 text-sm text-vinci-rouge-dark">
        {etat.error}
      </p>
    );
  if (etat.message)
    return (
      <p role="status" className="rounded-md border border-primary-light bg-vinci-bleu-xlight px-3 py-2 text-sm text-vinci-bleu-dark">
        {etat.message}
      </p>
    );
  return null;
}

export function ErreurAction({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="text-sm font-medium text-vinci-rouge-dark">
      {message}
    </p>
  ) : null;
}
