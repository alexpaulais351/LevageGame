"use client";

import { useActionState, useId, useState } from "react";
import { Plus, Save } from "lucide-react";

import { creerMachine, modifierMachine } from "@/actions/machines";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EtatForm } from "@/lib/account/result";
import { PHOTO_TAILLE_MAX } from "@/lib/machines/files";
import type { SpecsSaisies } from "@/lib/machines/schemas";
import { nombreVersTexte, parseNombreFR } from "@/lib/study/units";

import { RetourForm } from "../account/form-bits";
import { ChoixTypeMachine } from "./ChoixTypeMachine";

const VIDE: EtatForm = {};
const selectClasse =
  "flex h-11 min-h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

interface Option {
  id: string;
  label: string;
  code?: string;
}

interface Initial {
  id: string;
  typeId: string;
  manufacturerId: string;
  model: string;
  specs: SpecsSaisies;
  photoUrl: string | null;
}

function Champ({ label, hint, children, id }: { label: string; hint?: string; children: React.ReactNode; id: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-primary-light">{hint}</p>}
    </div>
  );
}

/** Création / modification d'une machine personnelle (type et constructeur : listes du référentiel). */
export function MachineForm({ types, constructeurs, initial }: { types: Option[]; constructeurs: Option[]; initial?: Initial }) {
  const [etat, action, enCours] = useActionState(initial ? modifierMachine : creerMachine, VIDE);
  const uid = useId();
  const [typeId, setTypeId] = useState(initial?.typeId ?? "");
  const [manufId, setManufId] = useState(initial?.manufacturerId ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [champs, setChamps] = useState({
    masse: nombreVersTexte(initial?.specs.masseKg ?? null),
    longueur: nombreVersTexte(initial?.specs.longueurM ?? null),
    largeur: nombreVersTexte(initial?.specs.largeurM ?? null),
    calageL: nombreVersTexte(initial?.specs.calageLongueurM ?? null),
    calageW: nombreVersTexte(initial?.specs.calageLargeurM ?? null),
  });
  const [erreurLocale, setErreurLocale] = useState<string | null>(null);
  const [retirerPhoto, setRetirerPhoto] = useState(false);
  const maj = (k: keyof typeof champs) => (e: React.ChangeEvent<HTMLInputElement>) => setChamps((c) => ({ ...c, [k]: e.target.value }));
  const id = (n: string) => `${uid}-${n}`;

  const soumettre = (fd: FormData) => {
    const num = (t: string) => parseNombreFR(t);
    const v = { masse: num(champs.masse), longueur: num(champs.longueur), largeur: num(champs.largeur), calageL: num(champs.calageL), calageW: num(champs.calageW) };
    if (!typeId) return setErreurLocale("Choisissez le type de machine.");
    if (Object.values(v).some((x) => Number.isNaN(x))) return setErreurLocale("Caractéristiques : nombre attendu (ex. 12,5).");
    const photo = fd.get("photo");
    if (photo instanceof File && photo.size > PHOTO_TAILLE_MAX) return setErreurLocale("Photo : 2 Mo maximum.");
    setErreurLocale(null);
    fd.set(
      "payload",
      JSON.stringify({
        ...(initial ? { id: initial.id, retirerPhoto } : {}),
        typeId,
        manufacturerId: manufId,
        model,
        specs: { masseKg: v.masse, longueurM: v.longueur, largeurM: v.largeur, calageLongueurM: v.calageL, calageLargeurM: v.calageW },
      }),
    );
    action(fd);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">{initial ? "Modifier la machine" : "Nouvelle machine personnelle"}</CardTitle>
        <CardDescription>
          Visible de vous seul. Ne renseignez que des valeurs issues de la documentation de la machine : un champ inconnu reste vide.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={soumettre} className="flex flex-col gap-5" aria-label={initial ? "Modifier la machine" : "Nouvelle machine"}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="min-w-0 sm:col-span-3">
              <ChoixTypeMachine label="Type de machine" types={types} value={typeId} onChange={setTypeId} />
            </div>
            <Champ label="Constructeur" id={id("manuf")}>
              <select id={id("manuf")} className={selectClasse} value={manufId} onChange={(e) => setManufId(e.target.value)} required>
                <option value="">Choisir un constructeur</option>
                {constructeurs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Champ>
            <Champ label="Modèle" id={id("modele")}>
              <Input id={id("modele")} className="h-11 text-base" value={model} onChange={(e) => setModel(e.target.value)} required maxLength={120} placeholder="Tel qu'écrit par le constructeur" />
            </Champ>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-bold text-primary">Caractéristiques utiles (facultatives)</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <Champ label="Masse en ordre de marche (kg)" id={id("masse")}>
                <Input id={id("masse")} inputMode="decimal" className="h-11 text-base" value={champs.masse} onChange={maj("masse")} />
              </Champ>
              <Champ label="Longueur hors tout (m)" id={id("long")}>
                <Input id={id("long")} inputMode="decimal" className="h-11 text-base" value={champs.longueur} onChange={maj("longueur")} />
              </Champ>
              <Champ label="Largeur hors tout (m)" id={id("larg")}>
                <Input id={id("larg")} inputMode="decimal" className="h-11 text-base" value={champs.largeur} onChange={maj("largeur")} />
              </Champ>
              <Champ label="Calage : longueur de l'emprise (m)" id={id("cl")} hint="Stabilisateurs sortis, si connue.">
                <Input id={id("cl")} inputMode="decimal" className="h-11 text-base" value={champs.calageL} onChange={maj("calageL")} />
              </Champ>
              <Champ label="Calage : largeur de l'emprise (m)" id={id("cw")}>
                <Input id={id("cw")} inputMode="decimal" className="h-11 text-base" value={champs.calageW} onChange={maj("calageW")} />
              </Champ>
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor={id("photo")}>Photo de la machine réelle (PNG ou JPEG, 2 Mo maximum, facultative)</Label>
            {initial?.photoUrl && !retirerPhoto && (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL signée d'un bucket privé */}
                <img src={initial.photoUrl} alt="Photo actuelle de la machine" className="h-20 rounded border border-border object-cover" />
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" className="size-5" checked={retirerPhoto} onChange={(e) => setRetirerPhoto(e.target.checked)} />
                  Retirer la photo
                </label>
              </div>
            )}
            <input
              id={id("photo")}
              name="photo"
              type="file"
              accept="image/png,image/jpeg"
              className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-primary file:px-4 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </div>

          {erreurLocale && (
            <p role="alert" className="rounded-md border border-vinci-rouge bg-vinci-rouge-xlight px-3 py-2 text-sm text-vinci-rouge-dark">
              {erreurLocale}
            </p>
          )}
          <RetourForm etat={etat} />
          <Button type="submit" size="lg" className="self-start" disabled={enCours}>
            {initial ? <Save /> : <Plus />}
            {enCours ? "Enregistrement…" : initial ? "Enregistrer la machine" : "Créer la machine"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
