/**
 * Validation partagée d'un abaque saisi (import CSV, grille éditable, scripts d'import du catalogue).
 * Pure : aucune dépendance React/Supabase. Une seule définition des règles bloquantes et des avertissements.
 */
import { validateChart } from "../../engine/chart";
import type { ChartAxisY, ChartPoint, LoadChart } from "../../engine/types";

export interface EntreeAbaque {
  id: string;
  points: ChartPoint[];
  axisY: ChartAxisY;
  interpolationAllowed: boolean;
  standard: string | null;
  deductionsIncluded: boolean;
  source: { title: string; reference: string | null; edition: string | null; url: string | null };
}

export interface RapportAbaque {
  chart: LoadChart;
  /** Erreurs bloquantes : l'abaque ne peut pas être enregistré. */
  errors: string[];
  /** Avertissements (capacité croissante, cellules vides, source incomplète…) : à contrôler. */
  warnings: string[];
}

const EPS = 1e-9;

/**
 * Règle « case vide intérieure » (sécurité) : pour chaque ligne y, toute portée de la grille globale
 * (union des portées de toutes les lignes) strictement comprise entre la plus petite et la plus grande
 * portée RENSEIGNÉE de la ligne doit être renseignée. Sinon le moteur lirait le minimum des nœuds voisins
 * là où le tableau constructeur imprime « - » (pas de levage autorisé) — y compris quand la case a été
 * omise du CSV au lieu d'être laissée vide (les cellules vides ne sont pas insérées en base).
 */
export function casesVidesInterieures(points: ChartPoint[], axisY: ChartAxisY): string[] {
  const ok = points.filter((p) => Number.isFinite(p.x));
  const lignes = new Map<string, ChartPoint[]>();
  for (const p of ok) {
    const k = axisY === "none" ? "" : p.y === null || !Number.isFinite(p.y) ? null : String(p.y);
    if (k === null) continue;
    lignes.set(k, [...(lignes.get(k) ?? []), p]);
  }
  const rempli = (p: ChartPoint) => p.capacityKg !== null && Number.isFinite(p.capacityKg);
  // Tables ISO 10567 (pelles, axis_y = height_m) : la colonne « portée max » a une portée propre à chaque
  // ligne de hauteur ; une portée qui n'apparaît QUE comme dernier nœud renseigné de ses lignes n'est pas
  // une colonne de la grille. Pour les autres axes, la grille est l'union de toutes les portées.
  const maxLigne = new Map<string, number>();
  for (const [k, pts] of lignes) {
    const r = pts.filter(rempli);
    if (r.length) maxLigne.set(k, Math.max(...r.map((p) => p.x)));
  }
  const grille: number[] = [];
  for (const [k, pts] of lignes) {
    for (const p of pts) {
      const colonneMaxSeule = axisY === "height_m" && rempli(p) && Math.abs(p.x - (maxLigne.get(k) ?? NaN)) <= EPS;
      if (colonneMaxSeule) continue;
      if (!grille.some((x) => Math.abs(x - p.x) <= EPS)) grille.push(p.x);
    }
  }
  grille.sort((a, b) => a - b);
  const errors: string[] = [];
  for (const [k, pts] of lignes) {
    const remplis = pts.filter(rempli);
    if (remplis.length < 2) continue;
    const min = Math.min(...remplis.map((p) => p.x));
    const max = Math.max(...remplis.map((p) => p.x));
    const trous = grille.filter(
      (x) => x - min > EPS && max - x > EPS && !remplis.some((p) => Math.abs(p.x - x) <= EPS),
    );
    if (trous.length) {
      const lbl = axisY === "none" ? "ligne unique" : `ligne y=${k} m`;
      errors.push(
        `${lbl} : case vide ou absente à l'intérieur du domaine [${min} ; ${max}] m (portée(s) ${trous.join(", ")} m) — ` +
          "le tableau imprime « - » ? couper la ligne au trou (le segment au-delà devient hors abaque), sinon compléter d'après la doc",
      );
    }
  }
  return errors;
}

const decimals = (v: number) => (Number.isInteger(v) ? 0 : (String(v).split(".")[1] ?? "").length);

/** Construit l'abaque du moteur (statut `a_verifier`) et lui applique `validateChart` + précision stockable en base. */
export function analyserAbaque(e: EntreeAbaque, erreursAmont: string[] = []): RapportAbaque {
  const chart: LoadChart = {
    id: e.id,
    axisX: "radius_m",
    axisY: e.axisY,
    points: e.points,
    interpolationAllowed: e.interpolationAllowed,
    status: "a_verifier",
    standard: e.standard ?? "",
    deductionsIncluded: e.deductionsIncluded,
    source: {
      title: e.source.title,
      reference: e.source.reference ?? "",
      edition: e.source.edition ?? "",
      url: e.source.url ?? "",
    },
  };
  const errors = [...erreursAmont];
  const v = validateChart(chart);
  errors.push(...v.errors);
  errors.push(...casesVidesInterieures(e.points, e.axisY));
  const warnings = [...v.warnings];
  // Précision acceptée par la BDD : x,y numeric(_,2) ; capacity_kg numeric(_,1).
  if (e.points.some((p) => decimals(p.x) > 2 || (p.y !== null && decimals(p.y) > 2))) errors.push("portée/y : plus de 2 décimales (non stockable)");
  if (e.points.some((p) => p.capacityKg !== null && decimals(p.capacityKg) > 1))
    errors.push("capacité (kg) : plus de 1 décimale après conversion (non stockable)");
  return { chart, errors, warnings };
}
