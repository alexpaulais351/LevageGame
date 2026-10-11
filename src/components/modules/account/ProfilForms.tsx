"use client";

import { useActionState } from "react";

import { majEntreprise, majProfil, majSeuils } from "@/actions/profil";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { EtatForm } from "@/lib/account/result";
import { formatNombreFR } from "@/lib/utils";

import { ChampForm, RetourForm } from "./form-bits";

const VIDE: EtatForm = {};

export function ProfilForm({ nom, fonction, telephone, email }: { nom: string; fonction: string; telephone: string; email: string }) {
  const [etat, action, enCours] = useActionState(majProfil, VIDE);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Rédacteur</CardTitle>
        <CardDescription>Votre nom figure comme rédacteur sur les fiches PDF. Connecté avec {email}.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4" aria-label="Profil">
          <div className="grid gap-4 sm:grid-cols-2">
            <ChampForm label="Nom complet" name="nom" defaultValue={nom} required autoComplete="name" />
            <ChampForm label="Fonction" name="fonction" defaultValue={fonction} hint="Ex. : conducteur de travaux, chef de chantier." />
            <ChampForm label="Téléphone" name="telephone" type="tel" defaultValue={telephone} autoComplete="tel" />
          </div>
          <RetourForm etat={etat} />
          <Button type="submit" size="lg" className="self-start" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer le profil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function EntrepriseForm({ nom, adresse, logo }: { nom: string; adresse: string; logo: string | null }) {
  const [etat, action, enCours] = useActionState(majEntreprise, VIDE);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Entreprise</CardTitle>
        <CardDescription>Nom, adresse et logo reportés dans l&apos;en-tête des fiches PDF.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4" aria-label="Entreprise">
          <div className="grid gap-4 sm:grid-cols-2">
            <ChampForm label="Nom de l'entreprise" name="nom" defaultValue={nom} required autoComplete="organization" />
            <ChampForm label="Adresse" name="adresse" defaultValue={adresse} autoComplete="street-address" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="champ-logo">Logo (PNG ou JPEG, 1 Mo maximum)</Label>
            {logo && (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- data-URI privée, pas d'optimisation possible */}
                <img src={logo} alt="Logo de l'entreprise" className="h-14 max-w-48 rounded border border-border bg-white object-contain p-1" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="retirerLogo" className="size-4" />
                  Retirer le logo
                </label>
              </div>
            )}
            <input
              id="champ-logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg"
              className="block w-full cursor-pointer rounded-md border border-input bg-background p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            />
          </div>
          <RetourForm etat={etat} />
          <Button type="submit" size="lg" className="self-start" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer l'entreprise"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function SeuilsForm({ vert, orange }: { vert: number; orange: number }) {
  const [etat, action, enCours] = useActionState(majSeuils, VIDE);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Seuils du verdict</CardTitle>
        <CardDescription>
          Taux d&apos;utilisation en % : jusqu&apos;au seuil vert, l&apos;adéquation est conforme ; entre vert et orange, elle est
          « avec réserves » ; au-delà de l&apos;orange, non adéquate. Appliqués aux nouvelles études (défaut 80 / 100 %).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4" aria-label="Seuils">
          <div className="grid gap-4 sm:grid-cols-2">
            <ChampForm label="Seuil vert (%)" name="vert" inputMode="decimal" defaultValue={formatNombreFR(vert)} required />
            <ChampForm label="Seuil orange (%)" name="orange" inputMode="decimal" defaultValue={formatNombreFR(orange)} required />
          </div>
          <RetourForm etat={etat} />
          <Button type="submit" size="lg" className="self-start" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer les seuils"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
