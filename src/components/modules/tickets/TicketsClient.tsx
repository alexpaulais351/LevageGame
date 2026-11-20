"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronUp, Inbox, Mail, MessageSquareReply, Plus, Send, Trash2, X } from "lucide-react";

import { creerTicket, supprimerTicket, traiterTicket } from "@/actions/tickets";
import { ErreurAction } from "@/components/modules/account/form-bits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  aTraiter,
  CATEGORIES_TICKET,
  EMAIL_ABAQUES,
  filtrerTickets,
  MAILTO_ABAQUE,
  optionDe,
  peutSupprimer,
  PRIORITES_TICKET,
  STATUTS_TICKET,
  type FiltreTicket,
  type Ticket,
  type Ton,
} from "@/lib/tickets/tickets";
import { cn, formatDateFR } from "@/lib/utils";

const SELECT =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
const TEXTAREA =
  "min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const TON: Record<Ton, { pastille: string; bord: string }> = {
  bleu: { pastille: "border-vinci-bleu bg-vinci-bleu-xlight", bord: "border-l-vinci-bleu" },
  jaune: { pastille: "border-verdict-jaune bg-verdict-jaune-bg", bord: "border-l-verdict-jaune" },
  vert: { pastille: "border-verdict-vert bg-verdict-vert-bg", bord: "border-l-verdict-vert" },
  rouge: { pastille: "border-vinci-rouge bg-vinci-rouge-xlight", bord: "border-l-vinci-rouge" },
  gris: { pastille: "border-vinci-gris bg-vinci-gris-light", bord: "border-l-vinci-gris" },
};

function Pastille({ ton, children }: { ton: Ton; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold text-vinci-bleu-dark", TON[ton].pastille)}>
      {children}
    </span>
  );
}

/** Rappel : un abaque s'envoie aussi par e-mail (le fichier ne transite pas par le ticket). */
function EncartAbaque() {
  return (
    <div role="note" className="flex gap-3 rounded-md border-l-4 border-verdict-jaune bg-verdict-jaune-bg p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-vinci-bleu-dark" aria-hidden />
      <div>
        <p className="font-semibold">Intégration d&apos;abaque : envoyez aussi le fichier par e-mail</p>
        <p className="mt-0.5">
          Envoyez l&apos;abaque (PDF constructeur, tableau…) à{" "}
          <a href={MAILTO_ABAQUE} className="inline-flex items-center gap-1 break-all font-semibold text-primary underline">
            <Mail className="size-3.5 shrink-0" aria-hidden />
            {EMAIL_ABAQUES}
          </a>{" "}
          <strong>et ouvrez quand même le ticket</strong> (type « Intégration d&apos;abaque ») pour suivre la demande. Indiquez-y le nom
          du fichier envoyé et la date de l&apos;e-mail.
        </p>
      </div>
    </div>
  );
}

const VIDE = { titre: "", description: "", categorie: "amelioration", priorite: "normale", page: "" };

