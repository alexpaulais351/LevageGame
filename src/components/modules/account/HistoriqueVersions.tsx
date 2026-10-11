import Link from "next/link";
import { Eye } from "lucide-react";

import type { VersionResume } from "@/actions/versions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { BadgeVerdict } from "./BadgeVerdict";
import { RestaurerVersion } from "./RestaurerVersion";

const dateHeureFR = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });

/** Historique des versions (immuables) : ouverture en lecture et restauration (= nouvelle version). */
export function HistoriqueVersions({
  versions,
  projetId,
  etudeId,
  indexAffiche,
}: {
  versions: VersionResume[];
  projetId: string;
  etudeId: string;
  indexAffiche: number;
}) {
  return (
    <section aria-labelledby="historique" className="flex flex-col gap-3">
      <h2 id="historique" className="text-xl font-bold text-primary">
        Historique des versions
      </h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="bg-primary text-left text-primary-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-bold">Indice</th>
              <th scope="col" className="px-3 py-2 font-bold">Date</th>
              <th scope="col" className="px-3 py-2 font-bold">Verdict</th>
              <th scope="col" className="px-3 py-2 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v, i) => (
              <tr key={v.index} className={i % 2 === 1 ? "bg-vinci-gris-light" : "bg-white"} data-testid={`version-${v.indice}`}>
                <th scope="row" className="px-3 py-2 text-left font-bold">
                  {v.indice}{" "}
                  {v.courante && <Badge className="ml-1">Courante</Badge>}
                </th>
                <td className="px-3 py-2">{dateHeureFR(v.creeeLe)}</td>
                <td className="px-3 py-2">
                  <BadgeVerdict verdict={v.verdict} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-start gap-2">
                    {v.index === indexAffiche ? (
                      <span className="self-center text-foreground/70">Affichée</span>
                    ) : (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/projets/${projetId}/etudes/${etudeId}?version=${v.index}`}>
                          <Eye /> Ouvrir en lecture
                        </Link>
                      </Button>
                    )}
                    {!v.courante && <RestaurerVersion etudeId={etudeId} projetId={projetId} index={v.index} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
