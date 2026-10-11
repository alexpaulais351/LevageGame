"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Download } from "lucide-react";
import { del, get } from "idb-keyval";
import { useRouter } from "next/navigation";

import { importerBrouillon } from "@/actions/brouillon";
import { listerProjets, type ProjetResume } from "@/actions/projets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fusionnerAvecDefauts } from "@/lib/study/defaults";
import type { StudyData } from "@/lib/study/types";
import { CLE_BROUILLON_INVITE, useStudy } from "@/stores/study";

import { ErreurAction } from "./form-bits";

const NOUVEAU = "__nouveau__";

/** Lit le brouillon invité d'IndexedDB (zustand/persist : { state: { data, majLe }, version }). */
async function lireBrouillon(): Promise<StudyData | null> {
  try {
    const brut = await get<string>(CLE_BROUILLON_INVITE);
    if (!brut) return null;
    const { state } = JSON.parse(brut) as { state?: { data?: Partial<StudyData>; majLe?: string | null } };
    if (!state?.majLe) return null; // jamais modifié : pas de brouillon à reprendre
    return fusionnerAvecDefauts(state.data);
  } catch {
    return null;
  }
}

/**
 * Reprise du brouillon invité : propose d'enregistrer l'adéquation en cours dans un projet
 * (existant ou nouveau). Après succès, le brouillon IndexedDB est vidé.
 * - `source="idb"` : pages sans assistant (liste des projets, juste après la connexion) ;
 * - `source="store"` : depuis l'assistant, l'étude du store est utilisée (plus récente que l'IndexedDB).
 */
export function BrouillonInvite({ source, variante = "bandeau" }: { source: "idb" | "store"; variante?: "bandeau" | "bouton" }) {
  const router = useRouter();
  const donneesStore = useStudy((s) => s.data);
  const majStore = useStudy((s) => s.majLe);
  const [brouillonIdb, setBrouillonIdb] = useState<StudyData | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [ignore, setIgnore] = useState(false);
  const [projets, setProjets] = useState<ProjetResume[] | null>(null);
  const [choix, setChoix] = useState(NOUVEAU);
  const [nomProjet, setNomProjet] = useState("");
  const [titre, setTitre] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  useEffect(() => {
    if (source !== "idb") return;
    let actif = true;
    void lireBrouillon().then((d) => actif && setBrouillonIdb(d));
    return () => {
      actif = false;
    };
  }, [source]);

  const draft: StudyData | null = source === "store" ? (majStore ? donneesStore : null) : brouillonIdb;

  const ouvrir = useCallback(() => {
    if (!draft) return;
    setOuvert(true);
    setNomProjet(draft.operation.projet.trim());
    setTitre(draft.charge.designation.trim() || draft.operation.projet.trim() || "Adéquation de levage");
    void listerProjets().then((r) => {
      if (!r.ok) return setErreur(r.error);
      setProjets(r.data);
      setChoix(r.data.length ? r.data[0].id : NOUVEAU);
    });
  }, [draft]);

  // Sur la liste des projets, le bandeau s'ouvre directement (cas « juste après connexion »).
  useEffect(() => {
    if (variante === "bandeau" && draft && !ouvert && !ignore) ouvrir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, variante]);

  if (!draft || ignore) return null;

  const enregistrer = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await importerBrouillon({
        data: draft,
        titre,
        ...(choix === NOUVEAU ? { nouveauProjet: nomProjet } : { projetId: choix }),
      });
      if (!r.ok) return setErreur(r.error);
      // Succès : on vide le brouillon invité (mémoire + IndexedDB).
      useStudy.getState().reinitialiser();
      await del(CLE_BROUILLON_INVITE);
      router.push(`/projets/${r.data.projetId}/etudes/${r.data.etudeId}`);
    });

  if (!ouvert)
    return (
      <Button type="button" variant="outline" size="lg" onClick={ouvrir}>
        <Download />
        Enregistrer dans un projet
      </Button>
    );

  return (
    <Card className="border-primary" role="region" aria-label="Reprise de l'adéquation en cours">
      <CardHeader>
        <CardTitle className="text-primary">Enregistrer l&apos;adéquation en cours dans un projet</CardTitle>
        <CardDescription>
          Une adéquation commencée en mode invité a été trouvée
          {draft.operation.projet ? ` (« ${draft.operation.projet} »)` : ""}. Elle sera enregistrée comme version A d&apos;une nouvelle
          étude, puis retirée de ce navigateur.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            enregistrer();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brouillon-projet">Projet</Label>
              <select
                id="brouillon-projet"
                value={choix}
                onChange={(e) => setChoix(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(projets ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
                <option value={NOUVEAU}>Nouveau projet…</option>
              </select>
            </div>
            {choix === NOUVEAU && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="brouillon-nouveau">Nom du nouveau projet</Label>
                <Input id="brouillon-nouveau" value={nomProjet} onChange={(e) => setNomProjet(e.target.value)} required className="h-11 text-base" />
              </div>
            )}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="brouillon-titre">Titre de l&apos;étude</Label>
              <Input id="brouillon-titre" value={titre} onChange={(e) => setTitre(e.target.value)} required className="h-11 text-base" />
            </div>
          </div>
          <ErreurAction message={erreur} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg" disabled={enCours}>
              {enCours ? "Enregistrement…" : "Enregistrer l'adéquation en cours dans un projet"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setOuvert(false);
                setIgnore(variante === "bandeau");
              }}
            >
              {variante === "bandeau" ? "Plus tard" : "Annuler"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
