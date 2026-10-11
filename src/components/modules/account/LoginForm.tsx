"use client";

import { useActionState } from "react";
import { LogIn, UserPlus } from "lucide-react";

import { connexion, inscription } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EtatForm } from "@/lib/account/result";

import { ChampForm, RetourForm } from "./form-bits";

const VIDE: EtatForm = {};

export function LoginForm({
  suivant,
  erreurLien,
  ongletInitial = "connexion",
}: {
  suivant: string;
  erreurLien: boolean;
  ongletInitial?: "connexion" | "inscription";
}) {
  const [etatCo, actionCo, enCoursCo] = useActionState(connexion, VIDE);
  const [etatIns, actionIns, enCoursIns] = useActionState(inscription, VIDE);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-primary">Compte</CardTitle>
        <CardDescription>Connectez-vous, ou créez un compte : votre demande sera transmise à l&apos;administrateur.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {erreurLien && (
          <p role="alert" className="rounded-md border border-vinci-rouge bg-vinci-rouge-xlight px-3 py-2 text-sm text-vinci-rouge-dark">
            Ce lien est invalide ou a expiré.
          </p>
        )}
        <Tabs defaultValue={ongletInitial}>
          <TabsList className="grid h-auto w-full grid-cols-2">
            <TabsTrigger value="connexion" className="min-h-10">
              Connexion
            </TabsTrigger>
            <TabsTrigger value="inscription" className="min-h-10">
              Créer un compte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connexion">
            <form action={actionCo} className="flex flex-col gap-4" aria-label="Connexion">
              <input type="hidden" name="suivant" value={suivant} />
              <ChampForm label="Adresse e-mail" name="email" type="email" autoComplete="email" required />
              <ChampForm label="Mot de passe" name="motDePasse" type="password" autoComplete="current-password" required />
              <RetourForm etat={etatCo} />
              <Button type="submit" size="lg" disabled={enCoursCo}>
                <LogIn />
                {enCoursCo ? "Connexion…" : "Se connecter"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="inscription">
            <form action={actionIns} className="flex flex-col gap-4" aria-label="Créer un compte">
              <ChampForm label="Nom complet" name="nom" autoComplete="name" required />
              <ChampForm label="Entreprise" name="entreprise" autoComplete="organization" required />
              <ChampForm label="Adresse e-mail" name="email" type="email" autoComplete="email" required />
              <ChampForm
                label="Mot de passe"
                name="motDePasse"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                hint="8 caractères minimum."
              />
              <ChampForm
                label="Confirmation du mot de passe"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <p className="text-xs text-foreground/70">
                Votre compte sera actif après validation par l&apos;administrateur. Aucune donnée n&apos;est accessible avant.
              </p>
              <RetourForm etat={etatIns} />
              <Button type="submit" size="lg" disabled={enCoursIns}>
                <UserPlus />
                {enCoursIns ? "Envoi de la demande…" : "Demander la création du compte"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
