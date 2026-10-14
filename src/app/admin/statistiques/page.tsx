import Link from "next/link";

import { lireStatistiques } from "@/actions/admin";
import { BadgeStatutCompte } from "@/components/modules/admin/BadgeStatutCompte";
import { Card } from "@/components/ui/card";
import { LIBELLE_STATUT, STATUTS } from "@/lib/admin/comptes";
import { ilYA, libellePage, periode, PERIODES, type PointJour } from "@/lib/admin/statistiques";
import { exigerAdmin } from "@/lib/supabase/session";
import { cn, formatNombreFR } from "@/lib/utils";

export const metadata = { title: "Statistiques — Administration" };

const n = (v: number) => formatNombreFR(v, 0);
const jourCourt = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

function Indicateur({ titre, valeur, detail }: { titre: string; valeur: string; detail?: string }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="text-sm text-foreground/70">{titre}</span>
      <span className="text-3xl font-bold text-primary">{valeur}</span>
      {detail && <span className="text-xs text-foreground/70">{detail}</span>}
    </Card>
  );
}

/** Barres journalières d'une seule mesure (pas de double axe) ; valeur au survol et en texte alternatif. */
function Histogramme({ titre, serie, mesure, unite }: { titre: string; serie: PointJour[]; mesure: "visiteurs" | "connexions"; unite: string }) {
  const max = Math.max(1, ...serie.map((p) => p[mesure]));
  const total = serie.reduce((s, p) => s + p[mesure], 0);
  const pas = Math.max(1, Math.ceil(serie.length / 8));
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-primary">{titre}</h2>
        <span className="text-sm text-foreground/70">
          max. {n(total === 0 ? 0 : max)} {unite} / jour
        </span>
      </div>
      <div className="flex h-40 items-end gap-[2px] border-b border-border" role="img" aria-label={`${titre} : ${serie.map((p) => `${jourCourt(p.jour)} ${p[mesure]}`).join(", ")}`}>
        {serie.map((p) => (
          <div key={p.jour} className="group relative flex h-full flex-1 items-end" title={`${jourCourt(p.jour)} : ${n(p[mesure])} ${unite}`}>
            <div className="w-full rounded-t-[4px] bg-vinci-bleu group-hover:bg-vinci-bleu-dark" style={{ height: p[mesure] > 0 ? `${Math.max(2, (p[mesure] / max) * 100)}%` : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] text-foreground/60">
        {serie.map((p, i) => (
          <span key={p.jour} className="flex-1 text-center">
            {i % pas === 0 ? jourCourt(p.jour) : ""}
          </span>
        ))}
      </div>
    </Card>
  );
}

export default async function PageAdminStatistiques({ searchParams }: { searchParams: Promise<{ jours?: string }> }) {
  await exigerAdmin("/admin/statistiques");
  const jours = periode((await searchParams).jours);
  const r = await lireStatistiques(jours);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Statistiques de fréquentation</h1>
          <p className="text-sm text-foreground/70">Connexions et pages consultées par les comptes (activité de l&apos;administrateur comprise).</p>
        </div>
        <nav aria-label="Période" className="flex gap-2">
          {PERIODES.map((p) => (
            <Link
              key={p}
              href={`/admin/statistiques?jours=${p}`}
              aria-current={p === jours ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center rounded-md border px-3 text-sm",
                p === jours ? "border-primary bg-primary font-semibold text-white" : "border-border bg-background text-primary hover:bg-vinci-bleu-xlight",
              )}
            >
              {p} jours
            </Link>
          ))}
        </nav>
      </div>

      {!r.ok ? (
        <p role="alert" className="text-vinci-rouge-dark">
          {r.error}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicateur titre="Utilisateurs actifs aujourd'hui" valeur={n(r.data.actifsJour)} detail={`${n(r.data.actifs7j)} sur 7 jours`} />
            <Indicateur titre={`Utilisateurs actifs (${jours} j)`} valeur={n(r.data.actifsPeriode)} detail={`sur ${n(r.data.comptesParStatut.approuve)} comptes approuvés`} />
            <Indicateur titre={`Connexions (${jours} j)`} valeur={n(r.data.connexions)} detail={`${n(r.data.vues)} pages vues`} />
            <Indicateur titre={`Inscriptions (${jours} j)`} valeur={n(r.data.inscriptions)} detail={STATUTS.map((s) => `${LIBELLE_STATUT[s]} ${r.data.comptesParStatut[s]}`).join(" · ")} />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicateur titre="Projets (total)" valeur={n(r.data.projets)} />
            <Indicateur titre="Études de levage (total)" valeur={n(r.data.etudes)} />
            <Link href="/admin/comptes?filtre=en_attente" className="contents">
              <Indicateur titre="Demandes en attente" valeur={n(r.data.comptesParStatut.en_attente)} detail="voir les comptes" />
            </Link>
            <Indicateur titre="Comptes suspendus / refusés" valeur={n(r.data.comptesParStatut.suspendu + r.data.comptesParStatut.refuse)} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Histogramme titre="Visiteurs par jour" serie={r.data.serie} mesure="visiteurs" unite="visiteur(s)" />
            <Histogramme titre="Connexions par jour" serie={r.data.serie} mesure="connexions" unite="connexion(s)" />
          </div>

          <Card className="overflow-x-auto p-0">
            <h2 className="p-4 text-lg font-bold text-primary">Activité par compte</h2>
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-vinci-bleu text-left font-bold text-white">
                  <th className="px-3 py-2">Compte</th>
                  <th className="px-3 py-2">Dernière connexion</th>
                  <th className="px-3 py-2">Dernière activité</th>
                  <th className="px-3 py-2 text-right">Connexions</th>
                  <th className="px-3 py-2 text-right">Jours actifs</th>
                  <th className="px-3 py-2 text-right">Pages vues</th>
                  <th className="px-3 py-2 text-right">Projets</th>
                  <th className="px-3 py-2 text-right">Études</th>
                </tr>
              </thead>
              <tbody>
                {r.data.comptes.map((c) => (
                  <tr key={c.id} className="odd:bg-white even:bg-vinci-gris-light">
                    <td className="px-3 py-2">
                      <Link href={`/admin/comptes/${c.id}`} className="font-semibold text-primary hover:underline">
                        {c.nom || c.email}
                      </Link>{" "}
                      <BadgeStatutCompte statut={c.statut} />
                      {c.estAdmin && <span className="ml-1 text-xs font-semibold text-primary">Admin</span>}
                      <div className="text-xs text-foreground/70">{[c.email, c.entreprise].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="px-3 py-2">{ilYA(c.derniereConnexion)}</td>
                    <td className="px-3 py-2">{ilYA(c.derniereActivite)}</td>
                    <td className="px-3 py-2 text-right">{n(c.connexions)}</td>
                    <td className="px-3 py-2 text-right">{n(c.joursActifs)}</td>
                    <td className="px-3 py-2 text-right">{n(c.vues)}</td>
                    <td className="px-3 py-2 text-right">{n(c.projets)}</td>
                    <td className="px-3 py-2 text-right">{n(c.etudes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="overflow-x-auto p-0">
            <h2 className="p-4 text-lg font-bold text-primary">Pages les plus consultées ({jours} j)</h2>
            {r.data.pages.length === 0 ? (
              <p className="px-4 pb-4 text-foreground/70">Aucune page vue sur la période.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-vinci-bleu text-left font-bold text-white">
                    <th className="px-3 py-2">Page</th>
                    <th className="px-3 py-2 text-right">Vues</th>
                    <th className="px-3 py-2 text-right">Visiteurs</th>
                  </tr>
                </thead>
                <tbody>
                  {r.data.pages.map((p) => (
                    <tr key={p.chemin} className="odd:bg-white even:bg-vinci-gris-light">
                      <td className="px-3 py-2">{libellePage(p.chemin)}</td>
                      <td className="px-3 py-2 text-right">{n(p.vues)}</td>
                      <td className="px-3 py-2 text-right">{n(p.visiteurs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <p className="text-xs text-foreground/60">
            Suivi démarré le 14/10/2026 : les connexions et pages vues antérieures ne sont pas comptées (la dernière connexion provient du service
            d&apos;authentification). Données conservées en base, visibles uniquement par l&apos;administrateur.
          </p>
        </>
      )}
    </div>
  );
}
