/** Rendu @react-pdf/renderer de l'adéquation de levage rapide (A4 portrait, une page en général), à la charte de la fiche. */
import { Document, Page, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

import { VERDICT, VINCI, VINCI_PDF } from "@/lib/design-tokens";

import { EnteteBande, HAUTEUR_BANDE, JaugeTaux } from "./communs";
import { PrimsSvg } from "./document";
import { pdfTexte, type CalcBloc } from "./model";
import type { Schema } from "./schemas";
import type { RapidePdfModel } from "./rapide-model";

function creerStyles(ff: string) {
  return StyleSheet.create({
    page: { fontFamily: ff, fontSize: 8.5, color: VINCI_PDF.textMain, paddingTop: HAUTEUR_BANDE + 26, paddingBottom: 54, paddingHorizontal: 34 },
    entete: { position: "absolute", top: 0, left: 0, right: 0 },
    pied: { position: "absolute", bottom: 14, left: 34, right: 34, borderTopWidth: 0.75, borderTopColor: VINCI_PDF.border, paddingTop: 4, flexDirection: "row", justifyContent: "space-between" },
    piedTexte: { fontSize: 6.5, color: VINCI_PDF.textMuted },
    section: { marginBottom: 10 },
    titreSection: { backgroundColor: VINCI.bleuXLight, borderLeftWidth: 4, borderLeftColor: VINCI.bleu, paddingVertical: 3, paddingHorizontal: 6, marginBottom: 5 },
    titreSectionTexte: { fontSize: 10.5, fontWeight: 700, color: VINCI.bleu },
    sousTitre: { fontSize: 9, fontWeight: 700, color: VINCI.bleu, marginTop: 4, marginBottom: 2 },
    texte: { fontSize: 8.5, lineHeight: 1.35 },
    muted: { fontSize: 7.5, color: "#555555", marginTop: 3, lineHeight: 1.3 },
    verdict: { borderLeftWidth: 8, paddingVertical: 9, paddingHorizontal: 10, marginBottom: 8 },
    champs: { flexDirection: "row", flexWrap: "wrap", borderWidth: 0.5, borderColor: VINCI_PDF.border },
    champ: { width: "50%", flexDirection: "row", paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: VINCI_PDF.border },
    champLabel: { width: "46%", color: "#444444", fontSize: 8 },
    champValeur: { width: "54%", fontWeight: 700, fontSize: 8.5 },
    ligneEntete: { flexDirection: "row", backgroundColor: VINCI_PDF.headerBg },
    celluleEntete: { color: VINCI_PDF.headerText, fontWeight: 700, fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
    ligne: { flexDirection: "row" },
    cellule: { fontSize: 8, paddingVertical: 2.5, paddingHorizontal: 4 },
    encadre: { borderWidth: 0.75, borderColor: VINCI.bleu, backgroundColor: VINCI.bleuXLight, padding: 6, marginTop: 4 },
    signature: { width: "49%", borderWidth: 0.75, borderColor: VINCI_PDF.border, padding: 6 },
  });
}
type Styles = ReturnType<typeof creerStyles>;

function Section({ s, titre, children }: { s: Styles; titre: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.titreSection} minPresenceAhead={110}>
        <Text style={s.titreSectionTexte}>{titre}</Text>
      </View>
      {children}
    </View>
  );
}

function Champs({ s, items }: { s: Styles; items: [string, string][] }) {
  return (
    <View style={s.champs}>
      {items.map(([l, v], i) => (
        <View key={i} style={s.champ} wrap={false}>
          <Text style={s.champLabel}>{l}</Text>
          <Text style={s.champValeur}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

function Tableau({ s, cols, lignes }: { s: Styles; cols: { label: string; w: number; align?: "left" | "right" }[]; lignes: string[][] }) {
  const total = cols.reduce((x, c) => x + c.w, 0);
  const w = (x: number) => `${(x / total) * 100}%`;
  return (
    <View>
      <View style={s.ligneEntete} wrap={false}>
        {cols.map((c, i) => (
          <Text key={i} style={[s.celluleEntete, { width: w(c.w), textAlign: c.align ?? "left" }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {lignes.map((l, k) => (
        <View key={k} style={[s.ligne, { backgroundColor: k % 2 === 0 ? VINCI.blanc : VINCI_PDF.rowAlt }]} wrap={false}>
          {cols.map((c, i) => (
            <Text key={i} style={[s.cellule, { width: w(c.w), textAlign: c.align ?? "left", fontWeight: i === 0 ? 700 : 400 }]}>
              {l[i] ?? ""}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Calcul({ s, c }: { s: Styles; c: CalcBloc }) {
  return (
    <View style={{ marginBottom: 6 }} wrap={false}>
      <View style={[s.ligneEntete, { justifyContent: "space-between" }]}>
        <Text style={s.celluleEntete}>{c.titre}</Text>
        {c.resume && <Text style={s.celluleEntete}>{c.resume}</Text>}
      </View>
      <Text style={[s.texte, { marginTop: 2 }]}>
        <Text style={{ fontWeight: 700, color: VINCI.bleu }}>Formule : </Text>
        {c.formule}
      </Text>
      <Tableau s={s} cols={[{ label: "Entrée", w: 3 }, { label: "Valeur", w: 1.4, align: "right" }]} lignes={c.entrees.map((e) => [e.label, e.valeur])} />
      {c.source && <Text style={s.muted}>Source : {c.source}</Text>}
    </View>
  );
}

function SchemaPose({ s, sc, ff }: { s: Styles; sc: Schema; ff: string }) {
  const largeur = 527;
  return (
    <View style={s.section} wrap={false}>
      <View style={s.titreSection}>
        <Text style={s.titreSectionTexte}>{sc.titre}</Text>
      </View>
      {sc.disponible ? (
        <>
          <Svg viewBox={`0 0 ${sc.w} ${sc.h}`} width={largeur} height={(largeur * sc.h) / sc.w}>
            <Rect x={0} y={0} width={sc.w} height={sc.h} fill={VINCI.blanc} stroke={VINCI_PDF.border} strokeWidth={1} />
            <PrimsSvg prims={sc.prims} ff={ff} prefixe={sc.id} />
          </Svg>
          {sc.notes.map((n, i) => (
            <Text key={i} style={s.muted}>
              {pdfTexte(n)}
            </Text>
          ))}
        </>
      ) : (
        <Text style={s.muted}>{sc.message}</Text>
      )}
    </View>
  );
}

export function SyntheseRapideDocument({ model: m, fontFamily }: { model: RapidePdfModel; fontFamily: string }) {
  const s = creerStyles(fontFamily);
  return (
    <Document title="Adéquation de levage" author={m.entete.redacteur} subject="Adéquation de levage — vérification d'une pose de charge à l'abaque" creator="Adéquation de levage">
      <Page size="A4" style={s.page}>
        <View style={s.entete} fixed>
          <EnteteBande logoUrl={m.entete.logoUrl} entreprise={m.entete.entreprise} titre={m.entete.titre} lignes={[`Date : ${m.entete.date}  ·  Rédacteur : ${m.entete.redacteur}`]} />
        </View>
        <View style={s.pied} fixed>
          <View style={{ width: "84%" }}>
            <Text style={s.piedTexte}>{m.mention}</Text>
            <Text style={s.piedTexte}>{m.cadre}</Text>
          </View>
          <Text style={s.piedTexte} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>

        <View style={[s.verdict, { backgroundColor: m.verdict.fond, borderLeftColor: m.verdict.couleur }]} wrap={false}>
          <Text style={{ fontSize: 15, fontWeight: 700 }}>{m.verdict.libelle}</Text>
          <Text style={{ fontSize: 8.5, marginTop: 3 }}>{m.verdict.sousTitre}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ width: "46%", marginRight: "2%" }}>
            <JaugeTaux taux={m.jauge.taux} zone={m.jauge.zone} seuilVert={m.jauge.seuilVert} seuilOrange={m.jauge.seuilOrange} />
          </View>
          <View style={{ width: "52%" }}>
            <Champs s={s} items={m.resultats} />
          </View>
        </View>
        {m.bloquants.map((b, i) => (
          <View key={i} style={{ borderLeftWidth: 3, borderLeftColor: VERDICT.rouge, backgroundColor: VERDICT.rougeBg, padding: 3, marginTop: 3 }} wrap={false}>
            <Text style={s.texte}>{b}</Text>
          </View>
        ))}
        {m.reserves.map((b, i) => (
          <View key={`r${i}`} style={{ borderLeftWidth: 3, borderLeftColor: VERDICT.jaune, backgroundColor: VERDICT.jauneBg, padding: 3, marginTop: 3 }} wrap={false}>
            <Text style={s.texte}>{b}</Text>
          </View>
        ))}
        {m.porteeMax && (
          <View style={s.encadre} wrap={false}>
            <Text style={{ fontSize: 9, fontWeight: 700, color: VINCI.bleu }}>Portée maximale pour cette charge : {m.porteeMax.valeur}</Text>
            <Text style={[s.texte, { marginTop: 2 }]}>{m.porteeMax.detail}</Text>
          </View>
        )}

        <View style={{ height: 8 }} />
        <SchemaPose s={s} sc={m.schema} ff={fontFamily} />
        <Section s={s} titre="1. Machine">
          <Champs s={s} items={m.machine} />
          {m.source.length > 0 && (
            <>
              <Text style={s.sousTitre}>Abaque utilisé</Text>
              <Champs s={s} items={m.source} />
            </>
          )}
        </Section>

        <Section s={s} titre="2. Charge et position de pose">
          <Champs s={s} items={m.charge} />
        </Section>

        <Section s={s} titre="3. Calculs">
          {m.calculs.map((c, i) => (
            <Calcul key={i} s={s} c={c} />
          ))}
        </Section>

        <View style={s.encadre} wrap={false}>
          <Text style={{ fontSize: 8, lineHeight: 1.35, fontWeight: 700 }}>{m.limites}</Text>
          <Text style={{ fontSize: 8, lineHeight: 1.35, marginTop: 3 }}>{m.mention} Vérifier l&apos;abaque contre la documentation de la machine réellement présente.</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }} wrap={false}>
          {["Établi par", "Visa"].map((r) => (
            <View key={r} style={s.signature}>
              <Text style={{ fontWeight: 700, color: VINCI.bleu, fontSize: 9 }}>{r}</Text>
              <Text style={{ fontSize: 8, marginTop: 6 }}>Nom, date :</Text>
              <View style={{ height: 28, borderWidth: 0.75, borderColor: "#999999", borderStyle: "dashed", marginTop: 4 }} />
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
