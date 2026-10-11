"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, Upload } from "lucide-react";

import { creerConfiguration, modifierConfiguration, remplacerAbaque } from "@/actions/machines";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { construireAbaque, type AbaqueSaisi } from "@/lib/charts/build";
import { CSV_HEADER } from "@/lib/charts/csv";
import { LIGNE_VIDE, type LigneGrille } from "@/lib/charts/grid";
import { PDF_TAILLE_MAX } from "@/lib/machines/files";
import { nombreVersTexte, parseNombreFR } from "@/lib/study/units";
import { cn } from "@/lib/utils";

import { ErreurAction } from "../account/form-bits";
import { ApercuAbaque } from "./ApercuAbaque";
import { RapportValidation } from "./RapportValidation";

const selectClasse =
  "flex h-11 min-h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const SUGGESTIONS = ["Flèche", "Contrepoids", "Calage", "Zone de travail", "Accessoire", "Fléchette", "Mouflage", "Balancier"];
const EXEMPLE_CSV = `${CSV_HEADER}\n3,0,10.5\n4,0,9\n5,0,`;

export interface ConfigExistante {
  id: string;
  label: string;
  params: { cle: string; valeur: string }[];
  moufleKg: number | null;
  notes: string | null;
}

interface Props {
  machineId: string;
  /** Un PDF constructeur est déjà joint à la machine (le fichier n'est alors plus obligatoire). */
  pdfExistant: boolean;
  /** Présent : modification d'une configuration existante (+ remplacement facultatif de l'abaque). */
  existante?: ConfigExistante;
}

function Champ({ label, id, hint, children, className }: { label: string; id: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-primary-light">{hint}</p>}
    </div>
  );
}

/** Colle un tableau (tabulations / retours à la ligne, ex. Excel) dans la grille à partir de la ligne `debut`. */
function collerDansGrille(lignes: LigneGrille[], debut: number, texte: string, avecY: boolean): LigneGrille[] {
  const l = [...lignes];
  texte
    .replace(/\r/g, "")
    .split("\n")
    .filter((r) => r.trim() !== "")
    .forEach((r, i) => {
      const c = r.split(/\t|;/);
      const ligne: LigneGrille = avecY ? { radius: c[0] ?? "", y: c[1] ?? "", capacity: c[2] ?? "" } : { radius: c[0] ?? "", y: "", capacity: c[1] ?? "" };
      l[debut + i] = ligne;
    });
  return l.map((x) => x ?? { ...LIGNE_VIDE });
}

