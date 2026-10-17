import { AdequationRapide } from "@/components/modules/rapide/AdequationRapide";
import { exigerUtilisateur } from "@/lib/supabase/session";

export const metadata = { title: "Adéquation rapide — Adéquation levage" };

/** Vérification rapide d'une pose (machine, masse × coef. de marge, portée) : sans projet, rien n'est enregistré (D43). */
export default async function PageAdequationRapide() {
  await exigerUtilisateur("/outil/rapide");
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Adéquation rapide</h1>
        <p className="text-sm text-foreground/70">Une charge peut-elle être posée à une distance donnée avec cette machine ?</p>
      </div>
      <AdequationRapide />
    </div>
  );
}
