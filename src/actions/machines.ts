"use server";

/**
 * Machines personnelles de l'utilisateur connecté : machine, configurations, abaque (CSV ou grille),
 * photo et PDF constructeur. Jamais d'écriture sur le catalogue public : chaque action vérifie
 * explicitement `owner_id = utilisateur` EN PLUS de la RLS (défense en profondeur).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";

import { echec, ok, type ActionResult, type EtatForm } from "@/lib/account/result";
import { idEntiteSchema, premiereErreur } from "@/lib/account/schemas";
import { construireAbaque } from "@/lib/charts/build";
import { cheminPhoto, cheminSourcePdf, validerPdf, validerPhoto, type ResultatFichier } from "@/lib/machines/files";
import {
  chartRefSchema,
  configurationAvecAbaqueSchema,
  configurationModifSchema,
  machineModifSchema,
  machinePersoSchema,
  paramsVersJson,
  remplacerAbaqueSchema,
  specsVersJson,
  verifierSchema,
  abaqueSaisiSchema,
  sourceSaisieSchema,
} from "@/lib/machines/schemas";
import { ACCES_REFUSE, contexteApprouve, type Contexte } from "@/lib/supabase/session";

const CONNEXION = ACCES_REFUSE;
const MACHINE_INTROUVABLE = "Machine introuvable (ou non modifiable).";
const ECHEC_GENERIQUE = "L'enregistrement a échoué. Réessayez.";
const BUCKET = "user-files";

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function lirePayload(fd: FormData): unknown {
  const brut = fd.get("payload");
  if (typeof brut !== "string") return null;
  try {
    return JSON.parse(brut);
  } catch {
    return null;
  }
}

function fichierDe(fd: FormData, nom: string): File | null {
  const f = fd.get(nom);
  return f instanceof File && f.size > 0 ? f : null;
}

async function verifierFichier(f: File, valider: typeof validerPhoto): Promise<ResultatFichier> {
  const entete = new Uint8Array(await f.slice(0, 16).arrayBuffer());
  return valider({ type: f.type, size: f.size, entete });
}

function revalider(machineId?: string) {
  revalidatePath("/machines");
  if (machineId) revalidatePath(`/machines/${machineId}`);
}

/** Machine appartenant à l'utilisateur (jamais une machine du catalogue public, owner_id NULL). */
async function machineAutorisee(supabase: SupabaseClient, uid: string, id: string) {
  const { data } = await supabase.from("machines").select("id,owner_id").eq("id", id).eq("owner_id", uid).maybeSingle();
  return data && data.owner_id === uid ? { id: data.id as string } : null;
}

async function configurationAutorisee(supabase: SupabaseClient, uid: string, id: string) {
  const { data } = await supabase.from("machine_configurations").select("id,machine_id").eq("id", id).maybeSingle();
  if (!data) return null;
  const m = await machineAutorisee(supabase, uid, data.machine_id as string);
  return m ? { id: data.id as string, machineId: m.id } : null;
}

async function abaqueAutorise(supabase: SupabaseClient, uid: string, chartId: string) {
  const { data } = await supabase.from("load_charts").select("id,configuration_id,source_id").eq("id", chartId).maybeSingle();
  if (!data) return null;
  const c = await configurationAutorisee(supabase, uid, data.configuration_id as string);
  return c ? { id: data.id as string, configurationId: c.id, machineId: c.machineId, sourceId: data.source_id as string | null } : null;
}

/** Supprime les sources personnelles qui ne sont plus référencées par aucun abaque. */
async function nettoyerSources(supabase: SupabaseClient, uid: string, ids: (string | null)[]) {
  for (const id of new Set(ids.filter((x): x is string => Boolean(x)))) {
    const { count } = await supabase.from("load_charts").select("id", { count: "exact", head: true }).eq("source_id", id);
    if (!count) await supabase.from("chart_sources").delete().eq("id", id).eq("owner_id", uid);
  }
}