export function ConfigurationForm({ machineId, pdfExistant, existante }: Props) {
  const router = useRouter();
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  // --- Configuration
  const [label, setLabel] = useState(existante?.label ?? "");
  const [params, setParams] = useState<{ cle: string; valeur: string }[]>(existante?.params ?? [{ cle: "", valeur: "" }]);
  const [moufle, setMoufle] = useState(nombreVersTexte(existante?.moufleKg ?? null));
  const [notes, setNotes] = useState(existante?.notes ?? "");

  // --- Abaque
  const [remplacer, setRemplacer] = useState(!existante);
  const [mode, setMode] = useState<"csv" | "grille">("csv");
  const [axisY, setAxisY] = useState<AbaqueSaisi["axisY"]>("boom_length_m");
  const [unit, setUnit] = useState<"kg" | "t">("kg");
  const [csv, setCsv] = useState("");
  const [nomCsv, setNomCsv] = useState<string | null>(null);
  const [grille, setGrille] = useState<LigneGrille[]>(() => Array.from({ length: 6 }, () => ({ ...LIGNE_VIDE })));
  const [standard, setStandard] = useState("");
  const [deductions, setDeductions] = useState(false);
  const [interpolation, setInterpolation] = useState(false);

  // --- Source
  const [titre, setTitre] = useState("");
  const [reference, setReference] = useState("");
  const [edition, setEdition] = useState("");
  const [url, setUrl] = useState("");
  const [editeur, setEditeur] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);

  const abaqueSaisi: AbaqueSaisi = useMemo(
    () => ({ mode, csv, grille, axisY, unit, standard: standard.trim() || null, deductionsIncluded: deductions, interpolationAllowed: interpolation }),
    [mode, csv, grille, axisY, unit, standard, deductions, interpolation],
  );
  const rapport = useMemo(
    () => construireAbaque(abaqueSaisi, { title: titre.trim(), reference: reference.trim() || null, edition: edition.trim() || null, url: url.trim() || null }),
    [abaqueSaisi, titre, reference, edition, url],
  );
  const nbSaisis = rapport.chart.points.length;
  const nbNoeuds = rapport.chart.points.filter((p) => p.capacityKg !== null).length;
  // « Source incomplète » ne bloque pas ; mais sans aucun point l'aperçu n'a pas de sens.
  const peutApercu = nbSaisis > 0 && rapport.errors.length === 0 && nbNoeuds > 0;

  const moufleNum = parseNombreFR(moufle);
  const pdfTropGros = pdf !== null && pdf.size > PDF_TAILLE_MAX;
  const pdfManquant = remplacer && !pdf && !pdfExistant;
  const bloquants: string[] = [];
  if (!label.trim()) bloquants.push("libellé de la configuration");
  if (Number.isNaN(moufleNum)) bloquants.push("masse de moufle (nombre attendu)");
  if (remplacer) {
    if (!titre.trim()) bloquants.push("titre du document constructeur");
    if (pdfManquant) bloquants.push("PDF constructeur");
    if (pdfTropGros) bloquants.push("PDF de 15 Mo maximum");
    if (nbSaisis === 0) bloquants.push("valeurs de l'abaque");
    if (rapport.errors.length > 0) bloquants.push("correction des erreurs de l'abaque");
  }

  const lireCsv = async (f: File | undefined) => {
    if (!f) return;
    setCsv(await f.text());
    setNomCsv(f.name);
  };

  const soumettre = () => {
    setErreur(null);
    if (bloquants.length > 0) return setErreur(`À compléter : ${bloquants.join(", ")}.`);
    const config = {
      label,
      params: params.filter((p) => p.cle.trim() !== "" || p.valeur.trim() !== ""),
      moufleKg: moufleNum,
      notes: notes.trim() || null,
    };
    const source = { documentTitle: titre, reference: reference || null, edition: edition || null, url: url || null, publisher: editeur || null };
    const abaque = { ...abaqueSaisi, csv: mode === "csv" ? csv : "", grille: mode === "grille" ? grille : [] };
    demarrer(async () => {
      if (existante) {
        const m = await modifierConfiguration({ id: existante.id, ...config });
        if (!m.ok) return setErreur(m.error);
        if (remplacer) {
          const fd = new FormData();
          fd.set("payload", JSON.stringify({ configurationId: existante.id, source, abaque }));
          if (pdf) fd.set("pdf", pdf);
          const r = await remplacerAbaque(fd);
          if (!r.ok) return setErreur(r.error);
        }
      } else {
        const fd = new FormData();
        fd.set("payload", JSON.stringify({ machineId, configuration: config, source, abaque }));
        if (pdf) fd.set("pdf", pdf);
        const r = await creerConfiguration(fd);
        if (!r.ok) return setErreur(r.error);
      }
      router.push(`/machines/${machineId}`);
      router.refresh();
    });
  };

  const avecY = axisY !== "none";
  const majLigne = (i: number, k: keyof LigneGrille, v: string) => setGrille((g) => g.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  return (
    <form
      aria-label={existante ? "Modifier la configuration" : "Nouvelle configuration"}
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        soumettre();
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Configuration</CardTitle>
          <CardDescription>Une configuration = un jeu de paramètres pour lequel le constructeur publie un abaque.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ label="Libellé de la configuration" id={id("label")}>
              <Input id={id("label")} className="h-11 text-base" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} placeholder="Ex. Flèche 30 m, contrepoids 12 t, calage 100 %" />
            </Champ>
            <Champ label="Masse de la moufle / du crochet (kg)" id={id("moufle")} hint="Si le constructeur la donne pour cette configuration.">
              <Input id={id("moufle")} inputMode="decimal" className="h-11 text-base" value={moufle} onChange={(e) => setMoufle(e.target.value)} />
            </Champ>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-bold text-primary">Paramètres (champs libres clé / valeur)</legend>
            <datalist id={id("suggestions")}>
              {SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {params.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2" data-testid="ligne-parametre">
                <Champ label={i === 0 ? "Paramètre" : ""} id={id(`pc${i}`)}>
                  <Input id={id(`pc${i}`)} list={id("suggestions")} aria-label={`Paramètre ${i + 1} : nom`} className="h-11 text-base" value={p.cle} maxLength={60} placeholder="Flèche, contrepoids, calage…" onChange={(e) => setParams((l) => l.map((x, j) => (j === i ? { ...x, cle: e.target.value } : x)))} />
                </Champ>
                <Champ label={i === 0 ? "Valeur" : ""} id={id(`pv${i}`)}>
                  <Input id={id(`pv${i}`)} aria-label={`Paramètre ${i + 1} : valeur`} className="h-11 text-base" value={p.valeur} maxLength={200} placeholder="30 m, 12 t, 100 %…" onChange={(e) => setParams((l) => l.map((x, j) => (j === i ? { ...x, valeur: e.target.value } : x)))} />
                </Champ>
                <Button type="button" variant="outline" size="icon" className="size-11" aria-label={`Retirer le paramètre ${i + 1}`} onClick={() => setParams((l) => l.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" className="self-start" onClick={() => setParams((l) => [...l, { cle: "", valeur: "" }])} disabled={params.length >= 30}>
              <Plus />
              Ajouter un paramètre
            </Button>
          </fieldset>
          <Champ label="Notes (facultatif)" id={id("notes")}>
            <Input id={id("notes")} className="h-11 text-base" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          </Champ>
        </CardContent>
      </Card>

      {existante && (
        <label className="flex min-h-11 items-center gap-3 rounded-md border border-border p-3 text-sm font-semibold">
          <input type="checkbox" className="size-5" checked={remplacer} onChange={(e) => setRemplacer(e.target.checked)} />
          Remplacer l&apos;abaque de cette configuration (le nouvel abaque repart « à vérifier »)
        </label>
      )}

      {remplacer && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Abaque</CardTitle>
              <CardDescription>
                Recopiez les valeurs du document constructeur, sans les déduire ni les corriger. Une cellule vide du tableau constructeur reste vide (jamais 0).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Champ label="Second axe de l'abaque" id={id("axe")}>
                  <select id={id("axe")} className={selectClasse} value={axisY} onChange={(e) => setAxisY(e.target.value as AbaqueSaisi["axisY"])}>
                    <option value="boom_length_m">Longueur de flèche (m)</option>
                    <option value="height_m">Hauteur (m)</option>
                    <option value="none">Aucun (une seule courbe)</option>
                  </select>
                </Champ>
                <Champ label="Unité des capacités" id={id("unite")}>
                  <select id={id("unite")} className={selectClasse} value={unit} onChange={(e) => setUnit(e.target.value as "kg" | "t")}>
                    <option value="kg">kg</option>
                    <option value="t">t (converties en kg)</option>
                  </select>
                </Champ>
                <Champ label="Norme de calcul" id={id("norme")} hint="Ex. EN 13000, ISO 10567.">
                  <Input id={id("norme")} className="h-11 text-base" value={standard} onChange={(e) => setStandard(e.target.value)} maxLength={120} />
                </Champ>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <label className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" className="size-5" checked={deductions} onChange={(e) => setDeductions(e.target.checked)} />
                  Capacités déjà nettes des déductions (moufle, crochet…)
                </label>
                <label className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" className="size-5" checked={interpolation} onChange={(e) => setInterpolation(e.target.checked)} />
                  Interpolation autorisée par le constructeur
                </label>
              </div>

              <div role="tablist" aria-label="Mode de saisie de l'abaque" className="inline-flex self-start rounded-md border border-border p-1">
                {(["csv", "grille"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => setMode(m)}
                    className={cn("min-h-11 rounded px-4 text-sm font-semibold", mode === m ? "bg-primary text-primary-foreground" : "text-primary hover:bg-vinci-bleu-xlight")}
                  >
                    {m === "csv" ? "Importer un CSV" : "Saisir dans une grille"}
                  </button>
                ))}
              </div>

              {mode === "csv" ? (
                <div className="flex flex-col gap-2" data-testid="mode-csv">
                  <Champ label={`Fichier CSV (en-tête exact « ${CSV_HEADER} », virgule, décimale point)`} id={id("csv")}>
                    <input
                      id={id("csv")}
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      onChange={(e) => void lireCsv(e.target.files?.[0])}
                      className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-primary file:px-4 file:text-sm file:font-semibold file:text-primary-foreground"
                    />
                  </Champ>
                  {nomCsv && <p className="text-xs text-primary-light">Fichier lu : {nomCsv} (modifiable ci-dessous avant enregistrement).</p>}
                  <Champ label="Contenu CSV" id={id("csvtexte")} hint={`Exemple de format :  ${EXEMPLE_CSV.replace(/\n/g, "  /  ")}  (y = 0 si aucun second axe ; capacité vide = cellule vide du constructeur)`}>
                    <textarea
                      id={id("csvtexte")}
                      value={csv}
                      onChange={(e) => setCsv(e.target.value)}
                      rows={8}
                      spellCheck={false}
                      className="w-full rounded-md border border-input bg-background p-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder={EXEMPLE_CSV}
                    />
                  </Champ>
                </div>
              ) : (
                <div className="flex flex-col gap-2" data-testid="mode-grille">
                  <p className="text-xs text-primary-light">Astuce : collez un tableau copié depuis Excel dans la première cellule. Virgule ou point acceptés pour les décimales.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-primary text-primary-foreground">
                          <th className="p-2 text-left font-bold">Portée (m)</th>
                          {avecY && <th className="p-2 text-left font-bold">{axisY === "height_m" ? "Hauteur (m)" : "Flèche (m)"}</th>}
                          <th className="p-2 text-left font-bold">Capacité ({unit})</th>
                          <th className="w-12 p-2"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {grille.map((l, i) => (
                          <tr key={i} className={i % 2 ? "bg-vinci-gris-light" : "bg-white"} data-testid="ligne-grille">
                            {(["radius", ...(avecY ? ["y"] : []), "capacity"] as (keyof LigneGrille)[]).map((k) => (
                              <td key={k} className="p-1">
                                <Input
                                  aria-label={`Ligne ${i + 1} : ${k === "radius" ? "portée" : k === "y" ? "flèche ou hauteur" : "capacité"}`}
                                  inputMode="decimal"
                                  className="h-11 text-base"
                                  value={l[k]}
                                  onChange={(e) => majLigne(i, k, e.target.value)}
                                  onPaste={(e) => {
                                    const t = e.clipboardData.getData("text");
                                    if (/[\n\t]/.test(t.trim())) {
                                      e.preventDefault();
                                      setGrille((g) => collerDansGrille(g, i, t, avecY));
                                    }
                                  }}
                                />
                              </td>
                            ))}
                            <td className="p-1">
                              <Button type="button" variant="outline" size="icon" className="size-11" aria-label={`Supprimer la ligne ${i + 1}`} onClick={() => setGrille((g) => g.filter((_, j) => j !== i))}>
                                <Trash2 />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setGrille((g) => [...g, { ...LIGNE_VIDE }])}>
                      <Plus />
                      Ajouter une ligne
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setGrille((g) => [...g, ...Array.from({ length: 5 }, () => ({ ...LIGNE_VIDE }))])}>
                      <Plus />
                      Ajouter 5 lignes
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Source du document constructeur</CardTitle>
              <CardDescription>Le PDF constructeur est obligatoire : il permet de contrôler chaque valeur avant de marquer l&apos;abaque comme vérifié.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Champ label="Titre du document" id={id("titre")}>
                  <Input id={id("titre")} className="h-11 text-base" value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={250} />
                </Champ>
                <Champ label="Référence" id={id("ref")}>
                  <Input id={id("ref")} className="h-11 text-base" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} />
                </Champ>
                <Champ label="Édition" id={id("ed")}>
                  <Input id={id("ed")} className="h-11 text-base" value={edition} onChange={(e) => setEdition(e.target.value)} maxLength={120} />
                </Champ>
                <Champ label="Éditeur / constructeur" id={id("edit")}>
                  <Input id={id("edit")} className="h-11 text-base" value={editeur} onChange={(e) => setEditeur(e.target.value)} maxLength={160} />
                </Champ>
                <Champ label="URL du document" id={id("url")} className="sm:col-span-2">
                  <Input id={id("url")} type="url" inputMode="url" className="h-11 text-base" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={500} placeholder="https://…" />
                </Champ>
              </div>
              <Champ
                label={pdfExistant ? "PDF constructeur (déjà joint — facultatif pour le remplacer)" : "PDF constructeur (obligatoire, 15 Mo maximum)"}
                id={id("pdf")}
                hint={pdf ? `${pdf.name} — ${pdf.size >= 1_048_576 ? `${nombreVersTexte(Number((pdf.size / 1_048_576).toFixed(1)))} Mo` : `${Math.max(1, Math.round(pdf.size / 1024))} Ko`}` : undefined}
              >
                <input
                  id={id("pdf")}
                  name="pdf"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-primary file:px-4 file:text-sm file:font-semibold file:text-primary-foreground"
                />
              </Champ>
              {pdfTropGros && <p role="alert" className="text-sm font-medium text-vinci-rouge-dark">Le PDF dépasse 15 Mo.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Prévisualisation avant enregistrement</CardTitle>
              <CardDescription>Courbe en escalier telle qu&apos;elle sera lue : entre deux nœuds, valeur la plus défavorable ; aucune extrapolation.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {nbSaisis === 0 ? (
                <p role="status" className="rounded-md bg-vinci-bleu-xlight p-3 text-sm">
                  Importez un CSV ou remplissez la grille : la courbe et le rapport de validation apparaissent ici.
                </p>
              ) : (
                <>
                  {peutApercu ? <ApercuAbaque chart={rapport.chart} /> : null}
                  <RapportValidation rapport={rapport} nbNoeuds={nbNoeuds} />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground/80">
          Statut à l&apos;enregistrement : <strong>À vérifier</strong>. Vous pourrez le marquer « vérifié » après avoir contrôlé chaque valeur contre le document constructeur.
        </p>
        <ErreurAction message={erreur} />
        <Button type="submit" size="lg" className="self-start" disabled={enCours}>
          {existante ? <Save /> : <Upload />}
          {enCours ? "Enregistrement…" : existante ? "Enregistrer la configuration" : "Enregistrer la configuration et son abaque"}
        </Button>
      </div>
    </form>
  );
}
