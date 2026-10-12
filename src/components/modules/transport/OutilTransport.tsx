"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileDown, FileText, Info, Truck, XCircle } from "lucide-react";

import { CheckboxField, NumberField, SelectField, TextField, UNITES_MASSE, UnitNumberField } from "@/components/modules/wizard/fields";
import { Button } from "@/components/ui/button";
import { useExportSyntheseTransport } from "@/hooks/useExportPDF";
import { buildTransportPdfModel, nomFichierSyntheseTransport } from "@/lib/pdf/transport-model";
import { classerVehicules, erreursPiece, LIBELLE_CATEGORIE, type Categorie, type EvaluationVehicule, type PieceTransport } from "@/engine/transport";
import { TYPES_PIECES, typePiece, VEHICULES } from "@/lib/transport/catalogue";
import { demarches } from "@/lib/transport/demarches";
import { donneesDemande, nomFichierDemande, type Demandeur, type ProjetTransport } from "@/lib/transport/demande";
import { cn, formatMasse, formatNombreFR } from "@/lib/utils";

import { CompositionConvoi, VueCote, VueDessus } from "./SchemaConvoi";

const STYLE_CATEGORIE: Record<Categorie, string> = {
  standard: "border-verdict-vert bg-verdict-vert-bg",
  te1: "border-verdict-jaune bg-verdict-jaune-bg",
  te2: "border-verdict-rouge bg-verdict-rouge-bg",
  te3: "border-verdict-rouge bg-verdict-rouge-bg",
};

const m = (v: number) => `${formatNombreFR(v, 2).replace(/,00$/, "")} m`;

export interface SaisieInitiale {
  type?: string;
  longueurM?: number;
  largeurM?: number;
  hauteurM?: number;
  masseKg?: number;
  designation?: string;
  projetId?: string;
}

export interface ContexteTransport {
  demandeur: Demandeur;
  projets: ProjetTransport[];
}