/** Dépose (ou remplace) la photo de la machine : stockage + pièce jointe `photo`. */
async function deposerPhoto(ctx: Contexte, machineId: string, f: File): Promise<string | null> {
  const { supabase, user } = ctx;
  const v = await verifierFichier(f, validerPhoto);
  if (!v.ok) return v.error;
  const chemin = cheminPhoto(user.id, machineId, v.ext);
  const { data: anciennes } = await supabase.from("attachments").select("file_path").eq("machine_id", machineId).eq("kind", "photo");
  const { error } = await supabase.storage.from(BUCKET).upload(chemin, f, { upsert: true, contentType: v.mime });
  if (error) return "Le téléversement de la photo a échoué.";
  await supabase.from("attachments").delete().eq("machine_id", machineId).eq("kind", "photo");
  const { error: errPj } = await supabase
    .from("attachments")
    .insert({ owner_id: user.id, machine_id: machineId, kind: "photo", file_path: chemin, mime: v.mime });
  if (errPj) return "L'enregistrement de la photo a échoué.";
  const obsoletes = (anciennes ?? []).map((a) => a.file_path as string).filter((p) => p !== chemin);
  if (obsoletes.length) await supabase.storage.from(BUCKET).remove(obsoletes);
  return null;
}

async function retirerPhoto(ctx: Contexte, machineId: string) {
  const { supabase } = ctx;
  const { data } = await supabase.from("attachments").select("file_path").eq("machine_id", machineId).eq("kind", "photo");
  const chemins = (data ?? []).map((a) => a.file_path as string);
  await supabase.from("attachments").delete().eq("machine_id", machineId).eq("kind", "photo");
  if (chemins.length) await supabase.storage.from(BUCKET).remove(chemins);
}

/** PDF constructeur de la machine (un seul `source.pdf` par machine, partagé par ses abaques). */
async function pdfExistant(supabase: SupabaseClient, machineId: string): Promise<string | null> {
  const { data } = await supabase.from("attachments").select("file_path").eq("machine_id", machineId).eq("kind", "pdf_constructeur").limit(1);
  return (data?.[0]?.file_path as string | undefined) ?? null;
}

async function deposerPdf(ctx: Contexte, machineId: string, f: File): Promise<{ chemin: string } | { erreur: string }> {
  const { supabase, user } = ctx;
  const v = await verifierFichier(f, validerPdf);
  if (!v.ok) return { erreur: v.error };
  const chemin = cheminSourcePdf(user.id, machineId);
  const { error } = await supabase.storage.from(BUCKET).upload(chemin, f, { upsert: true, contentType: "application/pdf" });
  if (error) return { erreur: "Le téléversement du PDF constructeur a échoué." };
  await supabase.from("attachments").delete().eq("machine_id", machineId).eq("kind", "pdf_constructeur");
  const { error: errPj } = await supabase
    .from("attachments")
    .insert({ owner_id: user.id, machine_id: machineId, kind: "pdf_constructeur", file_path: chemin, mime: "application/pdf" });
  if (errPj) return { erreur: "L'enregistrement du PDF constructeur a échoué." };
  return { chemin };
}

/**
 * Valide, puis enregistre source + abaque + nœuds pour une configuration (statut `a_verifier`).
 * Compensation en cas d'échec partiel (PostgREST n'a pas de transaction multi-requêtes).
 * Retourne l'identifiant de l'abaque créé.
 */
