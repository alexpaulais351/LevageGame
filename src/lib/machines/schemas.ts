/** Schémas Zod des Server Actions « machines personnelles ». Toute entrée client passe ici. */
import { z } from "zod";

import { idSchema } from "@/lib/account/schemas";

const texteRequis = (max: number, message: string) => z.string().trim().min(1, message).max(max, `${max} caractères maximum`);
const texteOptionnel = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .nullish()
    .transform((v) => (v ? v : null));

const dimension = (max: number, nom: string) =>
  z
    .number(`${nom} : nombre attendu`)
    .finite()
    .gt(0, `${nom} doit être > 0`)
    .max(max, `${nom} : valeur trop grande`)
    .nullish()
    .transform((v) => v ?? null);

/** Caractéristiques utiles ; une valeur inconnue reste `null` (jamais devinée). */
export const specsSchema = z
  .object({
    masseKg: dimension(2_000_000, "Masse"),
    longueurM: dimension(100, "Longueur"),
    largeurM: dimension(100, "Largeur"),
    calageLongueurM: dimension(100, "Longueur de calage"),
    calageLargeurM: dimension(100, "Largeur de calage"),
  })
  .refine((s) => (s.calageLongueurM === null) === (s.calageLargeurM === null), {
    path: ["calageLongueurM"],
    message: "Calage : renseignez la longueur ET la largeur, ou aucune des deux",
  });

export type SpecsSaisies = z.infer<typeof specsSchema>;

/** Représentation stockée dans `machines.specs` (clés absentes = inconnues). */
export function specsVersJson(s: SpecsSaisies): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (s.masseKg !== null) o.masse_kg = s.masseKg;
  if (s.longueurM !== null) o.longueur_m = s.longueurM;
  if (s.largeurM !== null) o.largeur_m = s.largeurM;
  if (s.calageLongueurM !== null && s.calageLargeurM !== null) o.calage = { longueurM: s.calageLongueurM, largeurM: s.calageLargeurM };
  return o;
}

export function specsDepuisJson(j: unknown): SpecsSaisies {
  const o = (j && typeof j === "object" ? j : {}) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  const c = (o.calage && typeof o.calage === "object" ? o.calage : {}) as Record<string, unknown>;
  const cl = n(c.longueurM);
  const cw = n(c.largeurM);
  return {
    masseKg: n(o.masse_kg),
    longueurM: n(o.longueur_m),
    largeurM: n(o.largeur_m),
    calageLongueurM: cl !== null && cw !== null ? cl : null,
    calageLargeurM: cl !== null && cw !== null ? cw : null,
  };
}

export const machinePersoSchema = z.object({
  typeId: idSchema,
  manufacturerId: idSchema,
  model: texteRequis(120, "Modèle requis"),
  specs: specsSchema,
});
export const machineModifSchema = machinePersoSchema.extend({ id: idSchema, retirerPhoto: z.boolean().default(false) });

// --- Configuration : paramètres libres clé/valeur
export const paramsSchema = z
  .array(
    z.object({
      cle: texteRequis(60, "Nom du paramètre requis"),
      valeur: z.string().trim().max(200, "200 caractères maximum"),
    }),
  )
  .max(30, "30 paramètres maximum")
  .superRefine((l, ctx) => {
    const vus = new Set<string>();
    l.forEach((p, i) => {
      const k = p.cle.toLowerCase();
      if (vus.has(k)) ctx.addIssue({ code: "custom", path: [i, "cle"], message: `Paramètre en double : ${p.cle}` });
      vus.add(k);
    });
  });

export function paramsVersJson(l: z.infer<typeof paramsSchema>): Record<string, string> {
  return Object.fromEntries(l.map((p) => [p.cle, p.valeur]));
}

export const configurationSchema = z.object({
  label: texteRequis(120, "Libellé de la configuration requis"),
  params: paramsSchema,
  moufleKg: z
    .number("Masse de moufle : nombre attendu")
    .finite()
    .min(0, "Masse de moufle ≥ 0")
    .max(100_000, "Masse de moufle : valeur trop grande")
    .nullish()
    .transform((v) => v ?? null),
  notes: texteOptionnel(1000),
});

// --- Source documentaire
const urlHttp = z
  .string()
  .trim()
  .max(500, "500 caractères maximum")
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\/[^\s]+$/i.test(v), "URL : http(s)://… attendu");

export const sourceSaisieSchema = z.object({
  documentTitle: texteRequis(250, "Titre du document constructeur requis"),
  reference: texteOptionnel(120),
  edition: texteOptionnel(120),
  url: urlHttp,
  publisher: texteOptionnel(160),
});

// --- Abaque
const ligneGrille = z.object({
  radius: z.string().max(30),
  y: z.string().max(30),
  capacity: z.string().max(30),
});

export const abaqueSaisiSchema = z.object({
  mode: z.enum(["csv", "grille"]),
  csv: z.string().max(400_000, "CSV trop volumineux"),
  grille: z.array(ligneGrille).max(3000, "3 000 lignes maximum"),
  axisY: z.enum(["boom_length_m", "height_m", "none"]),
  unit: z.enum(["kg", "t"]),
  standard: texteOptionnel(120),
  deductionsIncluded: z.boolean(),
  interpolationAllowed: z.boolean(),
});

export const configurationAvecAbaqueSchema = z.object({
  machineId: idSchema,
  configuration: configurationSchema,
  source: sourceSaisieSchema,
  abaque: abaqueSaisiSchema,
});

export const remplacerAbaqueSchema = z.object({
  configurationId: idSchema,
  source: sourceSaisieSchema,
  abaque: abaqueSaisiSchema,
});

export const configurationModifSchema = configurationSchema.extend({ id: idSchema });

export const verifierSchema = z.object({
  chartId: idSchema,
  confirme: z.literal(true, { error: "Cochez la confirmation de contrôle de chaque valeur." }),
});
export const chartRefSchema = z.object({ chartId: idSchema });
