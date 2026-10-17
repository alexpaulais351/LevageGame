import Link from "next/link";
import { BookOpen, Container, Download, ExternalLink, FolderOpen, Gauge, PlusCircle, Truck, type LucideIcon } from "lucide-react";

import { listerProjets } from "@/actions/projets";
import { Card } from "@/components/ui/card";
import { exigerUtilisateur, utilisateurCourant } from "@/lib/supabase/session";

export const metadata = { title: "Accueil — Adéquation levage" };

// Paramètre de version : force le rechargement de la présentation après chaque mise à jour (cache navigateur).
const PDF = "/documents/presentation-adequation-levage.pdf?v=2026-10-17";

const dateFR = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

const ACTIONS: { href: string; titre: string; texte: string; icon: LucideIcon }[] = [
  { href: "/outil", titre: "Nouvelle adéquation", texte: "Saisir un levage et obtenir le verdict.", icon: PlusCircle },
  { href: "/projets", titre: "Mes projets", texte: "Retrouver et reprendre vos études.", icon: FolderOpen },
  { href: "/machines", titre: "Catalogue machines", texte: "Consulter les machines et leurs abaques.", icon: Truck },
  { href: "/machines?vue=abaques", titre: "Disponibilité des abaques", texte: "Voir quelles machines ont un abaque.", icon: Gauge },
  { href: "/transport", titre: "Transport des pièces", texte: "Convoi, voiture pilote, démarches et camions adaptés.", icon: Container },
];

export default async function Accueil() {
  // Non connecté → /login ; compte non approuvé → /compte-en-attente.
  await exigerUtilisateur();
  const utilisateur = await utilisateurCourant();
  const r = await listerProjets();
  const recents = r.ok ? r.data.slice(0, 3) : [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <section className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Logo Adéquation de levage" width={128} height={128} className="size-24 shrink-0 sm:size-32" />
        <div>
          <h1 className="text-3xl font-bold text-primary">Adéquation de levage</h1>
          <p className="mt-2 text-foreground/80">
            Outil d&apos;aide à la préparation et à la vérification des adéquations de levage.
          </p>
          {utilisateur && <p className="mt-1 text-sm text-foreground/70">Bonjour {utilisateur.nom}.</p>}
        </div>
      </section>

      <section aria-label="Actions" className="grid gap-4 sm:grid-cols-2">
        {ACTIONS.map(({ href, titre, texte, icon: Icon }) => (
          <Link key={href} href={href} className="group min-h-11 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="flex h-full items-center gap-4 p-5 transition-colors group-hover:border-primary">
              <Icon className="size-8 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="block text-lg font-semibold text-primary group-hover:underline">{titre}</span>
                <span className="block text-sm text-foreground/70">{texte}</span>
              </span>
            </Card>
          </Link>
        ))}
      </section>

      {recents.length > 0 && (
        <section aria-label="Projets récents" className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-primary">Projets récents</h2>
          <ul className="flex flex-col gap-2">
            {recents.map((p) => (
              <li key={p.id}>
                <Link href={`/projets/${p.id}`} className="block min-h-11">
                  <Card className="flex flex-wrap items-center justify-between gap-2 p-4 hover:border-primary">
                    <span className="truncate font-semibold text-primary">{p.nom}</span>
                    <span className="text-sm text-foreground/70">
                      {p.nbEtudes} étude{p.nbEtudes > 1 ? "s" : ""} · modifié le {dateFR(p.majLe)}
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titre-presentation" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="titre-presentation" className="flex items-center gap-2 text-xl font-bold text-primary">
            <BookOpen className="size-5" aria-hidden />
            Présentation du site
          </h2>
          <div className="flex flex-wrap gap-2">
            <a
              href={PDF}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-primary px-4 text-sm font-medium text-primary hover:bg-muted"
            >
              <ExternalLink className="size-4" aria-hidden />
              Ouvrir en plein écran
            </a>
            <a
              href={PDF}
              download="Presentation-Adequation-Levage.pdf"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Download className="size-4" aria-hidden />
              Télécharger le PDF
            </a>
          </div>
        </div>
        <object data={PDF} type="application/pdf" className="h-[70vh] w-full rounded-lg border border-border bg-white lg:h-[80vh]" aria-label="Présentation du site (PDF)">
          <p className="p-4 text-sm">
            Votre navigateur ne peut pas afficher le PDF.{" "}
            <a href={PDF} target="_blank" rel="noopener" className="font-medium text-primary underline">
              Ouvrir la présentation
            </a>
            .
          </p>
        </object>
      </section>
    </div>
  );
}
