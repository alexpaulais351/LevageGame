import { VINCI } from "@/lib/design-tokens";
import { LIBELLE_TYPE, typeMachineDepuis } from "@/lib/visuals/silhouettes";

import { MachineVignette } from "../visuals/SilhouetteSvg";

/** Vignette d'une machine : photo de la machine réelle si présente, sinon silhouette indicative du type. */
export function VignetteMachine({
  typeCode,
  typeLabel,
  photoUrl,
  largeur = 96,
  alt,
}: {
  typeCode: string;
  typeLabel: string;
  photoUrl?: string | null;
  largeur?: number;
  alt: string;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL signée d'un bucket privé, pas d'optimisation possible
      <img
        src={photoUrl}
        alt={alt}
        width={largeur}
        height={Math.round(largeur * 0.78)}
        data-testid="photo-machine"
        className="shrink-0 rounded-md border border-border object-cover"
        style={{ width: largeur, height: Math.round(largeur * 0.78), background: VINCI.grisLight }}
      />
    );
  }
  const type = typeMachineDepuis(typeCode, typeLabel);
  if (!type) return <div className="shrink-0 rounded-md border border-border bg-vinci-gris-light" style={{ width: largeur, height: Math.round(largeur * 0.78) }} role="img" aria-label={LIBELLE_TYPE.grue_mobile} />;
  return <MachineVignette type={type} largeur={largeur} className="shrink-0 rounded-md border border-border" />;
}
