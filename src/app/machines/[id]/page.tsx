import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink, FileText, Pencil, Plus } from "lucide-react";

import { ApercuAbaque } from "@/components/modules/machines/ApercuAbaque";
import { BadgeStatut } from "@/components/modules/machines/BadgeStatut";
import { BoutonSupprimer } from "@/components/modules/machines/BoutonSupprimer";
import { VerificationAbaque } from "@/components/modules/machines/VerificationAbaque";
import { VignetteMachine } from "@/components/modules/machines/VignetteMachine";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { idSchema } from "@/lib/account/schemas";
import type { LoadChart } from "@/engine";
import { liensPdf, nomFichierPdf } from "@/lib/machines/pdf";
import { lireAbaques, lireMachine } from "@/lib/machines/queries";
import { exigerUtilisateur } from "@/lib/supabase/session";
import { formatMasse, formatNombreFR } from "@/lib/utils";

export const metadata = { title: "Fiche machine — Adéquation levage" };

const dateFR = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
const AXE = { boom_length_m: "Flèche (m)", height_m: "Hauteur (m)", none: "" } as const;

function TableauValeurs({ chart }: { chart: LoadChart }) {
  const avecY = chart.axisY !== "none";
  return (
    <div className="max-h-80 overflow-auto rounded-md border border-border">
      <table className="w-full min-w-[320px] border-collapse text-sm">
        <thead className="sticky top-0">
          <tr className="bg-primary text-primary-foreground">
            <th className="p-2 text-left font-bold">Portée (m)</th>
            {avecY && <th className="p-2 text-left font-bold">{AXE[chart.axisY]}</th>}
            <th className="p-2 text-right font-bold">Capacité (kg)</th>
          </tr>
        </thead>
        <tbody>
          {chart.points.map((p, i) => (
            <tr key={i} className={i % 2 ? "bg-vinci-gris-light" : "bg-white"}>
              <td className="p-2 tabular-nums">{formatNombreFR(p.x, 2).replace(/,00$/, "")}</td>
              {avecY && <td className="p-2 tabular-nums">{p.y === null ? "—" : formatNombreFR(p.y, 2).replace(/,00$/, "")}</td>}
              <td className="p-2 text-right tabular-nums">{p.capacityKg === null ? "—" : formatNombreFR(p.capacityKg, 1).replace(/,0$/, "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PageFicheMachine({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await exigerUtilisateur(`/machines/${encodeURIComponent(id)}`);
  if (!idSchema.safeParse(id).success) notFound();
  const { supabase } = ctx;
  const m = await lireMachine(supabase, id);
  if (!m) notFound();
  const proprietaire = m.perso; // la RLS ne renvoie une machine personnelle qu'à son propriétaire
  const abaques = await lireAbaques(supabase, m.configurations.map((c) => c.id));

  // Liens (URL signées) vers le PDF source de chaque abaque : catalogue public ou machine personnelle.
  const nomPdf = nomFichierPdf(m.manufacturerName, m.model);
  const pdfUrls = await liensPdf(
    supabase,
    m.perso,
    m.configurations.flatMap((c) => (c.abaque?.source?.pdfPath ? [{ chemin: c.abaque.source.pdfPath, nom: nomPdf }] : [])),
  );
  const s = m.specs;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link href={m.perso ? "/machines?vue=mes" : "/machines"} className="text-sm font-medium text-primary-light underline">
        ← {m.perso ? "Mes machines" : "Catalogue public"}
      </Link>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <VignetteMachine typeCode={m.typeCode} typeLabel={m.typeLabel} photoUrl={m.photoUrl} largeur={200} alt={`Photo de ${m.manufacturerName} ${m.model}`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-primary-light">{m.typeLabel}</p>
          <h1 className="text-2xl font-bold text-primary">
            {m.manufacturerName} {m.model}
          </h1>
          {m.perso && <p className="mt-1 text-sm font-semibold text-primary-light">Machine personnelle — visible de vous seul</p>}
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {s.masseKg !== null && (<><dt className="text-foreground/70">Masse</dt><dd className="font-semibold">{formatMasse(s.masseKg)}</dd></>)}
            {s.longueurM !== null && (<><dt className="text-foreground/70">Longueur hors tout</dt><dd className="font-semibold">{formatNombreFR(s.longueurM, 2).replace(/,00$/, "")} m</dd></>)}
            {s.largeurM !== null && (<><dt className="text-foreground/70">Largeur hors tout</dt><dd className="font-semibold">{formatNombreFR(s.largeurM, 2).replace(/,00$/, "")} m</dd></>)}
            {s.calageLongueurM !== null && s.calageLargeurM !== null && (
              <><dt className="text-foreground/70">Emprise de calage</dt><dd className="font-semibold">{formatNombreFR(s.calageLongueurM, 2).replace(/,00$/, "")} × {formatNombreFR(s.calageLargeurM, 2).replace(/,00$/, "")} m</dd></>
            )}
          </dl>
          <p className="mt-3 text-xs text-foreground/70">Silhouette et photo indicatives — ne remplacent pas les plans constructeur.</p>
          {proprietaire && (
            <div className="mt-4 flex flex-wrap items-start gap-2">
              <Button asChild variant="outline">
                <Link href={`/machines/${m.id}/modifier`}>
                  <Pencil />
                  Modifier
                </Link>
              </Button>
              <BoutonSupprimer cible="machine" id={m.id} libelle={`${m.manufacturerName} ${m.model}`} retour="/machines?vue=mes" />
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-primary">Configurations ({m.configurations.length})</h2>
        {proprietaire && (
          <Button asChild size="lg">
            <Link href={`/machines/${m.id}/configurations/nouvelle`}>
              <Plus />
              Ajouter une configuration
            </Link>
          </Button>
        )}
      </div>

      {m.configurations.length === 0 && (
        <p role="status" className="rounded-md bg-vinci-bleu-xlight p-4 text-sm">
          Aucune configuration. {proprietaire ? "Ajoutez-en une avec son abaque et le PDF constructeur." : ""}
        </p>
      )}

      {m.configurations.map((c) => {
        const chart = abaques.get(c.id);
        const a = c.abaque;
        const pdfUrl = a?.source?.pdfPath ? pdfUrls.get(a.source.pdfPath) : undefined;
        return (
          <Card key={c.id} className="flex flex-col gap-3 p-5" data-testid="carte-configuration">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-primary">{c.label}</h3>
              <BadgeStatut status={a?.status ?? null} />
            </div>
            {Object.keys(c.params).length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Paramètres de la configuration">
                {Object.entries(c.params).map(([k, v]) => (
                  <li key={k} className="rounded-full bg-vinci-bleu-xlight px-3 py-1 text-xs font-semibold text-vinci-bleu-dark">
                    {k} : {String(v)}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-foreground/80">
              {c.moufleKg !== null ? `Moufle / crochet : ${formatMasse(c.moufleKg)}. ` : ""}
              {c.notes ?? ""}
            </p>
            {a ? (
              <>
                <div className="rounded-md border border-border p-3 text-sm">
                  <p className="font-semibold">
                    Source :{" "}
                    {a.source ? (
                      <>
                        {a.source.titre}
                        {a.source.reference ? ` — réf. ${a.source.reference}` : ""}
                        {a.source.edition ? ` — édition ${a.source.edition}` : ""}
                        {a.source.editeur ? ` — ${a.source.editeur}` : ""}
                      </>
                    ) : (
                      "non renseignée"
                    )}
                  </p>
                  <p className="mt-1 text-foreground/80">
                    {a.standard ? `Norme : ${a.standard}. ` : "Norme non renseignée. "}
                    {a.nbPoints} nœud{a.nbPoints > 1 ? "s" : ""}.{" "}
                    {a.status === "verifie" && a.verifieLe ? `Vérifié le ${dateFR(a.verifieLe)}.` : "Contrôle humain contre le document constructeur à faire."}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {a.source?.url && (
                      <a href={a.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary-light underline">
                        Document en ligne
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    )}
                    {pdfUrl && (
                      <>
                        <a href={pdfUrl.voir} target="_blank" rel="noopener noreferrer" data-testid="lien-pdf-constructeur" className="inline-flex min-h-11 items-center gap-1 font-medium text-primary-light underline">
                          <FileText className="size-4" aria-hidden />
                          Voir le PDF de l&apos;abaque
                        </a>
                        <a href={pdfUrl.telecharger} data-testid="telecharger-pdf-constructeur" className="inline-flex min-h-11 items-center gap-1 font-medium text-primary-light underline">
                          <Download className="size-4" aria-hidden />
                          Télécharger
                        </a>
                      </>
                    )}
                  </p>
                </div>
                {chart && (
                  <details className="rounded-md border border-border p-3" data-testid="detail-abaque">
                    <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-primary">Courbe de charge et valeurs</summary>
                    <div className="mt-3 flex flex-col gap-4">
                      <ApercuAbaque chart={chart} />
                      <TableauValeurs chart={chart} />
                    </div>
                  </details>
                )}
                {proprietaire && <VerificationAbaque chartId={a.id} status={a.status} />}
              </>
            ) : (
              <p className="text-sm text-foreground/70">Aucun abaque pour cette configuration.</p>
            )}
            {proprietaire && (
              <div className="flex flex-wrap items-start gap-2">
                <Button asChild variant="outline">
                  <Link href={`/machines/${m.id}/configurations/${c.id}`}>
                    <Pencil />
                    Modifier
                  </Link>
                </Button>
                <BoutonSupprimer cible="configuration" id={c.id} libelle={`la configuration « ${c.label} »`} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
