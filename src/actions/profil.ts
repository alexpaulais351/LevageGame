"use server";

import { revalidatePath } from "next/cache";

import { type EtatForm } from "@/lib/account/result";
import {
  entrepriseSchema,
  LOGO_TAILLE_MAX,
  LOGO_TYPES,
  premiereErreur,
  profilSchema,
  seuilsUtilisateurSchema,
} from "@/lib/account/schemas";
import { contexteUtilisateur } from "@/lib/supabase/session";

const NON_CONNECTE: EtatForm = { error: "Connexion requise." };
const ECHEC: EtatForm = { error: "L'enregistrement a échoué. Réessayez." };

function refresh() {
  revalidatePath("/profil");
  revalidatePath("/", "layout");
}

/** Nom, fonction et téléphone du rédacteur (ligne profiles de l'utilisateur uniquement). */
export async function majProfil(_prev: EtatForm, formData: FormData): Promise<EtatForm> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return NON_CONNECTE;
  const p = profilSchema.safeParse({
    nom: formData.get("nom"),
    fonction: formData.get("fonction") ?? undefined,
    telephone: formData.get("telephone") ?? undefined,
  });
  if (!p.success) return { error: premiereErreur(p.error) };
  const { error } = await ctx.supabase
    .from("profiles")
    .update({ full_name: p.data.nom, role: p.data.fonction, phone: p.data.telephone })
    .eq("id", ctx.user.id);
  if (error) return ECHEC;
  refresh();
  return { message: "Profil enregistré." };
}

/** Entreprise (nom, adresse) et logo, rangé dans user-files/<uid>/logo.<ext>. */
export async function majEntreprise(_prev: EtatForm, formData: FormData): Promise<EtatForm> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return NON_CONNECTE;
  const { supabase, user } = ctx;
  const p = entrepriseSchema.safeParse({ nom: formData.get("nom"), adresse: formData.get("adresse") ?? undefined });
  if (!p.success) return { error: premiereErreur(p.error) };

  const fichier = formData.get("logo");
  const nouveauLogo = fichier instanceof File && fichier.size > 0 ? fichier : null;
  if (nouveauLogo) {
    if (!(nouveauLogo.type in LOGO_TYPES)) return { error: "Logo : format PNG ou JPEG uniquement." };
    if (nouveauLogo.size > LOGO_TAILLE_MAX) return { error: "Logo : 1 Mo maximum." };
  }
  const retirerLogo = formData.get("retirerLogo") === "on";

  const { data: profil } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
  if (!profil) return ECHEC;

  // Organisation : création au premier enregistrement, sinon mise à jour (créateur uniquement).
  let orgId = profil.organization_id as string | null;
  let logoPath: string | null | undefined;
  if (orgId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("id,logo_path,created_by")
      .eq("id", orgId)
      .eq("created_by", user.id)
      .maybeSingle();
    if (!org) return { error: "Vous n'êtes pas autorisé à modifier cette entreprise." };
    logoPath = org.logo_path as string | null;
    const { error } = await supabase.from("organizations").update({ name: p.data.nom, address: p.data.adresse }).eq("id", orgId);
    if (error) return ECHEC;
  } else {
    const { data: org, error } = await supabase
      .from("organizations")
      .insert({ name: p.data.nom, address: p.data.adresse, created_by: user.id })
      .select("id")
      .single();
    if (error || !org) return ECHEC;
    orgId = org.id as string;
    const { error: errProfil } = await supabase.from("profiles").update({ organization_id: orgId }).eq("id", user.id);
    if (errProfil) return ECHEC;
    logoPath = null;
  }

  if (nouveauLogo) {
    const ext = LOGO_TYPES[nouveauLogo.type as keyof typeof LOGO_TYPES];
    const chemin = `${user.id}/logo.${ext}`;
    const { error } = await supabase.storage.from("user-files").upload(chemin, nouveauLogo, {
      upsert: true,
      contentType: nouveauLogo.type,
    });
    if (error) return { error: "Le téléversement du logo a échoué." };
    if (logoPath && logoPath !== chemin) await supabase.storage.from("user-files").remove([logoPath]);
    await supabase.from("organizations").update({ logo_path: chemin }).eq("id", orgId);
  } else if (retirerLogo && logoPath) {
    await supabase.storage.from("user-files").remove([logoPath]);
    await supabase.from("organizations").update({ logo_path: null }).eq("id", orgId);
  }

  refresh();
  return { message: "Entreprise enregistrée." };
}

/** Seuils du verdict (vert / orange, en %) appliqués aux nouvelles études. */
export async function majSeuils(_prev: EtatForm, formData: FormData): Promise<EtatForm> {
  const ctx = await contexteUtilisateur();
  if (!ctx) return NON_CONNECTE;
  const nombre = (k: string) => {
    const v = String(formData.get(k) ?? "").replace(",", ".").trim();
    return v === "" ? undefined : Number(v);
  };
  const p = seuilsUtilisateurSchema.safeParse({ vert: nombre("vert"), orange: nombre("orange") });
  if (!p.success) return { error: premiereErreur(p.error) };
  const { error } = await ctx.supabase
    .from("user_settings")
    .upsert({ user_id: ctx.user.id, threshold_green: p.data.vert, threshold_orange: p.data.orange }, { onConflict: "user_id" });
  if (error) return ECHEC;
  refresh();
  return { message: "Seuils enregistrés." };
}
