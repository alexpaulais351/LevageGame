/**
 * Conversion d'un schéma SVG affiché en PNG (navigateur uniquement), pour l'insérer dans le document Word.
 * Les couleurs `var(--color-…)` sont résolues depuis les jetons CSS de la page (charte VINCI).
 */
import type { ImagePng } from "./demande-docx";

export async function svgEnPng(svg: SVGSVGElement, largeurPx = 1800): Promise<ImagePng | null> {
  const vb = svg.viewBox.baseVal;
  if (!vb || vb.width === 0) return null;
  const styles = getComputedStyle(document.documentElement);
  const source = new XMLSerializer()
    .serializeToString(svg)
    .replace(/var\((--[\w-]+)\)/g, (_, nom: string) => styles.getPropertyValue(nom).trim() || "#000000")
    // Police de la charte non disponible dans l'image : repli Arial (comme le document Word).
    .replace("<svg ", '<svg font-family="Arial, Helvetica, sans-serif" ');
  const hauteurPx = Math.round((largeurPx * vb.height) / vb.width);
  const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new window.Image();
    await new Promise<void>((ok, ko) => {
      img.onload = () => ok();
      img.onerror = () => ko(new Error("SVG illisible"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = largeurPx;
    canvas.height = hauteurPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, largeurPx, hauteurPx);
    ctx.drawImage(img, 0, 0, largeurPx, hauteurPx);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
    if (!blob) return null;
    return { png: new Uint8Array(await blob.arrayBuffer()), largeur: largeurPx, hauteur: hauteurPx };
  } finally {
    URL.revokeObjectURL(url);
  }
}
