/**
 * Schémas Zod par étape. Un schéma « passe » ⇔ l'étape est complète.
 * Les messages sont affichés tels quels sous les champs.
 */
import { z } from "zod";

import type { StudyData } from "./types";

const requis = "Valeur requise";
const texte = (m = "Champ requis") => z.string().trim().min(1, m);
const nombre = (opts: { min?: number; gt?: number; max?: number; lt?: number; int?: boolean } = {}) => {
  let s = z.number({ error: requis });
  if (opts.int) s = s.int("Nombre entier attendu");
  if (opts.gt !== undefined) s = s.gt(opts.gt, `Doit être > ${opts.gt}`);
  if (opts.min !== undefined) s = s.min(opts.min, `Doit être ≥ ${opts.min}`);
  if (opts.lt !== undefined) s = s.lt(opts.lt, `Doit être < ${opts.lt}`);
  if (opts.max !== undefined) s = s.max(opts.max, `Doit être ≤ ${opts.max}`);
  return s;
};
const optionnel = z.number().nullable();

export const operationSchema = z.object({
  projet: texte("Indiquez le projet / chantier"),
  lieu: texte("Indiquez le lieu"),
  description: texte("Décrivez le levage"),
});

export const chargeSchema = z.object({
  designation: texte("Désignez la charge"),
  masseKg: nombre({ gt: 0 }),
  coefMarge: nombre({ min: 1, max: 3 }),
  longueurM: optionnel,
  largeurM: optionnel,
  hauteurM: optionnel,
  surfaceVentM2: optionnel,
});

export const accessoiresSchema = z.object({
  liste: z
    .array(
      z.object({
        label: texte("Désignation requise"),
        masseKg: nombre({ min: 0 }),
        cmuKg: nombre({ gt: 0 }),
      }),
    )
    .min(1, "Ajoutez au moins un accessoire"),
  nbBrins: nombre({ min: 1, int: true }),
  angleBetaDeg: nombre({ min: 0, lt: 90 }),
});

export const machineSchema = z.object({
  selection: z
    .object({ chart: z.object({ id: z.string() }, { error: "Aucun abaque pour cette configuration" }) })
    .nullable()
    .refine((v) => v !== null, "Choisissez une machine et sa configuration"),
  moufleCrochetKg: nombre({ min: 0 }),
});

/** Les positions dépendent de l'axe Y de l'abaque (longueur de flèche / hauteur / aucun). */
export function geometrieSchema(axeY: "boom_length_m" | "height_m" | "none" | null) {
  return z.object({
    positions: z
      .array(
        z.object({
          nom: texte("Nom requis"),
          porteeM: nombre({ gt: 0 }),
          yM: axeY && axeY !== "none" ? nombre({ gt: 0 }) : z.number().nullable(),
        }),
      )
      .min(1, "Ajoutez au moins une position"),
  });
}

const solBase = { effortMaxKN: nombre({ gt: 0 }), portanceKPa: nombre({ gt: 0 }) };
export const solSchema = z.discriminatedUnion(
  "mode",
  [
    z.object({ mode: z.literal("non_applicable") }),
    z.object({
      mode: z.literal("chenilles"),
      ...solBase,
      chenilleLongueurM: nombre({ gt: 0 }),
      chenilleTuileM: nombre({ gt: 0 }),
    }),
    z.object({
      mode: z.literal("stabilisateurs"),
      ...solBase,
      typeSurface: z.enum(["plaque", "patin"]),
      plaqueLongueurM: z.number().nullable(),
      plaqueLargeurM: z.number().nullable(),
      patinSurfaceM2: z.number().nullable(),
    }),
  ],
  { error: "Choisissez le mode d'appui" },
).superRefine((v, ctx) => {
  if (v.mode !== "stabilisateurs") return;
  const manque = (path: string) => ctx.addIssue({ code: "custom", path: [path], message: requis });
  if (v.typeSurface === "plaque") {
    if (v.plaqueLongueurM === null || !(v.plaqueLongueurM > 0)) manque("plaqueLongueurM");
    if (v.plaqueLargeurM === null || !(v.plaqueLargeurM > 0)) manque("plaqueLargeurM");
  } else if (v.patinSurfaceM2 === null || !(v.patinSurfaceM2 > 0)) {
    manque("patinSurfaceM2");
  }
});

