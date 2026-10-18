/** Rendu @react-pdf/renderer de la synthèse transport (A4 portrait), à la charte de la fiche d'adéquation. */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

import { VERDICT, VINCI, VINCI_PDF } from "@/lib/design-tokens";

import { EnteteBande, HAUTEUR_BANDE } from "./communs";
import type { TransportPdfModel } from "./transport-model";

const LARGEUR = 595.28 - 2 * 34;

function creerStyles(ff: string) {
  return StyleSheet.create({
    page: { fontFamily: ff, fontSize: 8.5, color: VINCI_PDF.textMain, paddingTop: HAUTEUR_BANDE + 28, paddingBottom: 58, paddingHorizontal: 34 },
    entete: { position: "absolute", top: 0, left: 0, right: 0 },
    pied: { position: "absolute", bottom: 14, left: 34, right: 34, borderTopWidth: 0.75, borderTopColor: VINCI_PDF.border, paddingTop: 4, flexDirection: "row", justifyContent: "space-between" },
    piedTexte: { fontSize: 6.5, color: VINCI_PDF.textMuted },
    section: { marginBottom: 11 },
    titreSection: { backgroundColor: VINCI.bleuXLight, borderLeftWidth: 4, borderLeftColor: VINCI.bleu, paddingVertical: 3, paddingHorizontal: 6, marginBottom: 6 },
    titreSectionTexte: { fontSize: 10.5, fontWeight: 700, color: VINCI.bleu },
    sousTitre: { fontSize: 9, fontWeight: 700, color: VINCI.bleu, marginTop: 5, marginBottom: 2 },
    texte: { fontSize: 8.5, lineHeight: 1.35 },
    muted: { fontSize: 7.5, color: "#555555", marginTop: 3, lineHeight: 1.3 },
    decision: { borderLeftWidth: 8, paddingVertical: 9, paddingHorizontal: 10, marginBottom: 8 },
    decisionTitre: { fontSize: 13.5, fontWeight: 700 },
    reponses: { borderWidth: 0.5, borderColor: VINCI_PDF.border, marginBottom: 10 },
    reponse: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: VINCI_PDF.border, alignItems: "center" },
    champs: { flexDirection: "row", flexWrap: "wrap", borderWidth: 0.5, borderColor: VINCI_PDF.border },
    champ: { width: "50%", flexDirection: "row", paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: VINCI_PDF.border },
    champLabel: { width: "46%", color: "#444444", fontSize: 8 },
    champValeur: { width: "54%", fontWeight: 700, fontSize: 8.5 },
    ligneEntete: { flexDirection: "row", backgroundColor: VINCI_PDF.headerBg },
    celluleEntete: { color: VINCI_PDF.headerText, fontWeight: 700, fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
    ligne: { flexDirection: "row" },
    cellule: { fontSize: 8, paddingVertical: 2.5, paddingHorizontal: 4 },
    mention: { borderWidth: 0.75, borderColor: VINCI.bleu, backgroundColor: VINCI.bleuXLight, padding: 6, marginTop: 4 },
    signature: { width: "49%", borderWidth: 0.75, borderColor: VINCI_PDF.border, padding: 6 },
  });
}
type Styles = ReturnType<typeof creerStyles>;

