import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Accueil() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-primary">Adéquation de levage</h1>
      <p className="mt-4">
        Vérifiez qu&apos;une grue ou un engin de levage est adapté à votre opération : saisie de
        la machine et de la charge, lecture de l&apos;abaque constructeur, calcul du taux
        d&apos;utilisation et verdict détaillé, exportable en PDF.
      </p>
      <p className="mt-2 text-muted-foreground">
        Aucune valeur d&apos;abaque n&apos;est inventée : chaque donnée est sourcée.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link href="/outil">Démarrer une adéquation sans compte</Link>
      </Button>
    </div>
  );
}