function NouveauTicket({ onFermer, onEnvoye }: { onFermer: () => void; onEnvoye: (numero: number) => void }) {
  const router = useRouter();
  const id = useId();
  const [f, setF] = useState(VIDE);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const maj = (k: keyof typeof VIDE) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  const envoyer = (e: React.FormEvent) => {
    e.preventDefault();
    demarrer(async () => {
      setErreur(null);
      const r = await creerTicket(f);
      if (!r.ok) return setErreur(r.error);
      setF(VIDE);
      onEnvoye(r.data.numero);
      router.refresh();
    });
  };

  return (
    <Card className="p-4 sm:p-5">
      <form onSubmit={envoyer} className="flex flex-col gap-4" aria-label="Nouvelle demande">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-primary">Nouvelle demande</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onFermer} aria-label="Fermer le formulaire">
            <X />
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-titre`}>Titre</Label>
          <Input
            id={`${id}-titre`}
            value={f.titre}
            onChange={maj("titre")}
            required
            minLength={3}
            maxLength={160}
            className="h-11 text-base"
            placeholder="Ex. : ajouter le numéro de commande dans l'en-tête de la fiche PDF"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-cat`}>Type de demande</Label>
            <select id={`${id}-cat`} className={SELECT} value={f.categorie} onChange={maj("categorie")}>
              {CATEGORIES_TICKET.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-prio`}>Priorité</Label>
            <select id={`${id}-prio`} className={SELECT} value={f.priorite} onChange={maj("priorite")}>
              {PRIORITES_TICKET.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {f.categorie === "abaque" && <EncartAbaque />}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-page`}>Page ou module concerné (facultatif)</Label>
          <Input
            id={`${id}-page`}
            value={f.page}
            onChange={maj("page")}
            maxLength={300}
            className="h-11 text-base"
            placeholder="Ex. : Adéquation rapide, export PDF, catalogue machines"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-desc`}>Description</Label>
          <textarea
            id={`${id}-desc`}
            rows={6}
            value={f.description}
            onChange={maj("description")}
            required
            minLength={5}
            maxLength={10000}
            className={TEXTAREA}
            placeholder="Ce que vous voulez obtenir, ce qui ne va pas, comment le reproduire…"
          />
        </div>
        <ErreurAction message={erreur} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="lg" onClick={onFermer}>
            Annuler
          </Button>
          <Button type="submit" size="lg" disabled={enCours || f.titre.trim().length < 3 || f.description.trim().length < 5}>
            <Send />
            {enCours ? "Envoi…" : "Envoyer"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Traitement({ t }: { t: Ticket }) {
  const router = useRouter();
  const [statut, setStatut] = useState(t.statut);
  const [priorite, setPriorite] = useState(t.priorite);
  const [reponse, setReponse] = useState(t.reponse ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistre, setEnregistre] = useState(false);
  const [enCours, demarrer] = useTransition();

  const enregistrer = () =>
    demarrer(async () => {
      setErreur(null);
      setEnregistre(false);
      const r = await traiterTicket({ id: t.id, statut, priorite, reponse });
      if (!r.ok) return setErreur(r.error);
      setEnregistre(true);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3 rounded-md border border-primary/30 bg-vinci-bleu-xlight p-3">
      <p className="flex items-center gap-2 text-sm font-bold text-vinci-bleu-dark">
        <MessageSquareReply className="size-4" aria-hidden /> Traitement (administrateur)
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`st-${t.id}`}>Statut</Label>
          <select id={`st-${t.id}`} className={SELECT} value={statut} onChange={(e) => setStatut(e.target.value)}>
            {STATUTS_TICKET.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`pr-${t.id}`}>Priorité</Label>
          <select id={`pr-${t.id}`} className={SELECT} value={priorite} onChange={(e) => setPriorite(e.target.value)}>
            {PRIORITES_TICKET.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`rep-${t.id}`}>Réponse à l&apos;auteur</Label>
        <textarea
          id={`rep-${t.id}`}
          rows={3}
          value={reponse}
          maxLength={10000}
          onChange={(e) => setReponse(e.target.value)}
          className={TEXTAREA}
          placeholder="Visible par l'auteur du ticket"
        />
      </div>
      <ErreurAction message={erreur} />
      <div className="flex flex-wrap items-center justify-end gap-3">
        {enregistre && (
          <span role="status" className="text-sm text-vinci-bleu-dark">
            Ticket mis à jour.
          </span>
        )}
        <Button type="button" onClick={enregistrer} disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}

function Suppression({ t }: { t: Ticket }) {
  const router = useRouter();
  const [aConfirmer, setAConfirmer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const supprimer = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await supprimerTicket(t.id);
      if (!r.ok) return setErreur(r.error);
      router.refresh();
    });

  if (!aConfirmer)
    return (
      <div className="flex justify-end">
        <Button type="button" variant="ghost" className="text-vinci-rouge-dark" onClick={() => setAConfirmer(true)}>
          <Trash2 /> Supprimer
        </Button>
      </div>
    );
  return (
    <div role="alertdialog" aria-label={`Supprimer le ticket n°${t.numero}`} className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <span>Supprimer le ticket n°{t.numero} ?</span>
      <Button type="button" variant="destructive" disabled={enCours} onClick={supprimer}>
        {enCours ? "Suppression…" : "Confirmer"}
      </Button>
      <Button type="button" variant="outline" disabled={enCours} onClick={() => setAConfirmer(false)}>
        Annuler
      </Button>
      <ErreurAction message={erreur} />
    </div>
  );
}

const FILTRES: { v: FiltreTicket; l: string }[] = [
  { v: "a_traiter", l: "À traiter" },
  ...STATUTS_TICKET.map((s) => ({ v: s.value, l: s.label })),
  { v: "tous", l: "Tous" },
];

export function TicketsClient({ tickets, estAdmin, moiId }: { tickets: Ticket[]; estAdmin: boolean; moiId: string }) {
  const [formulaire, setFormulaire] = useState(false);
  const [envoye, setEnvoye] = useState<number | null>(null);
  const [filtre, setFiltre] = useState<FiltreTicket>(estAdmin ? "a_traiter" : "tous");
  const [deplie, setDeplie] = useState<string | null>(null);

  const compte = useMemo(() => {
    const c: Record<string, number> = { tous: tickets.length, a_traiter: tickets.filter(aTraiter).length };
    for (const t of tickets) c[t.statut] = (c[t.statut] ?? 0) + 1;
    return c;
  }, [tickets]);
  const visibles = filtrerTickets(tickets, filtre);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-primary">{estAdmin ? "Tickets" : "Mes demandes"}</h1>
          <p className="text-sm text-foreground/80">
            {estAdmin
              ? "Demandes remontées par les utilisateurs : améliorations, exports, affichage, anomalies, abaques…"
              : "Faites remonter vos demandes à l'administrateur : améliorations, exports, affichage, anomalies, abaques… Vous suivez ici leur traitement."}
          </p>
        </div>
        {!formulaire && (
          <Button
            type="button"
            size="lg"
            onClick={() => {
              setFormulaire(true);
              setEnvoye(null);
            }}
          >
            <Plus /> Nouvelle demande
          </Button>
        )}
      </div>

      {envoye !== null && (
        <p role="status" className="rounded-md border border-primary-light bg-vinci-bleu-xlight px-3 py-2 text-sm text-vinci-bleu-dark">
          Ticket n°{envoye} envoyé à l&apos;administrateur.
        </p>
      )}

      {formulaire && (
        <NouveauTicket
          onFermer={() => setFormulaire(false)}
          onEnvoye={(n) => {
            setEnvoye(n);
            setFormulaire(false);
            setFiltre(estAdmin ? "a_traiter" : "tous");
          }}
        />
      )}

      {!estAdmin && !formulaire && <EncartAbaque />}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les tickets">
        {FILTRES.map((f) => (
          <button
            key={f.v}
            type="button"
            onClick={() => setFiltre(f.v)}
            aria-pressed={filtre === f.v}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors",
              filtre === f.v ? "border-primary bg-primary text-white" : "border-border bg-background text-primary hover:border-primary",
            )}
          >
            {f.l}
            <span className={cn("rounded-full px-2 text-xs", filtre === f.v ? "bg-white text-primary" : "bg-vinci-gris-light")}>{compte[f.v] ?? 0}</span>
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center text-foreground/70">
          <Inbox className="size-8" aria-hidden />
          <p>{tickets.length === 0 ? (estAdmin ? "Aucune demande pour l'instant." : "Vous n'avez encore envoyé aucune demande.") : "Aucun ticket dans ce filtre."}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Liste des tickets">
          {visibles.map((t) => {
            const ouvert = deplie === t.id;
            const st = optionDe(STATUTS_TICKET, t.statut);
            const cat = optionDe(CATEGORIES_TICKET, t.categorie);
            return (
              <li key={t.id}>
                <Card className={cn("overflow-hidden border-l-4 p-0", TON[st.ton].bord)}>
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-vinci-gris-light/60"
                    onClick={() => setDeplie(ouvert ? null : t.id)}
                    aria-expanded={ouvert}
                  >
                    <span className="text-sm font-bold text-foreground/70">n°{t.numero}</span>
                    <span className="min-w-0 flex-1 font-semibold text-primary">{t.titre}</span>
                    <Pastille ton={cat.ton}>{cat.label}</Pastille>
                    {t.priorite === "haute" && <Pastille ton="rouge">Priorité haute</Pastille>}
                    <Pastille ton={st.ton}>{st.label}</Pastille>
                    <span className="text-xs text-foreground/70">
                      {estAdmin ? `${t.auteurNom} · ` : ""}
                      {formatDateFR(t.creeLe)}
                    </span>
                    {ouvert ? <ChevronUp className="size-4 text-primary" aria-hidden /> : <ChevronDown className="size-4 text-primary" aria-hidden />}
                  </button>
                  {ouvert && (
                    <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
                      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="inline font-semibold">Auteur : </dt>
                          <dd className="inline break-all">
                            {t.auteurNom} ({t.auteurEmail})
                          </dd>
                        </div>
                        {t.page && (
                          <div>
                            <dt className="inline font-semibold">Page / module : </dt>
                            <dd className="inline">{t.page}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="inline font-semibold">Priorité : </dt>
                          <dd className="inline">{optionDe(PRIORITES_TICKET, t.priorite).label}</dd>
                        </div>
                        <div>
                          <dt className="inline font-semibold">Mis à jour : </dt>
                          <dd className="inline">{formatDateFR(t.majLe)}</dd>
                        </div>
                      </dl>
                      <p className="whitespace-pre-wrap break-words rounded-md bg-vinci-gris-light p-3 text-sm">{t.description}</p>
                      {t.reponse && !estAdmin && (
                        <div className="rounded-md border-l-4 border-primary bg-vinci-bleu-xlight p-3 text-sm">
                          <p className="mb-1 font-semibold text-vinci-bleu-dark">Réponse de l&apos;administrateur</p>
                          <p className="whitespace-pre-wrap break-words">{t.reponse}</p>
                        </div>
                      )}
                      {estAdmin && <Traitement t={t} />}
                      {peutSupprimer(t, moiId, estAdmin) && <Suppression t={t} />}
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
