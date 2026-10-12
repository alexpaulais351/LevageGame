import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug attendu : minuscules, chiffres, tirets");
const text = z.string().trim().min(1);

export const sourceSchema = z
  .object({
    document_title: text,
    reference: z.string().nullable(),
    edition: z.string().nullable(),
    url: z.string().nullable(),
    publisher: z.string().nullable(),
    /** PDF source dans le bucket privé `chart-sources` (déposé hors dépôt : docs/ABAQUES.md). */
    file_path: z
      .string()
      .regex(/^catalogue\/[a-z0-9-]+\.pdf$/, "chemin attendu : catalogue/<slug>.pdf")
      .nullable()
      .optional(),
    page_refs: z.string().nullable(),
  })
  .strict();

export const chartMetaSchema = z
  .object({
    file: z.string().regex(/^[^/\\]+\.csv$/, "nom de fichier .csv dans le dossier de la machine"),
    axis_y: z.enum(["boom_length_m", "height_m", "none"]),
    unit: z.enum(["kg", "t"]),
    standard: z.string().nullable(),
    deductions_included: z.boolean(),
    interpolation_allowed: z.boolean().default(false),
    notes: z.string().nullable(),
  })
  .strict();

export const configurationSchema = z
  .object({
    slug,
    label: text,
    params: z.record(z.string(), z.unknown()),
    hook_block_mass_kg: z.number().min(0).nullable(),
    chart: chartMetaSchema,
  })
  .strict();

export const machineSchema = z
  .object({
    manufacturer: text,
    type_code: z.string().regex(/^[a-z][a-z0-9_]*$/),
    model: text,
    specs: z.record(z.string(), z.unknown()),
    source: sourceSchema,
    configurations: z.array(configurationSchema).min(1),
    entered_at: z.string().regex(/^\d{4}-\d{2}-\d{2}(T[\d:.+Z-]+)?$/, "date ISO attendue"),
    entered_by: text,
    status: z.literal("a_verifier"),
  })
  .strict()
  .superRefine((m, ctx) => {
    const seen = new Set<string>();
    m.configurations.forEach((c, i) => {
      if (seen.has(c.slug)) ctx.addIssue({ code: "custom", message: `slug de configuration en double : ${c.slug}`, path: ["configurations", i, "slug"] });
      seen.add(c.slug);
    });
  });

export type MachineFile = z.infer<typeof machineSchema>;
export type ConfigurationFile = z.infer<typeof configurationSchema>;
