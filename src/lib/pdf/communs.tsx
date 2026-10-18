/**
 * Briques communes aux trois PDF (fiche, adéquation de levage rapide, synthèse transport) :
 * bandeau d'en-tête « by EBGC » avec logo de l'entreprise de l'utilisateur, et jauge visuelle du taux d'utilisation.
 */
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";

import { VERDICT, VINCI, VINCI_PDF } from "@/lib/design-tokens";
import { formatTaux } from "@/lib/study/format";

import { pct } from "./model";

/** Logo EBGC blanc (public/ebgc-blanc.png, 195 × 69) embarqué : utilisable sans réseau, dans le navigateur comme en test Node. */
export const EBGC_LOGO_DATA_URI =
  "data:image/png;base64,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";

/** Hauteur du bandeau bleu d'en-tête (pt), commune aux trois documents. */
export const HAUTEUR_BANDE = 64;

const s = StyleSheet.create({
  bande: { backgroundColor: VINCI_PDF.headerBg, height: HAUTEUR_BANDE, paddingHorizontal: 34, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  gauche: { justifyContent: "center", maxWidth: 200 },
  logo: { height: 30, maxWidth: 140, objectFit: "contain" },
  entreprise: { color: VINCI_PDF.headerText, fontSize: 11, fontWeight: 700 },
  by: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  byTexte: { color: VINCI_PDF.headerText, fontSize: 7.5, fontStyle: "italic", marginRight: 4 },
  byLogo: { height: 13, width: 37 },
  droite: { alignItems: "flex-end", maxWidth: 360 },
  titre: { color: VINCI_PDF.headerText, fontSize: 14, fontWeight: 700, letterSpacing: 0.6 },
  ligne: { color: VINCI_PDF.headerText, fontSize: 7.5, marginTop: 2, textAlign: "right" },
});

export interface EnteteBandeProps {
  /** Logo de l'entreprise de l'utilisateur (data-URI) s'il l'a renseigné dans son profil. */
  logoUrl: string | null | undefined;
  /** Nom de l'entreprise, affiché si aucun logo. */
  entreprise: string | null | undefined;
  titre: string;
  /** Lignes d'information sous le titre (date, rédacteur, projet…). */
  lignes: string[];
}

/** Bandeau bleu d'en-tête : logo ou nom de l'entreprise de l'utilisateur + « by EBGC » (toujours), titre et lignes à droite. */
export function EnteteBande({ logoUrl, entreprise, titre, lignes }: EnteteBandeProps) {
  return (
    <View style={s.bande}>
      <View style={s.gauche}>
        {logoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- <Image> de @react-pdf (PDF), pas un <img> HTML
          <Image src={logoUrl} style={s.logo} />
        ) : entreprise ? (
          <Text style={s.entreprise}>{entreprise}</Text>
        ) : null}
        <View style={[s.by, { marginTop: logoUrl || entreprise ? 4 : 0 }]}>
          <Text style={s.byTexte}>by</Text>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- <Image> de @react-pdf (PDF), pas un <img> HTML */}
          <Image src={EBGC_LOGO_DATA_URI} style={s.byLogo} />
        </View>
      </View>
      <View style={s.droite}>
        <Text style={s.titre}>{titre}</Text>
        {lignes.map((l, i) => (
          <Text key={i} style={s.ligne}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Échelle de la jauge (ratio) : 0 à 120 %, comme à l'écran. */
export const JAUGE_MAX = 1.2;

const COULEUR_ZONE = { vert: VERDICT.vert, orange: VERDICT.jaune, rouge: VERDICT.rouge } as const;

const j = StyleSheet.create({
  bloc: { borderWidth: 0.5, borderColor: VINCI_PDF.border, padding: 8, marginBottom: 8 },
  tete: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 },
  libelle: { fontSize: 8, fontWeight: 700, color: VINCI.bleu, letterSpacing: 0.4 },
  valeur: { fontSize: 18, fontWeight: 700 },
  piste: { height: 12, borderRadius: 6, backgroundColor: VINCI_PDF.rowAlt, overflow: "hidden" },
  remplissage: { height: 12, borderRadius: 6 },
  repere: { position: "absolute", top: 0, width: 1.2, height: 12, backgroundColor: VINCI.noir },
  legende: { position: "relative", height: 10, marginTop: 2 },
  legendeTexte: { position: "absolute", fontSize: 7, color: "#555555" },
  note: { fontSize: 7, color: "#555555", marginTop: 3 },
});

export interface JaugeTauxProps {
  /** Taux d'utilisation (ratio) ; null = non calculable ; Infinity = hors abaque. */
  taux: number | null;
  zone: "vert" | "orange" | "rouge" | null;
  seuilVert: number;
  seuilOrange: number;
  /** Texte sous la jauge (position la plus défavorable, par exemple). */
  note?: string;
}

/** Jauge visuelle du taux d'utilisation (0–120 %), même lecture que la jauge de l'écran : remplissage à la couleur de la zone, repères aux seuils. */
export function JaugeTaux({ taux, zone, seuilVert, seuilOrange, note }: JaugeTauxProps) {
  const p = (r: number) => `${Math.min(100, Math.max(0, (r / JAUGE_MAX) * 100))}%`;
  const rempli = taux === null ? 0 : Number.isFinite(taux) ? taux : JAUGE_MAX;
  const texte = taux === null ? "—" : Number.isFinite(taux) ? formatTaux(taux) : "hors abaque";
  const couleur = zone ? COULEUR_ZONE[zone] : VINCI.gris;
  return (
    <View style={j.bloc} wrap={false}>
      <View style={j.tete}>
        <Text style={j.libelle}>TAUX D&apos;UTILISATION</Text>
        <Text style={[j.valeur, { color: couleur }]}>{texte}</Text>
      </View>
      <View style={j.piste}>
        <View style={[j.remplissage, { width: p(rempli), backgroundColor: couleur }]} />
        {[seuilVert, seuilOrange].map((x) => (
          <View key={x} style={[j.repere, { left: p(x) }]} />
        ))}
      </View>
      <View style={j.legende}>
        <Text style={[j.legendeTexte, { left: 0 }]}>0</Text>
        <Text style={[j.legendeTexte, { left: p(seuilVert), marginLeft: -10 }]}>{pct(seuilVert)}</Text>
        <Text style={[j.legendeTexte, { left: p(seuilOrange), marginLeft: -11 }]}>{pct(seuilOrange)}</Text>
        <Text style={[j.legendeTexte, { right: 0 }]}>{pct(JAUGE_MAX)}</Text>
      </View>
      <Text style={j.note}>
        {note ? `${note} · ` : ""}Vert sous {pct(seuilVert)} · orange jusqu&apos;à {pct(seuilOrange)} · rouge au-delà (taux supérieur à 100 % ou hors abaque : non adéquat).
      </Text>
    </View>
  );
}
