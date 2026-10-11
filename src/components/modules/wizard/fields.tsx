"use client";

import { createContext, useContext, useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kgToT, kNToT, nombreVersTexte, parseNombreFR, tToKN, tToKg } from "@/lib/study/units";
import { cn } from "@/lib/utils";

/** Quand vrai (clic sur « Suivant » d'une étape incomplète), toutes les erreurs sont affichées. */
export const AfficherErreursContext = createContext(false);

const base44 = "h-11 min-h-11 text-base";
const selectClasse =
  "flex h-11 min-h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

interface FieldProps {
  label: string;
  /** Message d'erreur Zod (affiché après passage dans le champ ou tentative de passer à l'étape suivante). */
  error?: string;
  hint?: string;
  className?: string;
  children: (id: string, invalide: boolean) => React.ReactNode;
}

export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const [touche, setTouche] = useState(false);
  const tout = useContext(AfficherErreursContext);
  const invalide = Boolean(error) && (touche || tout);
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)} onBlur={() => setTouche(true)}>
      <Label htmlFor={id}>{label}</Label>
      {children(id, invalide)}
      {hint && !invalide && <p className="text-xs text-primary-light">{hint}</p>}
      {invalide && (
        <p role="alert" className="text-xs font-medium text-vinci-rouge">
          {error}
        </p>
      )}
    </div>
  );
}

function Suffixe({ unite, children }: { unite?: string; children: React.ReactNode }) {
  if (!unite) return <>{children}</>;
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-primary-light">
        {unite}
      </span>
    </div>
  );
}

interface TexteProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  className?: string;
  type?: "text" | "date";
}

export function TextField({ label, value, onChange, error, hint, placeholder, className, type = "text" }: TexteProps) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(id, invalide) => (
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          aria-invalid={invalide}
          onChange={(e) => onChange(e.target.value)}
          className={cn(base44, invalide && "border-vinci-rouge")}
        />
      )}
    </Field>
  );
}

export function TextAreaField({ label, value, onChange, error, hint, placeholder, className }: Omit<TexteProps, "type">) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(id, invalide) => (
        <textarea
          id={id}
          value={value}
          rows={3}
          placeholder={placeholder}
          aria-invalid={invalide}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            invalide && "border-vinci-rouge",
          )}
        />
      )}
    </Field>
  );
}

interface NombreProps {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  unite?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  className?: string;
}

/** Champ numérique à virgule française ; le texte brut est conservé pendant la frappe. */
export function NumberField({ label, value, onChange, unite, error, hint, placeholder, className }: NombreProps) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(id, invalide) => (
        <Suffixe unite={unite}>
          <NumberInput id={id} value={value} onChange={onChange} invalide={invalide} placeholder={placeholder} reserve={unite ? "pr-14" : ""} />
        </Suffixe>
      )}
    </Field>
  );
}

export function NumberInput({
  id,
  value,
  onChange,
  invalide,
  placeholder,
  reserve,
}: {
  id?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  invalide?: boolean;
  placeholder?: string;
  reserve?: string;
}) {
  const [texte, setTexte] = useState(nombreVersTexte(value));
  const [derniere, setDerniere] = useState(value);
  if (value !== derniere) {
    setDerniere(value);
    const lu = parseNombreFR(texte);
    if (lu !== value && !(Number.isNaN(lu) && value === null)) setTexte(nombreVersTexte(value));
  }
  return (
    <Input
      id={id}
      inputMode="decimal"
      autoComplete="off"
      value={texte}
      placeholder={placeholder}
      aria-invalid={invalide}
      onChange={(e) => {
        const t = e.target.value;
        setTexte(t);
        const n = parseNombreFR(t);
        const v = n === null || Number.isNaN(n) ? null : n;
        setDerniere(v);
        onChange(v);
      }}
      className={cn(base44, reserve, invalide && "border-vinci-rouge")}
    />
  );
}

export interface UniteConvertible {
  label: string;
  /** valeur affichée → valeur stockée */
  versBase: (n: number) => number;
  /** valeur stockée → valeur affichée */
  depuisBase: (n: number) => number;
}

interface NombreUniteProps extends Omit<NombreProps, "unite"> {
  unites: UniteConvertible[];
  /** Unité affichée au départ (index dans `unites`). */
  uniteInitiale?: number;
}

/** Champ numérique avec choix d'unité (ex. kg / t) : la valeur stockée reste dans l'unité de base. */
export function UnitNumberField({ label, value, onChange, unites, uniteInitiale = 0, error, hint, placeholder, className }: NombreUniteProps) {
  const [idx, setIdx] = useState(uniteInitiale);
  const u = unites[idx];
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(id, invalide) => (
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <NumberInput
              key={idx}
              id={id}
              value={value === null ? null : u.depuisBase(value)}
              onChange={(v) => onChange(v === null ? null : u.versBase(v))}
              invalide={invalide}
              placeholder={placeholder}
            />
          </div>
          <select
            aria-label={`Unité de ${label}`}
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
            className={cn(selectClasse, "w-20 shrink-0 font-medium text-primary")}
          >
            {unites.map((x, i) => (
              <option key={x.label} value={i}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </Field>
  );
}

interface SelectProps<T extends string> {
  label: string;
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  hint?: string;
}

export function SelectField<T extends string>({ label, value, options, onChange, placeholder, error, disabled, className, hint }: SelectProps<T>) {
  return (
    <Field label={label} error={error} className={className} hint={hint}>
      {(id, invalide) => (
        <select
          id={id}
          value={value}
          disabled={disabled}
          aria-invalid={invalide}
          onChange={(e) => onChange(e.target.value as T)}
          className={cn(selectClasse, invalide && "border-vinci-rouge")}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 text-sm", className)}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-6 shrink-0 accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}

/** Choix exclusif sous forme de gros boutons (saisie tactile). */
export function ChoixSegmente<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  error?: string;
}) {
  const tout = useContext(AfficherErreursContext);
  const [touche, setTouche] = useState(false);
  const invalide = Boolean(error) && (touche || tout);
  return (
    <div className="flex flex-col gap-1.5" onBlur={() => setTouche(true)}>
      <span className="text-sm font-medium leading-none">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const actif = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={actif}
              onClick={() => onChange(o.value)}
              className={cn(
                "inline-flex h-11 min-w-11 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                actif
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-vinci-bleu-xlight",
                invalide && !actif && "border-vinci-rouge",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {invalide && (
        <p role="alert" className="text-xs font-medium text-vinci-rouge">
          {error}
        </p>
      )}
    </div>
  );
}

export const UNITES_MASSE: UniteConvertible[] = [
  { label: "kg", versBase: (n) => n, depuisBase: (n) => n },
  { label: "t", versBase: tToKg, depuisBase: kgToT },
];

export const UNITES_EFFORT: UniteConvertible[] = [
  { label: "kN", versBase: (n) => n, depuisBase: (n) => n },
  { label: "t", versBase: tToKN, depuisBase: kNToT },
];
