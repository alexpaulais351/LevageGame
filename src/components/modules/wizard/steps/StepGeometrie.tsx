"use client";

import { ArrowDownToLine, ArrowUpFromLine, MapPin, Plus, RotateCw, Trash2, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { hauteurSousCrochet } from "@/lib/study/mapping";
import type { PositionSaisie } from "@/lib/study/types";
import { formatNombreFR } from "@/lib/utils";
import { useStudy } from "@/stores/study";

import { NumberField, TextAreaField, TextField } from "../fields";
import { SousTitre, StepShell } from "../StepShell";
import { useErreurs } from "../use-erreurs";

const m = (v: number) => `${formatNombreFR(v, 2).replace(/,00$/, "")} m`;

type Role = "prise" | "pose" | "rotation" | "autre";

/** Rôle déduit du nom (« Prise », « Pose », « Rotation »…) pour adapter libellés et aides. */
function role(p: PositionSaisie): Role {
  const n = p.nom.trim().toLowerCase();
  if (p.id === "prise" || n.startsWith("prise") || n.includes("chargement")) return "prise";
  if (p.id === "pose" || n.startsWith("pose") || n.includes("dépose") || n.includes("depose")) return "pose";
  if (p.id === "rotation" || n.includes("rotation") || n.includes("passage")) return "rotation";
  return "autre";
}

const ROLES: Record<Role, { icone: LucideIcon; titre: string; appui: string; aide: string }> = {
  prise: {
    icone: ArrowUpFromLine,
    titre: "Point de prise (là où la charge est accrochée)",
    appui: "Hauteur du point de prise",
    aide: "Niveau où repose la charge avant levage, depuis le sol de la machine : 0 = au sol, plateau de camion ≈ 1,4 m.",
  },
  pose: {
    icone: ArrowDownToLine,
    titre: "Point de pose (là où la charge est déposée)",
    appui: "Hauteur du point de pose",
    aide: "Niveau du support de pose, depuis le sol de la machine : dalle R+1 ≈ 3 m, R+3 ≈ 9 m, toiture.",
  },
  rotation: {
    icone: RotateCw,
    titre: "Passage en rotation (trajet entre prise et pose)",
    appui: "Hauteur à franchir",
    aide: "Point le plus haut à survoler pendant la rotation (acrotère, clôture, véhicule). Laisser vide si rien à franchir.",
  },
  autre: {
    icone: MapPin,
    titre: "Position intermédiaire",
    appui: "Hauteur de l'appui",
    aide: "Niveau où la charge repose ou doit passer à cette position, depuis le sol de la machine.",
  },
};

/** Schéma explicatif des grandeurs demandées (portée, hauteur d'appui, charge, élingage, crochet). */
function SchemaAide() {
  const bleu = "var(--color-vinci-bleu)";
  const fonce = "var(--color-vinci-bleu-dark)";
  const gris = "var(--color-vinci-gris)";
  const clair = "var(--color-vinci-gris-light)";
  const rouge = "var(--color-vinci-rouge)";
  return (
    <svg viewBox="0 0 520 230" className="h-auto w-full max-w-xl" role="img" aria-label="Schéma : portée, hauteur d'appui, hauteur de charge, élingage, hauteur sous crochet">
      <line x1="10" x2="510" y1="205" y2="205" stroke={gris} strokeWidth="2" />
      {/* Grue (silhouette simple) */}
      <rect x="40" y="170" width="90" height="30" rx="4" fill={bleu} />
      <circle cx="60" cy="203" r="7" fill={fonce} />
      <circle cx="110" cy="203" r="7" fill={fonce} />
      <rect x="70" y="150" width="40" height="22" rx="3" fill={bleu} />
      <line x1="90" y1="155" x2="350" y2="25" stroke={bleu} strokeWidth="7" strokeLinecap="round" />
      <line x1="90" y1="150" x2="90" y2="215" stroke={gris} strokeDasharray="4 3" />
      <text x="94" y="226" fontSize="11" fill={fonce}>axe de rotation</text>
      {/* Câble, crochet, élingues, charge */}
      <line x1="350" y1="25" x2="350" y2="75" stroke={fonce} strokeWidth="1.5" />
      <path d="M350 75 q6 6 0 12 q-6 -2 -3 -6" fill="none" stroke={fonce} strokeWidth="2" />
      <line x1="350" y1="87" x2="325" y2="115" stroke={fonce} strokeWidth="1.2" />
      <line x1="350" y1="87" x2="375" y2="115" stroke={fonce} strokeWidth="1.2" />
      <rect x="318" y="115" width="64" height="26" fill={clair} stroke={fonce} strokeWidth="1.5" />
      {/* Support de pose (dalle) */}
      <rect x="290" y="141" width="120" height="64" fill={clair} stroke={gris} strokeWidth="1.5" />
      <line x1="290" x2="410" y1="141" y2="141" stroke={fonce} strokeWidth="3" />
      <text x="350" y="178" fontSize="11" textAnchor="middle" fill={fonce}>dalle, plancher,</text>
      <text x="350" y="192" fontSize="11" textAnchor="middle" fill={fonce}>camion…</text>
      {/* Cotes */}
      <line x1="90" x2="350" y1="218" y2="218" stroke={rouge} strokeWidth="1.5" markerEnd="url(#fl-aide)" markerStart="url(#fl-aide)" />
      <text x="220" y="214" fontSize="12" fontWeight="700" textAnchor="middle" fill={rouge}>Portée (rayon)</text>
      <line x1="430" x2="430" y1="205" y2="141" stroke={rouge} strokeWidth="1.5" markerEnd="url(#fl-aide)" markerStart="url(#fl-aide)" />
      <text x="436" y="177" fontSize="12" fontWeight="700" fill={rouge}>Hauteur d&apos;appui</text>
      <line x1="400" x2="400" y1="141" y2="115" stroke={fonce} strokeWidth="1.2" />
      <text x="436" y="132" fontSize="11" fill={fonce}>+ hauteur de charge</text>
      <text x="436" y="103" fontSize="11" fill={fonce}>+ élingage</text>
      <line x1="470" x2="470" y1="205" y2="80" stroke={fonce} strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="436" y="72" fontSize="12" fontWeight="700" fill={fonce}>= hauteur sous crochet</text>
      <defs>
        <marker id="fl-aide" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={rouge} />
        </marker>
      </defs>
    </svg>
  );
}

export function StepGeometrie() {
  const data = useStudy((s) => s.data);
  const g = data.geometrie;
  const axeY = data.machine.selection?.chart?.axisY ?? null;
  const patch = useStudy((s) => s.patch);
  const ajouter = useStudy((s) => s.ajouterPosition);
  const maj = useStudy((s) => s.majPosition);
  const suppr = useStudy((s) => s.supprimerPosition);
  const ajouterObstacle = useStudy((s) => s.ajouterObstacle);
  const majObstacle = useStudy((s) => s.majObstacle);
  const supprObstacle = useStudy((s) => s.supprimerObstacle);
  const err = useErreurs("geometrie");
  const hsc = hauteurSousCrochet(data);
  const calcule = hsc.calc.value;
  const appuiHaut = g.positions.reduce<{ nom: string; h: number } | null>((best, p, i) => {
    const h = p.hauteurAppuiM ?? null;
    return h !== null && (best === null || h > best.h) ? { nom: p.nom.trim() || `Position ${i + 1}`, h } : best;
  }, null)?.nom;

  const avecY = axeY !== null && axeY !== "none";
  const libelleY = axeY === "height_m" ? "Hauteur de levage (lue à l'abaque)" : "Longueur de flèche (abaque)";
  const aideY =
    axeY === "height_m"
      ? "Ordonnée de l'abaque à cette position : au moins la hauteur sous crochet nécessaire."
      : "Longueur de flèche déployée retenue pour cette position (ordonnée de l'abaque).";

  return (
    <StepShell
      numero={5}
      titre="Géométrie du levage"
      description="Pour chaque position : la portée et la hauteur du point où la charge est prise ou posée. La capacité est lue à l'abaque pour chaque position ; la plus défavorable détermine le taux d'utilisation."
    >
      <details className="rounded-lg border border-border bg-vinci-bleu-xlight/50 p-3" open>
        <summary className="cursor-pointer text-sm font-semibold text-primary">Que faut-il mesurer ?</summary>
        <div className="mt-2 flex flex-col gap-2 text-sm">
          <SchemaAide />
          <p>
            <strong>Portée</strong> : distance horizontale entre l&apos;axe de rotation de la machine et le centre de la charge.{" "}
            <strong>Hauteur d&apos;appui</strong> : niveau où la charge repose (prise) ou sera posée (pose), mesuré depuis le sol où se trouve la machine.
            La hauteur sous crochet nécessaire en est déduite.
          </p>
        </div>
      </details>
      {axeY === null && (
        <p className="rounded-md bg-vinci-bleu-xlight p-3 text-sm">
          Choisissez d&apos;abord la machine (étape 4) : l&apos;abaque indique si une longueur de flèche ou une hauteur est demandée en plus de la portée.
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {g.positions.map((p, i) => {
          const rl = ROLES[role(p)];
          const Icone = rl.icone;
          return (
            <li key={p.id} className="rounded-lg border border-border bg-vinci-gris-light/40 p-4" data-testid="position-geometrie">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <span className="flex size-8 items-center justify-center rounded-full bg-vinci-bleu text-white">
                    <Icone className="size-4" aria-hidden />
                  </span>
                  Position {i + 1} · <span className="font-normal text-foreground/80">{rl.titre}</span>
                </span>
                <Button type="button" variant="ghost" size="icon" onClick={() => suppr(p.id)} aria-label={`Supprimer la position ${i + 1}`}>
                  <Trash2 className="text-vinci-rouge" />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <TextField label="Nom" value={p.nom} onChange={(v) => maj(p.id, { nom: v })} error={err[`positions.${i}.nom`]} />
                <NumberField
                  label="Portée (rayon)"
                  unite="m"
                  value={p.porteeM}
                  onChange={(v) => maj(p.id, { porteeM: v })}
                  error={err[`positions.${i}.porteeM`]}
                  hint="Axe de rotation → centre de la charge, à l'horizontale."
                />
                <NumberField
                  label={rl.appui}
                  unite="m"
                  value={p.hauteurAppuiM ?? null}
                  onChange={(v) => maj(p.id, { hauteurAppuiM: v === null ? null : Math.max(0, v) })}
                  hint={rl.aide}
                />
                {avecY && (
                  <div className="flex flex-col gap-1">
                    <NumberField label={libelleY} unite="m" value={p.yM} onChange={(v) => maj(p.id, { yM: v })} error={err[`positions.${i}.yM`]} hint={aideY} />
                    {axeY === "height_m" && p.yM === null && hsc.valeurM !== null && (
                      <button type="button" className="self-start text-xs font-semibold text-primary underline" onClick={() => maj(p.id, { yM: hsc.valeurM })}>
                        Reprendre la hauteur sous crochet ({m(hsc.valeurM)})
                      </button>
                    )}
                  </div>
                )}
                <NumberField
                  label="Angle dans le plan (facultatif)"
                  unite="°"
                  value={p.angleDeg ?? null}
                  onChange={(v) => maj(p.id, { angleDeg: v })}
                  hint="0° = haut du plan, sens horaire. Sert à la vue en plan."
                />
              </div>
            </li>
          );
        })}
      </ul>
      {err.positions && g.positions.length === 0 && <p className="text-sm text-vinci-rouge">{err.positions}</p>}
      <Button type="button" variant="outline" size="lg" className="self-start" onClick={ajouter}>
        <Plus />
        Ajouter une position
      </Button>

      <SousTitre>Hauteur sous crochet nécessaire</SousTitre>
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          label="Hauteur d'élingage"
          unite="m"
          value={g.hauteurElingageM ?? null}
          onChange={(v) => patch("geometrie", { hauteurElingageM: v })}
          hint="Du crochet au dessus de la charge : élingues, palonnier, manilles."
        />
        <NumberField
          label="Garde de franchissement"
          unite="m"
          value={g.gardeM ?? null}
          onChange={(v) => patch("geometrie", { gardeM: v })}
          hint="Marge au-dessus de l'appui le plus haut, fixée par le chef de manœuvre."
        />
        <NumberField
          label="Valeur forcée (facultatif)"
          unite="m"
          value={g.hauteurSousCrochetM}
          onChange={(v) => patch("geometrie", { hauteurSousCrochetM: v })}
          hint="Laisser vide pour utiliser la valeur calculée."
        />
      </div>
      <section aria-label="Hauteur sous crochet nécessaire" data-testid="hauteur-crochet" className="rounded-lg border border-primary bg-vinci-bleu-xlight p-4 text-sm">
        {calcule === null ? (
          <p className="text-foreground/80">
            Saisissez la hauteur du point de prise ou de pose ci-dessus (et la hauteur de la charge à l&apos;étape Charge) pour calculer la hauteur sous crochet
            nécessaire.
          </p>
        ) : (
          <>
            <p className="text-2xl font-bold tabular-nums text-primary">
              {m(calcule)}
              <span className="ml-2 text-base font-semibold text-foreground/80">hauteur sous crochet calculée</span>
            </p>
            <p className="mt-1">
              H = appui le plus haut {m(Number(hsc.calc.inputs.Ha.value))}
              {appuiHaut ? ` (« ${appuiHaut} »)` : ""} + charge{" "}
              {m(Number(hsc.calc.inputs.Hc.value))} + élingage {m(Number(hsc.calc.inputs.He.value))} + garde {m(Number(hsc.calc.inputs.g.value))}
            </p>
            {hsc.calc.warnings.length > 0 && <p className="mt-1 text-vinci-rouge-dark">{hsc.calc.warnings.join(" ")}</p>}
          </>
        )}
        {hsc.mode === "saisie" && (
          <p className="mt-2 font-semibold text-vinci-rouge-dark">
            Valeur forcée retenue : {m(hsc.valeurM as number)}
            {calcule !== null && calcule > (hsc.valeurM as number) ? ` (inférieure à la valeur calculée de ${m(calcule)})` : ""}.
          </p>
        )}
      </section>

      <SousTitre>Obstacles chiffrés (schéma en élévation)</SousTitre>
      <ul className="flex flex-col gap-3">
        {(g.obstaclesSaisis ?? []).map((o, i) => (
          <li key={o.id} className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <TextField className="col-span-2 sm:col-span-1" label={`Obstacle ${i + 1}`} value={o.nom} onChange={(v) => majObstacle(o.id, { nom: v })} />
            <NumberField label="Distance à l'axe" unite="m" value={o.distanceM} onChange={(v) => majObstacle(o.id, { distanceM: v })} />
            <NumberField label="Hauteur" unite="m" value={o.hauteurM} onChange={(v) => majObstacle(o.id, { hauteurM: v })} />
            <Button type="button" variant="ghost" size="icon" onClick={() => supprObstacle(o.id)} aria-label={`Supprimer l'obstacle ${i + 1}`}>
              <Trash2 className="text-vinci-rouge" />
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" size="lg" className="self-start" onClick={ajouterObstacle}>
        <Plus />
        Ajouter un obstacle
      </Button>
      <TextAreaField
        label="Obstacles (description libre)"
        value={g.obstacles}
        onChange={(v) => patch("geometrie", { obstacles: v })}
        placeholder="Bâtiments, arbres, autres engins, ouvrages à franchir…"
      />
    </StepShell>
  );
}