function Section({ s, titre, children, avant = 60 }: { s: Styles; titre: string; children: ReactNode; avant?: number }) {
  return (
    <View style={s.section}>
      <View style={s.titreSection} minPresenceAhead={avant}>
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

function Tableau({ s, cols, lignes, alerte }: { s: Styles; cols: { label: string; w: number; align?: "left" | "right" }[]; lignes: string[][]; alerte?: boolean[] }) {
  const total = cols.reduce((t, c) => t + c.w, 0);
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
        <View key={k} style={[s.ligne, { backgroundColor: alerte?.[k] ? VERDICT.rougeBg : k % 2 === 0 ? VINCI.blanc : VINCI_PDF.rowAlt }]} wrap={false}>
          {cols.map((c, i) => (
            <Text key={i} style={[s.cellule, { width: w(c.w), textAlign: c.align ?? "left", fontWeight: i === 0 || (alerte?.[k] && i === cols.length - 1) ? 700 : 400 }]}>
              {l[i] ?? ""}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Puce({ s, texte, couleur, fond }: { s: Styles; texte: string; couleur: string; fond: string }) {
  return (
    <View style={{ borderLeftWidth: 3, borderLeftColor: couleur, backgroundColor: fond, paddingVertical: 2.5, paddingHorizontal: 5, marginBottom: 2 }} wrap={false}>
      <Text style={s.texte}>{texte}</Text>
    </View>
  );
}

export function SyntheseTransportDocument({ model: m, fontFamily }: { model: TransportPdfModel; fontFamily: string }) {
  const s = creerStyles(fontFamily);
  return (
    <Document title={`Synthèse transport — ${m.entete.projet}`} author={m.entete.redacteur} subject="Synthèse du transport d'une pièce" creator="Adéquation de levage">
      <Page size="A4" style={s.page}>
        <View style={s.entete} fixed>
          <EnteteBande logoUrl={m.entete.logoUrl} entreprise={m.entete.entreprise} titre={m.entete.titre} lignes={[`Projet : ${m.entete.projet}`, `Date : ${m.entete.date}  ·  Rédacteur : ${m.entete.redacteur}`]} />
        </View>
        <View style={s.pied} fixed>
          <View style={{ width: "84%" }}>
            <Text style={s.piedTexte}>{m.mention}</Text>
            <Text style={s.piedTexte}>{m.cadre}</Text>
          </View>
          <Text style={s.piedTexte} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>

        {/* Décision */}
        <View style={[s.decision, { backgroundColor: m.decision.fond, borderLeftColor: m.decision.couleur }]} wrap={false}>
          <Text style={s.decisionTitre}>{m.decision.titre}</Text>
          <Text style={{ fontSize: 8.5, marginTop: 3 }}>{m.decision.sousTitre}</Text>
        </View>
        <View style={s.reponses}>
          {m.reponses.map((r, i) => (
            <View key={i} style={[s.reponse, { backgroundColor: i % 2 === 0 ? VINCI.blanc : VINCI_PDF.rowAlt }]} wrap={false}>
              <Text style={[s.cellule, { width: "45%", fontWeight: 700, color: VINCI.bleuDark }]}>{r.question}</Text>
              <View style={{ width: 8, height: 8, borderRadius: 4, marginHorizontal: 4, backgroundColor: r.contrainte ? VERDICT.rouge : VERDICT.vert }} />
              <Text style={[s.cellule, { width: "50%", fontWeight: 700 }]}>{r.reponse}</Text>
            </View>
          ))}
        </View>

        <Section s={s} titre="1. Pièce transportée">
          <Champs s={s} items={m.piece} />
          {m.conseils.length > 0 && (
            <>
              <Text style={s.sousTitre}>Points d&apos;attention</Text>
              {m.conseils.map((c, i) => (
                <Text key={i} style={s.texte}>
                  • {c}
                </Text>
              ))}
            </>
          )}
        </Section>

        <Section s={s} titre="2. Convoi envisagé">
          <Champs s={s} items={m.convoi} />
        </Section>

        <Section s={s} titre="3. Comparaison aux seuils réglementaires" avant={120}>
          <Tableau
            s={s}
            cols={[
              { label: "Critère", w: 1.3 },
              { label: "Convoi", w: 0.9, align: "right" },
              { label: "Transport normal", w: 1.2, align: "right" },
              { label: "TE 1re cat.", w: 0.9, align: "right" },
              { label: "TE 2e cat.", w: 0.9, align: "right" },
              { label: "Résultat", w: 0.9 },
            ]}
            lignes={m.seuils.map((l) => [l.critere, l.valeur, l.normal, l.cat1, l.cat2, l.depasse ? "Dépassé" : "Conforme"])}
            alerte={m.seuils.map((l) => l.depasse)}
          />
          {m.criteres.map((c, i) => (
            <Text key={i} style={s.muted}>
              • {c}
            </Text>
          ))}
          <Text style={s.muted}>Au-delà de la 2e catégorie : 3e catégorie. La caractéristique la plus forte fixe la catégorie (arrêté du 4 mai 2006, art. 3).</Text>
        </Section>

        {m.schemas.length > 0 && (
          <View style={s.section}>
            {/* Titre et premier schéma insécables : le titre ne reste jamais seul en bas de page. */}
            {m.schemas.map((sc, i) => (
              <View key={i} wrap={false}>
                {i === 0 && (
                  <View style={s.titreSection}>
                    <Text style={s.titreSectionTexte}>4. Schémas du convoi (indicatifs, à l&apos;échelle)</Text>
                  </View>
                )}
                {/* eslint-disable-next-line jsx-a11y/alt-text -- <Image> de @react-pdf (PDF), pas un <img> HTML */}
                <Image src={sc.dataUri} style={{ width: LARGEUR * 0.8, height: LARGEUR * 0.8 * sc.ratio, marginBottom: 3, alignSelf: "center" }} />
              </View>
            ))}
          </View>
        )}

        <Section s={s} titre={`${m.schemas.length ? 5 : 4}. Accompagnement, démarches et circulation`} avant={120}>
          {m.accompagnement.map((x, i) => (
            <Puce key={i} s={s} texte={x} couleur={VINCI.bleu} fond={VINCI.bleuXLight} />
          ))}
          {m.alertesHauteur.map((x, i) => (
            <Puce key={`h${i}`} s={s} texte={x} couleur={VERDICT.rouge} fond={VERDICT.rougeBg} />
          ))}
          {m.rubriques.map((r) => (
            <View key={r.titre} wrap={false}>
              <Text style={s.sousTitre}>{r.titre}</Text>
              {r.lignes.map((l, i) => (
                <Text key={i} style={s.texte}>
                  • {l}
                </Text>
              ))}
            </View>
          ))}
        </Section>

        {m.alternatives.length > 0 && (
          <Section s={s} titre={`${m.schemas.length ? 6 : 5}. Autres véhicules possibles`} avant={90}>
            <Tableau
              s={s}
              cols={[
                { label: "Véhicule", w: 2.4 },
                { label: "Catégorie", w: 1.8 },
                { label: "Longueur", w: 0.8, align: "right" },
                { label: "Hauteur", w: 0.8, align: "right" },
                { label: "Masse", w: 0.8, align: "right" },
              ]}
              lignes={m.alternatives}
            />
          </Section>
        )}

        <View style={s.mention} wrap={false}>
          <Text style={{ fontSize: 8, lineHeight: 1.35 }}>
            {m.mention} Les seuils appliqués et leurs sources sont détaillés dans l&apos;outil. Règles d&apos;accompagnement : lecture la plus prudente des versions de l&apos;arrêté consultées.
          </Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }} wrap={false}>
          {["Établi par", "Visa du transporteur"].map((r) => (
            <View key={r} style={s.signature}>
              <Text style={{ fontWeight: 700, color: VINCI.bleu, fontSize: 9 }}>{r}</Text>
              <Text style={{ fontSize: 8, marginTop: 6 }}>Nom, date :</Text>
              <View style={{ height: 30, borderWidth: 0.75, borderColor: "#999999", borderStyle: "dashed", marginTop: 4 }} />
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
