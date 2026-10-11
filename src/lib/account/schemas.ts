/**
 * Schémas Zod des entrées des Server Actions (comptes, projets, études, versions).
 * Toute entrée client est validée ici avant d'atteindre la base.
 */
import { z } from "zod";

const texteRequis = (max: number, message: string) => z.string().trim().min(1, message).max(max, `${max} caractères maximum`);
const texteOptionnel = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .optional()
    .transform((v) => (v ? v : null));

export const idSchema = z.uuid("Identifiant invalide");

// --- Authentification
const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Adresse e-mail invalide"));
const motDePasseSchema = z.string().min(8, "8 caractères minimum").max(128, "128 caractères maximum");

export const connexionSchema = z.object({ email: emailSchema, motDePasse: z.string().min(1, "Mot de passe requis").max(128) });
export const inscriptionSchema = z
  .object({
    nom: texteRequis(120, "Nom requis"),
    entreprise: texteRequis(160, "Entreprise requise"),
    email: emailSchema,
    motDePasse: motDePasseSchema,
    confirmation: z.string().max(128),
  })
  .refine((v) => v.motDePasse === v.confirmation, { path: ["confirmation"], message: "Les mots de passe ne correspondent pas" });
export const lienMagiqueSchema = z.object({ email: emailSchema });

// --- Profil, entreprise, seuils
export const profilSchema = z.object({
  nom: texteRequis(120, "Nom requis"),
  fonction: texteOptionnel(120),
  telephone: texteOptionnel(40),
});

export const entrepriseSchema = z.object({
  nom: texteRequis(160, "Nom de l'entreprise requis"),
  adresse: texteOptionnel(400),
});

/** Mêmes bornes que la contrainte SQL `user_settings_thresholds_chk`. */
export const seuilsUtilisateurSchema = z
  .object({
    vert: z.number("Seuil vert requis").gt(0, "Le seuil vert doit être > 0"),
    orange: z.number("Seuil orange requis").max(100, "Le seuil orange doit être ≤ 100"),
  })
  .refine((s) => s.vert < s.orange, { path: ["vert"], message: "Le seuil vert doit être inférieur au seuil orange" });

export const LOGO_TYPES = { "image/png": "png", "image/jpeg": "jpg" } as const;
export const LOGO_TAILLE_MAX = 1_000_000;

// --- Projets
export const projetCreationSchema = z.object({
  nom: texteRequis(160, "Nom du projet requis"),
  adresse: texteOptionnel(400),
  client: texteOptionnel(160),
});
export const projetRenommerSchema = z.object({ id: idSchema, nom: texteRequis(160, "Nom du projet requis") });
export const idEntiteSchema = z.object({ id: idSchema });

// --- Études
export const etudeCreationSchema = z.object({ projetId: idSchema, titre: texteRequis(200, "Titre requis") });
export const etudeRenommerSchema = z.object({ id: idSchema, titre: texteRequis(200, "Titre requis") });
export const projetRefSchema = z.object({ projetId: idSchema });

// --- Données d'étude (état du store) : structure vérifiée, détail laissé au moteur
const section = z.looseObject({});
export const TAILLE_DATA_MAX = 500_000;

export const studyDataSchema = z
  .looseObject({
    operation: z.looseObject({
      projet: z.string().max(300).optional(),
      lieu: z.string().max(300).optional(),
      date: z.string().max(40).optional(),
      description: z.string().max(5000).optional(),
      intervenants: z.string().max(2000).optional(),
      redacteur: z.string().max(200).optional(),
    }),
    charge: section.optional(),
    accessoires: z.looseObject({ liste: z.array(z.looseObject({})).max(100).optional() }).optional(),
    machine: section.optional(),
    geometrie: z
      .looseObject({
        positions: z.array(z.looseObject({})).max(50).optional(),
        obstaclesSaisis: z.array(z.looseObject({})).max(100).optional(),
      })
      .optional(),
    sol: section.optional(),
    environnement: section.optional(),
    personnel: section.optional(),
    seuils: z
      .looseObject({
        vertPct: z.number().min(0).max(100).nullable().optional(),
        orangePct: z.number().min(0).max(100).nullable().optional(),
      })
      .optional(),
    reserves: z.looseObject({ liste: z.array(z.looseObject({})).max(200).optional() }).optional(),
  })
  .refine((d) => JSON.stringify(d).length <= TAILLE_DATA_MAX, { message: "Étude trop volumineuse" });

export const versionEnregistrerSchema = z.object({ etudeId: idSchema, data: studyDataSchema });
export const versionRefSchema = z.object({ etudeId: idSchema, index: z.number().int().min(1).max(100_000) });
export const etudeRefSchema = z.object({ etudeId: idSchema });

/** Nouvelle adéquation : projet existant OU nouveau projet, puis titre de l'étude. */
export const nouvelleAdequationSchema = z
  .object({
    projetId: idSchema.optional(),
    nouveauProjet: z.string().trim().min(1, "Nom du projet requis").max(160, "160 caractères maximum").optional(),
    titre: texteRequis(200, "Titre requis"),
  })
  .refine((v) => Boolean(v.projetId) !== Boolean(v.nouveauProjet), {
    message: "Choisissez un projet existant ou saisissez le nom d'un nouveau projet",
  });

/** Premier message d'erreur lisible d'un échec de validation. */
export function premiereErreur(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Saisie invalide";
}