export function OutilTransport({ initial, contexte }: { initial: SaisieInitiale; contexte: ContexteTransport }) {
  const depart = typePiece(initial.type ?? (initial.longueurM ? "autre" : "poutre-beton"));
  const [typeId, setTypeId] = useState(depart.id);
  const [p, setP] = useState<Record<keyof PieceTransport, number | null>>({
    longueurM: initial.longueurM ?? depart.exemple.longueurM,
    largeurM: initial.largeurM ?? depart.exemple.largeurM,
    hauteurM: initial.hauteurM ?? depart.exemple.hauteurM,
    masseKg: initial.masseKg ?? depart.exemple.masseKg,
  });
  const [indivisible, setIndivisible] = useState(true);
  const [choix, setChoix] = useState<string | null>(null);
  const [projetId, setProjetId] = useState<string>(initial.projetId && contexte.projets.some((x) => x.id === initial.projetId) ? initial.projetId : "");
  const [trajet, setTrajet] = useState({ depart: "", dates: "", voyages: "1" });
  const [generation, setGeneration] = useState<"repos" | "en_cours" | "erreur">("repos");
  const schemasRef = useRef<HTMLDivElement>(null);

  const type = typePiece(typeId);
  const erreurs = erreursPiece({ longueurM: p.longueurM ?? undefined, largeurM: p.largeurM ?? undefined, hauteurM: p.hauteurM ?? undefined, masseKg: p.masseKg ?? undefined });
  const piece = erreurs.length === 0 ? (p as PieceTransport) : null;
  const classement = useMemo(() => {
    if (!piece) return [];
    // À contrainte égale, les familles habituelles du type de pièce passent devant.
    return classerVehicules(piece, VEHICULES, type.vehicules);
  }, [piece, type]);
  const possibles = classement.filter((e) => e.possible);
  const ev = possibles.find((e) => e.vehicule.id === choix) ?? possibles[0] ?? null;

  const exportPdf = useExportSyntheseTransport();
  const exporterSynthese = () =>
    exportPdf.exporter(async () => {
      if (!piece || !ev) throw new Error("saisie incomplète");
      const { svgEnPng, pngEnDataUri } = await import("@/lib/transport/svg-png");
      const svgs = [...(schemasRef.current?.querySelectorAll<SVGSVGElement>("svg[data-schema]") ?? [])];
      const images = (await Promise.all(svgs.map((x) => svgEnPng(x)))).filter((x) => x !== null);
      const projet = contexte.projets.find((x) => x.id === projetId) ?? null;
      const date = new Date();
      const model = buildTransportPdfModel({
        ev,
        classement,
        piece,
        typePiece: type.nom,
        designation: initial.designation ?? null,
        indivisible,
        conseils: type.conseils,
        demandeur: contexte.demandeur,
        projet,
        schemas: images.map((i) => ({ dataUri: pngEnDataUri(i), ratio: i.hauteur / i.largeur })),
        date,
      });
      return { model, nom: nomFichierSyntheseTransport({ projet: projet?.nom, piece: initial.designation || type.nom, date }) };
    });

  const telecharger = async () => {
    if (!piece || !ev) return;
    setGeneration("en_cours");
    try {
      const [{ genererDemandeDocx }, { svgEnPng }] = await Promise.all([import("@/lib/transport/demande-docx"), import("@/lib/transport/svg-png")]);
      const svgs = [...(schemasRef.current?.querySelectorAll<SVGSVGElement>("svg[data-schema]") ?? [])];
      const schemas = (await Promise.all(svgs.map((x) => svgEnPng(x)))).filter((x) => x !== null);
      const projet = contexte.projets.find((x) => x.id === projetId) ?? null;
      const blob = await genererDemandeDocx(
        donneesDemande({ ev, piece, typePiece: type.nom, designation: initial.designation ?? null, indivisible, demandeur: contexte.demandeur, projet, trajet, schemas }),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomFichierDemande(projet?.nom ?? null, initial.designation || type.nom);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setGeneration("repos");
    } catch {
      setGeneration("erreur");
    }
  };

  const choisirType = (id: string) => {
    const t = typePiece(id);
    setTypeId(id);
    setP({ ...t.exemple });
    setIndivisible(id !== "engin");
    setChoix(null);
  };
  const champ = (k: keyof PieceTransport) => (v: number | null) => setP((x) => ({ ...x, [k]: v }));

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="t-piece" className="rounded-lg border border-border p-4">
        <h2 id="t-piece" className="mb-3 text-lg font-bold text-primary">
          1. Pièce à transporter{initial.designation ? ` — ${initial.designation}` : ""}
        </h2>
        <div role="radiogroup" aria-label="Type de pièce" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {TYPES_PIECES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === typeId}
              onClick={() => choisirType(t.id)}
              className={cn(
                "min-h-16 rounded-md border px-3 py-2 text-left text-sm font-semibold",
                t.id === typeId ? "border-primary bg-vinci-bleu-xlight text-primary" : "border-border hover:border-primary",
              )}
            >
              {t.nom}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <NumberField label="Longueur" unite="m" value={p.longueurM} onChange={champ("longueurM")} />
          <NumberField label={type.id === "voile" ? "Épaisseur (largeur)" : "Largeur"} unite="m" value={p.largeurM} onChange={champ("largeurM")} />
          <NumberField label="Hauteur" unite="m" value={p.hauteurM} onChange={champ("hauteurM")} hint="Hauteur de la pièce posée, sans le camion." />
          <UnitNumberField label="Masse" unites={UNITES_MASSE} uniteInitiale={1} value={p.masseKg} onChange={champ("masseKg")} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SelectField
                label="Projet (chantier de destination)"
                value={projetId}
                onChange={setProjetId}
                options={[{ value: "", label: "Aucun projet" }, ...contexte.projets.map((x) => ({ value: x.id, label: x.nom }))]}
              />
        </div>
        <CheckboxField
          className="mt-2"
          label="Charge indivisible (ne peut pas être démontée ou fractionnée pour le transport)"
          checked={indivisible}
          onChange={setIndivisible}
        />
        <ul className="mt-2 list-disc pl-5 text-sm text-foreground/80">
          {type.conseils.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        {erreurs.length > 0 && (
          <p role="alert" className="mt-2 text-sm font-medium text-vinci-rouge-dark">
            {erreurs.join(" ")}
          </p>
        )}
      </section>

      {piece && ev && (
        <>
          <section aria-labelledby="t-verdict" className={cn("rounded-lg border-2 p-4", STYLE_CATEGORIE[ev.categorie!])} data-testid="verdict-transport">
            <p className="text-xs font-bold uppercase tracking-wide text-foreground/70">Avec : {ev.vehicule.nom}</p>
            <h2 id="t-verdict" className="text-2xl font-bold text-primary">
              {LIBELLE_CATEGORIE[ev.categorie!]}
            </h2>
            <p className="mt-1 text-sm">
              Convoi : {m(ev.encombrement!.longueurM)} × {m(ev.encombrement!.largeurM)} × {m(ev.encombrement!.hauteurM)} de haut —{" "}
              {formatMasse(ev.encombrement!.masseKg)} en charge (estimation : tare indicative + pièce).
            </p>
            <ul className="mt-1 text-sm text-foreground/80">
              {ev.criteres.map((c) => (
                <li key={c}>• {c}</li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {badges(ev, indivisible).map((b) => (
                <span key={b.texte} className={cn("inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-sm font-bold text-white", b.ok ? "bg-verdict-vert" : "bg-vinci-bleu")}>
                  {b.ok ? <CheckCircle2 className="size-4" aria-hidden /> : <AlertTriangle className="size-4" aria-hidden />}
                  {b.texte}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="button" size="lg" disabled={exportPdf.enCours} onClick={() => void exporterSynthese()} data-testid="exporter-synthese-transport">
                <FileText />
                {exportPdf.enCours ? "Préparation du PDF…" : "Exporter la synthèse PDF"}
              </Button>
              {exportPdf.erreur && (
                <span role="alert" className="text-sm font-medium text-vinci-rouge-dark">
                  {exportPdf.erreur}
                </span>
              )}
            </div>
          </section>

          <section aria-labelledby="t-schema" className="rounded-lg border border-border p-4" ref={schemasRef as React.Ref<HTMLElement>}>
            <h2 id="t-schema" className="mb-2 text-lg font-bold text-primary">
              2. Schémas du convoi (à l&apos;échelle)
            </h2>
            <VueCote piece={piece} ev={ev} />
            <VueDessus piece={piece} ev={ev} />
            <h3 className="mt-3 font-bold text-primary">Composition du convoi</h3>
            <CompositionConvoi ev={ev} />
            <ul className="mt-1 text-sm text-foreground/80">
              {ev.accompagnement!.motifs.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
            {ev.alertesHauteur.length > 0 && (
              <ul className="mt-3 rounded-md border border-vinci-rouge bg-vinci-rouge-xlight p-3 text-sm text-vinci-rouge-dark">
                {ev.alertesHauteur.map((x) => (
                  <li key={x}>• {x}</li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="t-demarches" className="rounded-lg border border-border p-4">
            <h2 id="t-demarches" className="mb-3 text-lg font-bold text-primary">
              3. Démarches et règles
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              {demarches(ev.categorie!, ev.encombrement!, { chargeIndivisible: indivisible }).map((r) => (
                <div key={r.titre} className="rounded-md bg-vinci-gris-light p-3 text-sm">
                  <h3 className="mb-1 font-bold text-primary">{r.titre}</h3>
                  <ul className="flex flex-col gap-1">
                    {r.lignes.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="t-vehicules" className="rounded-lg border border-border p-4">
            <h2 id="t-vehicules" className="text-lg font-bold text-primary">
              4. Véhicules possibles
            </h2>
            <p className="mb-3 text-sm text-foreground/80">Cliquez sur un véhicule pour mettre à jour le verdict et les schémas. Caractéristiques indicatives.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-vinci-bleu text-white">
                    <th className="px-3 py-2 font-bold">Véhicule</th>
                    <th className="px-3 py-2 font-bold">Plateau</th>
                    <th className="px-3 py-2 text-right font-bold">Plancher</th>
                    <th className="px-3 py-2 text-right font-bold">Charge utile</th>
                    <th className="px-3 py-2 font-bold">Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {classement.map((e, i) => {
                    const actif = e.possible && e.vehicule.id === ev.vehicule.id;
                    const v = e.vehicule;
                    return (
                      <tr
                        key={v.id}
                        className={cn(i % 2 === 1 ? "bg-vinci-gris-light" : "bg-background", actif && "outline outline-2 outline-primary", e.possible && "cursor-pointer hover:bg-vinci-bleu-xlight")}
                        onClick={() => e.possible && setChoix(v.id)}
                        data-testid="ligne-vehicule"
                      >
                        <td className="px-3 py-2">
                          <button type="button" disabled={!e.possible} onClick={() => setChoix(v.id)} className="flex min-h-11 items-start gap-2 text-left disabled:cursor-not-allowed">
                            <Truck className={cn("mt-0.5 size-4 shrink-0", e.possible ? "text-primary" : "text-vinci-gris")} aria-hidden />
                            <span>
                              <span className="font-bold text-primary">{v.nom}</span>
                              {type.vehicules.includes(v.id) && <span className="ml-1 rounded bg-vinci-bleu-xlight px-1 text-xs font-semibold text-primary">habituel</span>}
                              <span className="block text-xs text-foreground/70">{v.description}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {v.plateauMaxM > v.plateauM ? `${m(v.plateauM)} → ${m(v.plateauMaxM)}` : m(v.plateauM)} × {m(v.plateauLargeurM)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{m(v.hauteurPlancherM)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMasse(v.chargeUtileKg)}</td>
                        <td className="px-3 py-2">
                          {e.possible ? (
                            <span className="inline-flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="size-4 text-verdict-vert" aria-hidden />
                              {LIBELLE_CATEGORIE[e.categorie!]}
                              {e.alertesHauteur.length > 0 && <span className="text-vinci-rouge-dark"> · {m(e.encombrement!.hauteurM)} de haut</span>}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-foreground/70">
                              <XCircle className="size-4 text-vinci-rouge" aria-hidden />
                              {e.raisonsImpossible.join(" ; ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section aria-labelledby="t-demande" className="rounded-lg border border-border p-4">
            <h2 id="t-demande" className="text-lg font-bold text-primary">
              5. Demande administrative (Word)
            </h2>
            <p className="mb-3 text-sm text-foreground/80">
              Projet de demande pré-rempli avec le projet (choisi à l&apos;étape 1), la pièce, le convoi et les schémas, à reporter sur le formulaire officiel (Cerfa) ou la
              téléprocédure de la DDT du département de départ.
            </p>
            <div className="grid gap-4 md:grid-cols-2">

              <TextField label="Point de départ (usine, dépôt…)" value={trajet.depart} onChange={(v) => setTrajet((x) => ({ ...x, depart: v }))} placeholder="Ville ou adresse" />
              <TextField label="Dates / période souhaitées" value={trajet.dates} onChange={(v) => setTrajet((x) => ({ ...x, dates: v }))} placeholder="Ex. semaine 46, de nuit exclu" />
              <TextField label="Nombre de voyages" value={trajet.voyages} onChange={(v) => setTrajet((x) => ({ ...x, voyages: v }))} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="button" size="lg" disabled={generation === "en_cours"} onClick={() => void telecharger()} data-testid="telecharger-demande">
                <FileDown />
                {generation === "en_cours" ? "Préparation…" : "Télécharger la demande (Word)"}
              </Button>
              {generation === "erreur" && (
                <span role="alert" className="text-sm font-medium text-vinci-rouge-dark">
                  Le document n&apos;a pas pu être généré. Réessayez.
                </span>
              )}
            </div>
          </section>
        </>
      )}

      {piece && !ev && (
        <p role="alert" className="rounded-md border border-vinci-rouge bg-vinci-rouge-xlight p-4 text-vinci-rouge-dark">
          Aucun véhicule type ne convient : transport spécial à étudier avec un transporteur spécialisé (convoi modulaire, remorque autopropulsée…).
        </p>
      )}

      <p className="flex items-start gap-2 rounded-md bg-vinci-bleu-xlight p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        Aide à la préparation : catégories selon l&apos;arrêté du 4 mai 2006 modifié et le Code de la route (R.312-10 s., R.433-1 s.). Les règles
        d&apos;accompagnement modifiées en 2024 sont appliquées dans leur lecture la plus prudente. Caractéristiques des véhicules indicatives : le
        transporteur et la DDT confirment le convoi, l&apos;itinéraire et les autorisations.
      </p>
    </div>
  );
}

/** Résumé en deux pastilles : voiture pilote, démarche administrative. */
function badges(ev: EvaluationVehicule, indivisible: boolean): { ok: boolean; texte: string }[] {
  const a = ev.accompagnement!;
  const escorte = a.pilote || a.protectionArriere || a.guidage;
  const demarche =
    ev.categorie === "standard"
      ? { ok: true, texte: "Ni déclaration ni autorisation" }
      : ev.categorie === "te1" && indivisible
        ? { ok: false, texte: "Déclaration (réseau 1TE) ou autorisation" }
        : { ok: false, texte: "Autorisation préfectorale" };
  return [
    escorte ? { ok: false, texte: a.guidage ? "Voiture pilote + guidage" : "Voiture pilote nécessaire" } : { ok: true, texte: "Pas de voiture pilote" },
    demarche,
  ];
}
