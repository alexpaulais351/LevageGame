/** Caractéristiques des machines (colonne `specs`) : schéma et conversion JSON, utilisés à la lecture du catalogue. */
import { z } from "zod";


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