async function enregistrerAbaque(
  ctx: Contexte,
  machineId: string,
  configurationId: string,
  entree: { source: z.infer<typeof sourceSaisieSchema>; abaque: z.infer<typeof abaqueSaisiSchema> },
  pdf: File | null,
): Promise<ActionResult<{ chartId: string }>> {
  const { supabase, user } = ctx;
  const { source, abaque } = entree;

  const rapport = construireAbaque(
    abaque,
    { title: source.documentTitle, reference: source.reference, edition: source.edition, url: source.url },
    "nouveau",
  );
  if (rapport.errors.length > 0) {
    const suite = rapport.errors.length > 3 ? ` (+ ${rapport.errors.length - 3} autre(s))` : "";
    return echec(`Abaque invalide : ${rapport.errors.slice(0, 3).join(" ; ")}${suite}`);
  }

  // PDF constructeur obligatoire : fichier fourni, ou déjà joint à la machine.
  let cheminPdf = await pdfExistant(supabase, machineId);
  if (pdf) {
    const d = await deposerPdf(ctx, machineId, pdf);
    if ("erreur" in d) return echec(d.erreur);
    cheminPdf = d.chemin;
  }
  if (!cheminPdf) return echec("Le PDF constructeur est obligatoire : joignez le document source de l'abaque.");

  const { data: src, error: errSrc } = await supabase
    .from("chart_sources")
    .insert({
      owner_id: user.id,
      document_title: source.documentTitle,
      reference: source.reference,
      edition: source.edition,
      url: source.url,
      publisher: source.publisher,
      file_path: cheminPdf,
    })
    .select("id")
    .single();
  if (errSrc || !src) return echec(ECHEC_GENERIQUE);

  const { data: chart, error: errChart } = await supabase
    .from("load_charts")
    .insert({
      configuration_id: configurationId,
      axis_y: abaque.axisY,
      unit: "kg",
      standard: abaque.standard,
      deductions_included: abaque.deductionsIncluded,
      interpolation_allowed: abaque.interpolationAllowed,
      status: "a_verifier",
      source_id: src.id,
      entered_by: user.id,
    })
    .select("id")
    .single();
  if (errChart || !chart) {
    await supabase.from("chart_sources").delete().eq("id", src.id).eq("owner_id", user.id);
    return echec(ECHEC_GENERIQUE);
  }

  // Cellule vide = absence de nœud (jamais 0).
  const noeuds = rapport.chart.points
    .filter((p) => p.capacityKg !== null)
    .map((p) => ({ chart_id: chart.id, x: p.x, y: abaque.axisY === "none" ? 0 : (p.y ?? 0), capacity_kg: p.capacityKg }));
  if (noeuds.length === 0) {
    await supabase.from("load_charts").delete().eq("id", chart.id);
    await supabase.from("chart_sources").delete().eq("id", src.id).eq("owner_id", user.id);
    return echec("Abaque invalide : aucune capacité renseignée (toutes les cellules sont vides).");
  }
  const { error: errPts } = await supabase.from("load_chart_points").insert(noeuds);
  if (errPts) {
    await supabase.from("load_charts").delete().eq("id", chart.id);
    await supabase.from("chart_sources").delete().eq("id", src.id).eq("owner_id", user.id);
    return echec("L'enregistrement des valeurs de l'abaque a échoué.");
  }
  return ok({ chartId: chart.id as string });
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

/** Création d'une machine personnelle. FormData : `payload` (JSON) + `photo` (optionnelle). Redirige vers la fiche. */
export async function creerMachine(_prev: EtatForm, formData: FormData): Promise<EtatForm> {
  const ctx = await contexteApprouve();
  if (!ctx) return { error: CONNEXION };
  const p = machinePersoSchema.safeParse(lirePayload(formData));
  if (!p.success) return { error: premiereErreur(p.error) };
  const photo = fichierDe(formData, "photo");
  if (photo) {
    const v = await verifierFichier(photo, validerPhoto);
    if (!v.ok) return { error: v.error };
  }
  const { supabase, user } = ctx;
  const { data, error } = await supabase
    .from("machines")
    .insert({
      owner_id: user.id,
      type_id: p.data.typeId,
      manufacturer_id: p.data.manufacturerId,
      model: p.data.model,
      specs: specsVersJson(p.data.specs),
    })
    .select("id")
    .single();
  if (error || !data) return { error: "La création de la machine a échoué (type ou constructeur invalide ?)." };
  const id = data.id as string;
  if (photo) {
    const err = await deposerPhoto(ctx, id, photo);
    if (err) {
      await supabase.from("machines").delete().eq("id", id).eq("owner_id", user.id);
      return { error: err };
    }
  }
  revalider(id);
  redirect(`/machines/${id}`);
}

/** Modification d'une machine personnelle (caractéristiques, photo). Redirige vers la fiche. */
export async function modifierMachine(_prev: EtatForm, formData: FormData): Promise<EtatForm> {
  const ctx = await contexteApprouve();
  if (!ctx) return { error: CONNEXION };
  const p = machineModifSchema.safeParse(lirePayload(formData));
  if (!p.success) return { error: premiereErreur(p.error) };
  const m = await machineAutorisee(ctx.supabase, ctx.user.id, p.data.id);
  if (!m) return { error: MACHINE_INTROUVABLE };
  const photo = fichierDe(formData, "photo");
  if (photo) {
    const v = await verifierFichier(photo, validerPhoto);
    if (!v.ok) return { error: v.error };
  }
  const { error } = await ctx.supabase
    .from("machines")
    .update({ type_id: p.data.typeId, manufacturer_id: p.data.manufacturerId, model: p.data.model, specs: specsVersJson(p.data.specs) })
    .eq("id", m.id)
    .eq("owner_id", ctx.user.id);
  if (error) return { error: ECHEC_GENERIQUE };
  if (photo) {
    const err = await deposerPhoto(ctx, m.id, photo);
    if (err) return { error: err };
  } else if (p.data.retirerPhoto) await retirerPhoto(ctx, m.id);
  revalider(m.id);
  redirect(`/machines/${m.id}`);
}

/** Suppression d'une machine personnelle : configurations, abaques, sources, pièces jointes et fichiers. */
export async function supprimerMachine(input: unknown): Promise<ActionResult> {
  const ctx = await contexteApprouve();
  if (!ctx) return echec(CONNEXION);
  const p = idEntiteSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const { supabase, user } = ctx;
  const m = await machineAutorisee(supabase, user.id, p.data.id);
  if (!m) return echec(MACHINE_INTROUVABLE);

  const { data: configs } = await supabase.from("machine_configurations").select("id").eq("machine_id", m.id);
  const ids = (configs ?? []).map((c) => c.id as string);
  const { data: charts } = ids.length ? await supabase.from("load_charts").select("source_id").in("configuration_id", ids) : { data: [] };
  const sources = (charts ?? []).map((c) => c.source_id as string | null);
  const { data: fichiers } = await supabase.storage.from(BUCKET).list(`${user.id}/machines/${m.id}`);

  const { error } = await supabase.from("machines").delete().eq("id", m.id).eq("owner_id", user.id);
  if (error) return echec("La suppression a échoué.");
  await nettoyerSources(supabase, user.id, sources);
  if (fichiers?.length) await supabase.storage.from(BUCKET).remove(fichiers.map((f) => `${user.id}/machines/${m.id}/${f.name}`));
  revalider();
  return ok();
}

// ---------------------------------------------------------------------------
// Configuration + abaque
// ---------------------------------------------------------------------------

/** Ajoute une configuration avec son abaque (`a_verifier`) et sa source. FormData : `payload` (JSON) + `pdf`. */
export async function creerConfiguration(formData: FormData): Promise<ActionResult<{ id: string; chartId: string }>> {
  const ctx = await contexteApprouve();
  if (!ctx) return echec(CONNEXION);
  const p = configurationAvecAbaqueSchema.safeParse(lirePayload(formData));
  if (!p.success) return echec(premiereErreur(p.error));
  const { supabase, user } = ctx;
  const m = await machineAutorisee(supabase, user.id, p.data.machineId);
  if (!m) return echec(MACHINE_INTROUVABLE);

  const c = p.data.configuration;
  const { data: conf, error } = await supabase
    .from("machine_configurations")
    .insert({ machine_id: m.id, label: c.label, params: paramsVersJson(c.params), hook_block_mass_kg: c.moufleKg, notes: c.notes })
    .select("id")
    .single();
  if (error || !conf) return echec(ECHEC_GENERIQUE);

  const r = await enregistrerAbaque(ctx, m.id, conf.id as string, p.data, fichierDe(formData, "pdf"));
  if (!r.ok) {
    await supabase.from("machine_configurations").delete().eq("id", conf.id);
    return r;
  }
  revalider(m.id);
  return ok({ id: conf.id as string, chartId: r.data.chartId });
}

/** Libellé, paramètres, masse de moufle et notes d'une configuration (l'abaque n'est pas touché). */
export async function modifierConfiguration(input: unknown): Promise<ActionResult> {
  const ctx = await contexteApprouve();
  if (!ctx) return echec(CONNEXION);
  const p = configurationModifSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const c = await configurationAutorisee(ctx.supabase, ctx.user.id, p.data.id);
  if (!c) return echec("Configuration introuvable (ou non modifiable).");
  const { error } = await ctx.supabase
    .from("machine_configurations")
    .update({ label: p.data.label, params: paramsVersJson(p.data.params), hook_block_mass_kg: p.data.moufleKg, notes: p.data.notes })
    .eq("id", c.id);
  if (error) return echec(ECHEC_GENERIQUE);
  revalider(c.machineId);
  return ok();
}

/** Remplace l'abaque d'une configuration : le nouvel abaque repart en `a_verifier`. FormData : `payload` + `pdf`. */
export async function remplacerAbaque(formData: FormData): Promise<ActionResult<{ chartId: string }>> {
  const ctx = await contexteApprouve();
  if (!ctx) return echec(CONNEXION);
  const p = remplacerAbaqueSchema.safeParse(lirePayload(formData));
  if (!p.success) return echec(premiereErreur(p.error));
  const { supabase, user } = ctx;
  const c = await configurationAutorisee(supabase, user.id, p.data.configurationId);
  if (!c) return echec("Configuration introuvable (ou non modifiable).");
  const { data: anciens } = await supabase.from("load_charts").select("id,source_id").eq("configuration_id", c.id);

  const r = await enregistrerAbaque(ctx, c.machineId, c.id, p.data, fichierDe(formData, "pdf"));
  if (!r.ok) return r;
  const idsAnciens = (anciens ?? []).map((a) => a.id as string);
  if (idsAnciens.length) await supabase.from("load_charts").delete().in("id", idsAnciens);
  await nettoyerSources(supabase, user.id, (anciens ?? []).map((a) => a.source_id as string | null));
  revalider(c.machineId);
  return r;
}

export async function supprimerConfiguration(input: unknown): Promise<ActionResult> {
  const ctx = await contexteApprouve();
  if (!ctx) return echec(CONNEXION);
  const p = idEntiteSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const { supabase, user } = ctx;
  const c = await configurationAutorisee(supabase, user.id, p.data.id);
  if (!c) return echec("Configuration introuvable (ou non modifiable).");
  const { data: charts } = await supabase.from("load_charts").select("source_id").eq("configuration_id", c.id);
  const { error } = await supabase.from("machine_configurations").delete().eq("id", c.id);
  if (error) return echec("La suppression a échoué.");
  await nettoyerSources(supabase, user.id, (charts ?? []).map((x) => x.source_id as string | null));
  revalider(c.machineId);
  return ok();
}

// ---------------------------------------------------------------------------
// Statut de l'abaque
// ---------------------------------------------------------------------------

/**
 * « Marquer comme vérifié » : confirmation explicite obligatoire ; `verified_by` / `verified_at`
 * sont posés par le trigger `load_charts_guard` (jamais par le client).
 */
export async function marquerVerifie(input: unknown): Promise<ActionResult> {
  const ctx = await contexteApprouve();
  if (!ctx) return echec(CONNEXION);
  const p = verifierSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const { supabase, user } = ctx;
  const a = await abaqueAutorise(supabase, user.id, p.data.chartId);
  if (!a) return echec("Abaque introuvable (ou non modifiable).");
  if (!a.sourceId) return echec("Abaque sans source : impossible de le marquer vérifié.");
  const { data: src } = await supabase.from("chart_sources").select("file_path").eq("id", a.sourceId).eq("owner_id", user.id).maybeSingle();
  if (!src?.file_path) return echec("Le PDF constructeur doit être joint avant de marquer l'abaque vérifié.");
  const { data, error } = await supabase.from("load_charts").update({ status: "verifie" }).eq("id", a.id).select("verified_by").single();
  if (error || !data) return echec(ECHEC_GENERIQUE);
  if (data.verified_by !== user.id) return echec("La vérification n'a pas pu être attribuée à votre compte.");
  revalider(a.machineId);
  return ok();
}

/** Retour à « à vérifier » (les traces de vérification sont effacées par le trigger). */
export async function remettreAVerifier(input: unknown): Promise<ActionResult> {
  const ctx = await contexteApprouve();
  if (!ctx) return echec(CONNEXION);
  const p = chartRefSchema.safeParse(input);
  if (!p.success) return echec(premiereErreur(p.error));
  const a = await abaqueAutorise(ctx.supabase, ctx.user.id, p.data.chartId);
  if (!a) return echec("Abaque introuvable (ou non modifiable).");
  const { error } = await ctx.supabase.from("load_charts").update({ status: "a_verifier" }).eq("id", a.id);
  if (error) return echec(ECHEC_GENERIQUE);
  revalider(a.machineId);
  return ok();
}