export const environnementSchema = z
  .object({
    ventPrevu: nombre({ min: 0 }),
    ventLimiteMachine: nombre({ gt: 0 }),
    chargeFortePriseAuVent: z.boolean(),
    ventLimiteCharge: z.number().nullable(),
    lignes: z.enum(["oui", "non"], { error: "Indiquez s'il y a des lignes électriques" }),
    ligneDistancePrevueM: z.number().nullable(),
    ligneDistanceSeuilM: z.number().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.chargeFortePriseAuVent && (v.ventLimiteCharge === null || !(v.ventLimiteCharge > 0))) {
      ctx.addIssue({ code: "custom", path: ["ventLimiteCharge"], message: requis });
    }
    if (v.lignes === "oui") {
      if (v.ligneDistancePrevueM === null || v.ligneDistancePrevueM < 0) {
        ctx.addIssue({ code: "custom", path: ["ligneDistancePrevueM"], message: requis });
      }
      if (v.ligneDistanceSeuilM === null || !(v.ligneDistanceSeuilM > 0)) {
        ctx.addIssue({ code: "custom", path: ["ligneDistanceSeuilM"], message: requis });
      }
    }
  });

export const personnelSchema = z.object({
  conducteur: texte("Nom du conducteur requis"),
  caces: texte("CACES / autorisation requis"),
  chefManoeuvre: texte("Nom du chef de manœuvre requis"),
  elingueur: texte("Nom de l'élingueur requis"),
});

export const seuilsSchema = z
  .object({ vertPct: nombre({ gt: 0, max: 100 }), orangePct: nombre({ gt: 0, max: 100 }) })
  .refine((s) => s.vertPct <= s.orangePct, {
    path: ["vertPct"],
    message: "Le seuil vert doit être ≤ au seuil orange",
  });

export const ETAPES = [
  { cle: "operation", titre: "Chantier / opération", court: "Chantier" },
  { cle: "charge", titre: "Charge", court: "Charge" },
  { cle: "accessoires", titre: "Accessoires de levage", court: "Accessoires" },
  { cle: "machine", titre: "Moyen de levage", court: "Machine" },
  { cle: "geometrie", titre: "Géométrie du levage", court: "Géométrie" },
  { cle: "sol", titre: "Appuis et sol", court: "Appuis" },
  { cle: "environnement", titre: "Environnement", court: "Environ." },
  { cle: "personnel", titre: "Personnel et documents", court: "Personnel" },
  { cle: "synthese", titre: "Synthèse", court: "Synthèse" },
] as const;

export type CleEtape = (typeof ETAPES)[number]["cle"];

type Issues = { path: PropertyKey[]; message: string }[];

/** Erreurs d'un schéma sous forme { "liste.0.cmuDirectKg": "message" } (première erreur par chemin). */
export function erreursZod(schema: z.ZodType, valeur: unknown): Record<string, string> {
  const r = schema.safeParse(valeur);
  if (r.success) return {};
  const out: Record<string, string> = {};
  for (const i of r.error.issues as Issues) {
    const k = i.path.join(".");
    if (!(k in out)) out[k] = i.message;
  }
  return out;
}

/** Schéma et données validées d'une étape (la synthèse est traitée à part). */
export function erreursEtape(cle: Exclude<CleEtape, "synthese">, d: StudyData): Record<string, string> {
  switch (cle) {
    case "operation":
      return erreursZod(operationSchema, d.operation);
    case "charge":
      return erreursZod(chargeSchema, d.charge);
    case "accessoires":
      return erreursZod(accessoiresSchema, d.accessoires);
    case "machine":
      return erreursZod(machineSchema, d.machine);
    case "geometrie":
      return erreursZod(geometrieSchema(d.machine.selection?.chart?.axisY ?? null), d.geometrie);
    case "sol":
      return erreursZod(solSchema, d.sol);
    case "environnement":
      return erreursZod(environnementSchema, d.environnement);
    case "personnel":
      return erreursZod(personnelSchema, d.personnel);
  }
}

/** Complétude des 9 étapes (la synthèse est complète quand les 8 autres le sont et les seuils valides). */
export function completudeEtapes(d: StudyData): boolean[] {
  const huit = (ETAPES.slice(0, 8) as readonly { cle: Exclude<CleEtape, "synthese"> }[]).map(
    (e) => Object.keys(erreursEtape(e.cle, d)).length === 0,
  );
  const seuilsOk = Object.keys(erreursZod(seuilsSchema, d.seuils)).length === 0;
  return [...huit, huit.every(Boolean) && seuilsOk];
}
