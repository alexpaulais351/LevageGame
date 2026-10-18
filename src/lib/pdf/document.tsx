/** Rendu @react-pdf/renderer de la fiche d'adéquation (A4 portrait) à partir du `PdfModel`. */
import { Circle, Defs, Document, G, Image, Line, LinearGradient, Page, Path, RadialGradient, Rect, Stop, StyleSheet, Svg, Text, Text as SvgText, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

import { VERDICT, VINCI, VINCI_PDF } from "@/lib/design-tokens";
import { formatMasse } from "@/lib/utils";

import {
  pct,
  pdfTexte,
  type AbaqueModel,
  type CalcBloc,
  type Champ,
  type PdfModel,
  type TauxLigne,
} from "./model";
import type { Degrade, Peinture } from "@/lib/visuals/silhouettes";

import type { Prim, Schema } from "./schemas";

const LARGEUR = 595.28 - 2 * 34; // largeur utile (pt)

function creerStyles(ff: string) {
  return StyleSheet.create({
    page: { fontFamily: ff, fontSize: 8.5, color: VINCI_PDF.textMain, paddingTop: 100, paddingBottom: 64, paddingHorizontal: 34 },
    // En-tête / pied (fixes)
    entete: { position: "absolute", top: 0, left: 0, right: 0 },
    bande: { backgroundColor: VINCI_PDF.headerBg, height: 62, paddingHorizontal: 34, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    logo: { height: 38, maxWidth: 130, objectFit: "contain" },
    entrepriseNom: { color: VINCI_PDF.headerText, fontSize: 11, fontWeight: 700 },
    enteteDroite: { alignItems: "flex-end", maxWidth: 380 },
    enteteTitre: { color: VINCI_PDF.headerText, fontSize: 14, fontWeight: 700, letterSpacing: 0.6 },
    enteteLigne: { color: VINCI_PDF.headerText, fontSize: 7.5, marginTop: 2, textAlign: "right" },
    pied: { position: "absolute", bottom: 14, left: 34, right: 34, borderTopWidth: 0.75, borderTopColor: VINCI_PDF.border, paddingTop: 4 },
    piedLigne: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    piedTexte: { fontSize: 6.5, color: VINCI_PDF.textMuted },
    // Sections
    section: { marginBottom: 12 },
    titreSection: { backgroundColor: VINCI.bleuXLight, borderLeftWidth: 4, borderLeftColor: VINCI.bleu, paddingVertical: 3, paddingHorizontal: 6, marginBottom: 6 },
    titreSectionTexte: { fontSize: 10.5, fontWeight: 700, color: VINCI.bleu },
    sousTitre: { fontSize: 9, fontWeight: 700, color: VINCI.bleu, marginTop: 6, marginBottom: 3 },
    paragraphe: { fontSize: 8.5, lineHeight: 1.35 },
    muted: { fontSize: 7.5, color: "#555555", marginTop: 3, lineHeight: 1.3 },
    // Champs
    champs: { flexDirection: "row", flexWrap: "wrap", borderWidth: 0.5, borderColor: VINCI_PDF.border },
    champ: { width: "50%", flexDirection: "row", paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: VINCI_PDF.border },
    champLabel: { width: "46%", color: "#444444", fontSize: 8 },
    champValeur: { width: "54%", fontWeight: 700, fontSize: 8.5 },
    // Tableaux
    ligneEntete: { flexDirection: "row", backgroundColor: VINCI_PDF.headerBg },
    celluleEntete: { color: VINCI_PDF.headerText, fontWeight: 700, fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
    ligne: { flexDirection: "row" },
    cellule: { fontSize: 8, paddingVertical: 2.5, paddingHorizontal: 4 },
    ligneFoot: { flexDirection: "row", backgroundColor: VINCI_PDF.footerBg },
    celluleFoot: { color: VINCI_PDF.footerText, fontWeight: 700, fontSize: 8, paddingVertical: 3, paddingHorizontal: 4 },
    // Encadrés
    mention: { borderWidth: 0.75, borderColor: VINCI.bleu, backgroundColor: VINCI.bleuXLight, padding: 6, marginBottom: 8 },
    mentionTexte: { fontSize: 8, lineHeight: 1.35 },
    verdictBandeau: { borderLeftWidth: 8, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 8 },
    verdictTitre: { fontSize: 15, fontWeight: 700 },
    // Calculs
    calc: { borderWidth: 0.5, borderColor: VINCI_PDF.border, marginBottom: 6 },
    calcEntete: { backgroundColor: VINCI_PDF.headerBg, flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 6 },
    calcTitre: { color: VINCI_PDF.headerText, fontWeight: 700, fontSize: 8.5 },
    calcCorps: { padding: 6 },
    // Signatures
    signatures: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    signature: { width: "49%", borderWidth: 0.75, borderColor: VINCI_PDF.border, padding: 6, marginBottom: 8 },
    signatureLigne: { flexDirection: "row", alignItems: "flex-end", marginTop: 7 },
    signatureTrait: { flex: 1, borderBottomWidth: 0.5, borderBottomColor: "#666666", height: 9, marginLeft: 4 },
    signatureCadre: { height: 62, borderWidth: 0.75, borderColor: "#999999", borderStyle: "dashed", marginTop: 8 },
  });
}
type Styles = ReturnType<typeof creerStyles>;

// ---------------------------------------------------------------------------
// Briques
// ---------------------------------------------------------------------------

function Section({ s, titre, children, avant = 70, rompre }: { s: Styles; titre: string; children: ReactNode; avant?: number; rompre?: boolean }) {
  return (
    <View style={s.section} break={rompre}>
      <View style={s.titreSection} minPresenceAhead={avant}>
        <Text style={s.titreSectionTexte}>{titre}</Text>
      </View>
      {children}
    </View>
  );
}

function Champs({ s, items }: { s: Styles; items: Champ[] }) {
  return (
    <View style={s.champs}>
      {items.map((c, i) => (
        <View key={i} style={s.champ} wrap={false}>
          <Text style={s.champLabel}>{pdfTexte(c.label)}</Text>
          <Text style={s.champValeur}>{pdfTexte(c.valeur)}</Text>
        </View>
      ))}
    </View>
  );
}

interface Col {
  label: string;
  /** Largeur relative. */
  w: number;
  align?: "left" | "right" | "center";
}

/** Tableau : en-tête #004489 blanc gras, lignes alternées blanc / #F0F0F0, pied optionnel #003370. */
function Tableau({ s, cols, lignes, pied, gras }: { s: Styles; cols: Col[]; lignes: string[][]; pied?: string[]; gras?: number[] }) {
  const total = cols.reduce((t, c) => t + c.w, 0);
  const largeur = (c: Col) => `${(c.w / total) * 100}%`;
  return (
    <View>
      <View style={s.ligneEntete} wrap={false}>
        {cols.map((c, i) => (
          <Text key={i} style={[s.celluleEntete, { width: largeur(c), textAlign: c.align ?? "left" }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {lignes.map((l, k) => (
        <View key={k} style={[s.ligne, { backgroundColor: k % 2 === 0 ? VINCI.blanc : VINCI_PDF.rowAlt }]} wrap={false}>
          {cols.map((c, i) => (
            <Text key={i} style={[s.cellule, { width: largeur(c), textAlign: c.align ?? "left", fontWeight: gras?.includes(i) ? 700 : 400 }]}>
              {pdfTexte(l[i] ?? "")}
            </Text>
          ))}
        </View>
      ))}
      {pied && (
        <View style={s.ligneFoot} wrap={false}>
          {cols.map((c, i) => (
            <Text key={i} style={[s.celluleFoot, { width: largeur(c), textAlign: c.align ?? "left" }]}>
              {pied[i] ?? ""}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function NoteAbaque({ s, texte }: { s: Styles; texte: string }) {
  return (
    <Text style={[s.paragraphe, { marginBottom: 8 }]} wrap={false}>
      {texte}
    </Text>
  );
}

function Jauge({ taux, seuilVert, seuilOrange, hauteur = 9 }: { taux: number | null; seuilVert: number; seuilOrange: number; hauteur?: number }) {
  const MAX = 1.2;
  const p = (r: number) => `${Math.min(100, Math.max(0, (r / MAX) * 100))}%`;
  const t = taux === null ? null : Number.isFinite(taux) ? taux : MAX;
  return (
    <View style={{ height: hauteur + 6, justifyContent: "center" }}>
      <View style={{ height: hauteur, flexDirection: "row", backgroundColor: VINCI_PDF.rowAlt }}>
        <View style={{ width: p(seuilVert), backgroundColor: VERDICT.vert }} />
        <View style={{ width: `${((seuilOrange - seuilVert) / MAX) * 100}%`, backgroundColor: VERDICT.jaune }} />
        <View style={{ flex: 1, backgroundColor: VERDICT.rouge }} />
      </View>
      {t !== null && (
        <View style={{ position: "absolute", left: p(t), top: 0, width: 3, height: hauteur + 6, marginLeft: -1.5, backgroundColor: VINCI.noir }} />
      )}
    </View>
  );
}

function BlocCalcul({ s, c }: { s: Styles; c: CalcBloc }) {
  return (
    <View style={s.calc} wrap={false}>
      <View style={s.calcEntete}>
        <Text style={s.calcTitre}>{pdfTexte(c.titre)}</Text>
        {c.resume && <Text style={s.calcTitre}>{pdfTexte(c.resume)}</Text>}
      </View>
      <View style={s.calcCorps}>
        <Text style={s.paragraphe}>
          <Text style={{ fontWeight: 700, color: VINCI.bleu }}>Formule : </Text>
          {pdfTexte(c.formule)}
        </Text>
        {c.entrees.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <Tableau s={s} cols={[{ label: "Entrée", w: 3 }, { label: "Valeur", w: 1.6, align: "right" }]} lignes={c.entrees.map((e) => [e.label, e.valeur])} />
          </View>
        )}
        {c.source && (
          <Text style={[s.paragraphe, { marginTop: 4 }]}>
            <Text style={{ fontWeight: 700, color: VINCI.bleu }}>Source : </Text>
            {pdfTexte(c.source)}
          </Text>
        )}
        {c.avertissements.map((w, i) => (
          <Text key={i} style={[s.paragraphe, { color: VINCI.rougeDark, marginTop: 2 }]}>
            • {pdfTexte(w)}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Schémas SVG
// ---------------------------------------------------------------------------

function Primitive({ p, ff, fill }: { p: Prim; ff: string; fill?: string }) {
  switch (p.k) {
    case "line":
      return <Line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.stroke} strokeWidth={p.w} strokeDasharray={p.dash} strokeOpacity={p.op} />;
    case "rect":
      return <Rect x={p.x} y={p.y} width={Math.max(0, p.w)} height={Math.max(0, p.h)} fill={p.fill ?? "none"} stroke={p.stroke} strokeWidth={p.sw} strokeDasharray={p.dash} />;
    case "path":
      return <Path d={p.d} fill={fill ?? "none"} fillOpacity={p.op} stroke={p.stroke} strokeWidth={p.sw} strokeDasharray={p.dash} />;
    case "circle":
      return <Circle cx={p.cx} cy={p.cy} r={Math.max(0, p.r)} fill={fill ?? "none"} fillOpacity={p.op} stroke={p.stroke} strokeWidth={p.sw} strokeDasharray={p.dash} />;
    case "text":
      return (
        <G transform={p.rotate ? `rotate(${p.rotate} ${p.x} ${p.y})` : undefined}>
          <SvgTexte p={p} ff={ff} />
        </G>
      );
  }
}

const r2 = (v: number) => Math.round(v * 100) / 100;

function DefDegrade({ id, g }: { id: string; g: Degrade }) {
  const arrets = g.arrets.map(([o, c, op], i) => <Stop key={i} offset={o} stopColor={c} stopOpacity={op ?? 1} />);
  return g.k === "lin" ? (
    <LinearGradient id={id} gradientUnits="userSpaceOnUse" x1={r2(g.a[0])} y1={r2(g.a[1])} x2={r2(g.b[0])} y2={r2(g.b[1])}>
      {arrets}
    </LinearGradient>
  ) : (
    <RadialGradient id={id} gradientUnits="userSpaceOnUse" cx={r2(g.c[0])} cy={r2(g.c[1])} r={Math.max(0.01, r2(g.r))}>
      {arrets}
    </RadialGradient>
  );
}

/** Primitives d'un schéma (dans un `Svg`), dégradés des illustrations d'engins compris. `prefixe` : identifiants uniques. */
export function PrimsSvg({ prims, ff, prefixe }: { prims: readonly Prim[]; ff: string; prefixe: string }) {
  const defs: { id: string; g: Degrade }[] = [];
  const peinture = (f: Peinture | undefined, i: number): string | undefined => {
    if (f === undefined || typeof f === "string") return f;
    const id = `${prefixe}g${i}`;
    defs.push({ id, g: f });
    return `url(#${id})`;
  };
  const elements = prims.map((p, i) => <Primitive key={i} p={p} ff={ff} fill={p.k === "path" || p.k === "circle" ? peinture(p.fill, i) : undefined} />);
  return (
    <>
      {defs.length > 0 && (
        <Defs>
          {defs.map((d) => (
            <DefDegrade key={d.id} id={d.id} g={d.g} />
          ))}
        </Defs>
      )}
      {elements}
    </>
  );
}

function SvgTexte({ p, ff }: { p: Extract<Prim, { k: "text" }>; ff: string }) {
  // `Text` SVG de react-pdf : ancrage via textAnchor, police via fontFamily.
  return (
    <SvgText x={p.x} y={p.y} fill={p.fill} textAnchor={p.anchor ?? "start"} style={{ fontSize: p.size, fontFamily: ff, fontWeight: p.bold ? 700 : 400 }}>
      {pdfTexte(p.t)}
    </SvgText>
  );
}
function SchemaVue({ s, sc, ff, largeur }: { s: Styles; sc: Schema; ff: string; largeur: number }) {
  return (
    <View style={{ marginBottom: 8, alignItems: "center" }} wrap={false}>
      <Text style={[s.sousTitre, { alignSelf: "flex-start" }]}>{sc.titre}</Text>
      {sc.disponible ? (
        <>
          <Svg viewBox={`0 0 ${sc.w} ${sc.h}`} width={largeur} height={(largeur * sc.h) / sc.w}>
            <Rect x={0} y={0} width={sc.w} height={sc.h} fill={VINCI.blanc} stroke={VINCI_PDF.border} strokeWidth={1} />
            <PrimsSvg prims={sc.prims} ff={ff} prefixe={sc.id} />
          </Svg>
          {sc.notes.map((n, i) => (
            <Text key={i} style={[s.muted, { alignSelf: "flex-start" }]}>
              {pdfTexte(n)}
            </Text>
          ))}
        </>
      ) : (
        <Text style={[s.muted, { alignSelf: "flex-start" }]}>{sc.message}</Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Abaque
// ---------------------------------------------------------------------------

function ExtraitAbaque({ s, a }: { s: Styles; a: AbaqueModel }) {
  const e = a.extrait;
  if (e.colonnes.length === 0 || e.lignes.length === 0) {
    return <Text style={s.muted}>Aucun extrait disponible : aucune position exploitable dans le domaine de l&apos;abaque.</Text>;
  }
  const premiere = a.axeYLibelle || "Capacité";
  const cols: Col[] = [{ label: premiere, w: 1.6 }, ...e.colonnes.map((x) => ({ label: pdfTexte(`${x} m`.replace(".", ",")), w: 1, align: "right" as const }))];
  const lignes = e.lignes.map((l) => [
    l.y === null ? "Courbe unique" : pdfTexte(`${String(l.y).replace(".", ",")} m`),
    ...l.cellules.map((c) => (c === undefined ? "" : c === null ? "—" : pdfTexte(formatMasse(c)))),
  ]);
  return (
    <View>
      <Text style={s.sousTitre}>Extrait de l&apos;abaque — colonnes : portée (m) ; lignes encadrant les positions</Text>
      <Tableau s={s} cols={cols} lignes={lignes} gras={[0]} />
      <Text style={s.muted}>
        Cellule « — » : case vide du constructeur (hors abaque). Cellule vide : pas de nœud à cette portée. {a.interpolation}
        {e.horsDomaine.length > 0 ? ` Positions hors du domaine de l'abaque : ${e.horsDomaine.join(", ")}.` : ""}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export function FicheDocument({ model: m, fontFamily }: { model: PdfModel; fontFamily: string }) {
  const s = creerStyles(fontFamily);
  const t = m.taux;
  const a = m.machine.abaque;
  return (
    <Document title={`Adéquation de levage — ${m.entete.projet}`} author={m.entete.redacteur === "—" ? undefined : m.entete.redacteur} subject="Fiche d'adéquation de levage" creator="Adéquation de levage">
      <Page size="A4" style={s.page}>
        {/* En-tête fixe */}
        <View style={s.entete} fixed>
          <View style={s.bande}>
            <View>
              {m.entete.logoUrl ? <Logo s={s} src={m.entete.logoUrl} /> : m.entete.entreprise ? <Text style={s.entrepriseNom}>{m.entete.entreprise}</Text> : null}
            </View>
            <View style={s.enteteDroite}>
              <Text style={s.enteteTitre}>{m.entete.titre}</Text>
              <Text style={s.enteteLigne}>
                Projet : {m.entete.projet}  ·  Réf. : {m.entete.reference}  ·  Indice : {m.entete.indice}
              </Text>
              <Text style={s.enteteLigne}>
                Date : {m.entete.date}  ·  Rédacteur : {m.entete.redacteur}
              </Text>
            </View>
          </View>
        </View>

        {/* Pied fixe */}
        <View style={s.pied} fixed>
          <View style={s.piedLigne}>
            <View style={{ width: "82%" }}>
              <Text style={s.piedTexte}>{m.mentionPermanente}</Text>
              <Text style={s.piedTexte}>{m.cadreCourt}</Text>
            </View>
            <Text style={s.piedTexte} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
          </View>
        </View>

        {/* Synthèse (page 1) */}
        <View style={[s.verdictBandeau, { backgroundColor: m.verdict.fond, borderLeftColor: m.verdict.couleur }]} wrap={false}>
          <Text style={s.verdictTitre}>{m.verdict.libelle}</Text>
          <Text style={{ fontSize: 9, marginTop: 2 }}>
            Taux d&apos;utilisation (position la plus défavorable) : <Text style={{ fontWeight: 700 }}>{m.verdict.tauxTexte}</Text>
            {m.verdict.positionDefavorable !== "—" ? ` — « ${m.verdict.positionDefavorable} »` : ""}
          </Text>
          <Text style={{ fontSize: 8.5, marginTop: 2 }}>
            Charge totale : {m.verdict.chargeTotale}  ·  {m.verdict.nbBloquants} point(s) bloquant(s)  ·  {m.verdict.nbReserves} réserve(s)
          </Text>
        </View>
        {m.noteAbaque && <NoteAbaque s={s} texte={m.noteAbaque} />}
        <View style={s.mention} wrap={false}>
          <Text style={s.mentionTexte}>
            <Text style={{ fontWeight: 700 }}>Mention : </Text>
            {m.mentionPermanente}
          </Text>
          <Text style={[s.mentionTexte, { marginTop: 2 }]}>{m.cadre}</Text>
        </View>

        <Section s={s} titre="1. Opération">
          <Champs s={s} items={m.operation.champs} />
          <Text style={s.sousTitre}>Description du levage</Text>
          <Text style={s.paragraphe}>{pdfTexte(m.operation.description)}</Text>
          <Text style={s.sousTitre}>Intervenants</Text>
          <Text style={s.paragraphe}>{pdfTexte(m.operation.intervenants)}</Text>
        </Section>

        <Section s={s} titre="2. Charge">
          <Champs s={s} items={m.charge.champs} />
        </Section>

        <Section s={s} titre="3. Accessoires de levage">
          <Champs s={s} items={m.accessoires.champs} />
          {m.accessoires.lignes.length > 0 ? (
            <View style={{ marginTop: 6 }}>
              <Tableau
                s={s}
                cols={[
                  { label: "Accessoire", w: 2.4 },
                  { label: "Type", w: 1.1 },
                  { label: "CMU", w: 1.1, align: "right" },
                  { label: "Effort", w: 1.1, align: "right" },
                  { label: "Taux", w: 0.9, align: "right" },
                  { label: "Conforme", w: 1.5, align: "center" },
                ]}
                lignes={m.accessoires.lignes.map((l) => [l.label, l.type, l.cmuUtile, l.effort, l.taux, l.conforme ? "CONFORME" : "NON CONFORME"])}
              />
              <Text style={s.muted}>CMU lue sur l&apos;étiquette pour le mode d&apos;élingage utilisé. Effort comparé à l&apos;effort par brin ou à la masse de l&apos;ensemble selon l&apos;accessoire.</Text>
            </View>
          ) : (
            <Text style={s.muted}>Aucun accessoire saisi.</Text>
          )}
        </Section>

        <Section s={s} titre="4. Machine et configuration" rompre>
          <Champs s={s} items={m.machine.champs} />
          {m.machine.photoUrl && (
            <View style={{ marginTop: 4, marginBottom: 2 }} wrap={false}>
              <PhotoMachine src={m.machine.photoUrl} />
              <Text style={s.muted}>Photo de la machine réelle (fournie par l&apos;utilisateur) — indicative.</Text>
            </View>
          )}
          {m.machine.personnelle && <Text style={s.muted}>Machine personnelle de l&apos;utilisateur (hors catalogue public) : données saisies par l&apos;utilisateur d&apos;après le document constructeur joint.</Text>}
          <Text style={s.sousTitre}>Charge totale</Text>
          <Champs s={s} items={m.machine.chargeTotale} />
          {a ? (
            <View>
              <Text style={s.sousTitre}>Source de l&apos;abaque</Text>
              <Champs s={s} items={[{ label: "Identifiant", valeur: a.id }, ...a.source]} />
              <Text style={s.muted}>{a.deductions}</Text>
              <ExtraitAbaque s={s} a={a} />
            </View>
          ) : (
            <Text style={s.muted}>Aucun abaque sélectionné.</Text>
          )}
        </Section>

        <Section s={s} titre="5. Schémas" avant={330}>
          {m.schemas.map((sc) => (
            <SchemaVue key={sc.id} s={s} sc={sc} ff={fontFamily} largeur={sc.id === "plan" ? 380 : LARGEUR} />
          ))}
        </Section>

        <Section s={s} titre="6. Détail des calculs">
          {m.calculs.map((c, i) => (
            <BlocCalcul key={i} s={s} c={c} />
          ))}
        </Section>

        <Section s={s} titre="7. Taux d'utilisation par position">
          <Tableau
            s={s}
            cols={[
              { label: "Position", w: 1.6 },
              { label: "Portée", w: 1, align: "right" },
              ...(m.taux.lignes.some((l) => l.y) ? [{ label: "Flèche / haut.", w: 1, align: "right" as const }] : []),
              { label: "Capacité", w: 1.2, align: "right" },
              { label: "Taux", w: 1, align: "right" },
              { label: "Jauge (0–120 %)", w: 2.2 },
            ]}
            lignes={[]}
          />
          {m.taux.lignes.map((l, i) => (
            <LigneTaux key={i} s={s} l={l} i={i} avecY={m.taux.lignes.some((x) => x.y !== "")} seuilVert={t.seuilVert} seuilOrange={t.seuilOrange} />
          ))}
          <View style={{ marginTop: 6 }} wrap={false}>
            <Text style={s.sousTitre}>Position la plus défavorable : {m.verdict.positionDefavorable} — {t.tauxTexte}</Text>
            <Jauge taux={t.tauxMax} seuilVert={t.seuilVert} seuilOrange={t.seuilOrange} hauteur={14} />
            <Text style={s.muted}>
              Vert sous {pct(t.seuilVert)} · orange jusqu&apos;à {pct(t.seuilOrange)} · rouge au-delà (taux supérieur à 100 % ou hors abaque : non adéquat).
            </Text>
          </View>
        </Section>

        <Section s={s} titre="8. Appuis et sol">
          <Champs s={s} items={m.sol.champs} />
          {m.sol.resultat.length > 0 ? (
            <View style={{ marginTop: 6 }}>
              <Text style={s.sousTitre}>Vérification de la pression au sol</Text>
              <Champs s={s} items={m.sol.resultat} />
            </View>
          ) : (
            <Text style={s.muted}>Vérification de pression non applicable ou mode d&apos;appui non renseigné.</Text>
          )}
          {m.sol.avertissements.map((w, i) => (
            <Text key={i} style={[s.paragraphe, { color: VINCI.rougeDark, marginTop: 2 }]}>
              • {pdfTexte(w)}
            </Text>
          ))}
        </Section>

        <Section s={s} titre="9. Environnement, vent, lignes électriques et prévention">
          <Champs s={s} items={m.environnement.champs} />
          <Text style={s.sousTitre}>Mesures de prévention et points d&apos;attention</Text>
          {m.environnement.mesures.length === 0 ? (
            <Text style={s.muted}>Aucune mesure ni point d&apos;attention saisi.</Text>
          ) : (
            m.environnement.mesures.map((x, i) => (
              <Text key={i} style={[s.paragraphe, { marginBottom: 1.5 }]}>
                • {pdfTexte(x)}
              </Text>
            ))
          )}
        </Section>

        <Section s={s} titre="10. Personnel, CACES et VGP">
          <Champs s={s} items={m.personnel.champs} />
          <Text style={s.muted}>Recommandations CACES : R482, R483, R487, R489, R490. VGP : vérifications générales périodiques de l&apos;engin et des accessoires de levage.</Text>
        </Section>

        <Section s={s} titre="11. Verdict">
          <View style={[s.verdictBandeau, { backgroundColor: m.verdict.fond, borderLeftColor: m.verdict.couleur }]} wrap={false}>
            <Text style={s.verdictTitre}>{m.verdict.libelle}</Text>
            <Text style={{ fontSize: 9, marginTop: 2 }}>
              Taux maximal : {m.verdict.tauxTexte}
              {m.verdict.positionDefavorable !== "—" ? ` — « ${m.verdict.positionDefavorable} »` : ""}
            </Text>
          </View>
          <Text style={s.sousTitre}>Points bloquants ({m.conclusion.bloquants.length})</Text>
          {m.conclusion.bloquants.length === 0 ? <Text style={s.muted}>Aucun.</Text> : m.conclusion.bloquants.map((x, i) => <Puce key={i} s={s} texte={x} couleur={VERDICT.rouge} fond={VERDICT.rougeBg} />)}
          <Text style={s.sousTitre}>Réserves ({m.conclusion.reserves.length + m.conclusion.reservesLibres.length})</Text>
          {m.conclusion.reserves.length + m.conclusion.reservesLibres.length === 0 ? (
            <Text style={s.muted}>Aucune.</Text>
          ) : (
            [...m.conclusion.reserves, ...m.conclusion.reservesLibres].map((x, i) => <Puce key={i} s={s} texte={x} couleur={VERDICT.jaune} fond={VERDICT.jauneBg} />)
          )}
        </Section>

        <Section s={s} titre="12. Signatures" avant={300}>
          <View style={s.signatures}>
            {m.signatures.map((role) => (
              <View key={role} style={s.signature} wrap={false}>
                <Text style={{ fontWeight: 700, color: VINCI.bleu, fontSize: 9 }}>{role}</Text>
                {["Nom", "Fonction", "Date"].map((c) => (
                  <View key={c} style={s.signatureLigne}>
                    <Text style={{ fontSize: 8 }}>{c} :</Text>
                    <View style={s.signatureTrait} />
                  </View>
                ))}
                <View style={s.signatureCadre} />
              </View>
            ))}
          </View>
        </Section>
      </Page>
    </Document>
  );
}

function PhotoMachine({ src }: { src: string }) {
  // eslint-disable-next-line jsx-a11y/alt-text -- <Image> de @react-pdf (PDF), pas un <img> HTML
  return <Image src={src} style={{ width: 150, height: 112, objectFit: "contain", borderWidth: 0.5, borderColor: "#DCDCDC" }} />;
}

function Logo({ s, src }: { s: Styles; src: string }) {
  // eslint-disable-next-line jsx-a11y/alt-text -- <Image> de @react-pdf (PDF), pas un <img> HTML
  return <Image src={src} style={s.logo} />;
}

function Puce({ s, texte, couleur, fond }: { s: Styles; texte: string; couleur: string; fond: string }) {
  return (
    <View style={{ borderLeftWidth: 3, borderLeftColor: couleur, backgroundColor: fond, paddingVertical: 2.5, paddingHorizontal: 5, marginBottom: 2 }} wrap={false}>
      <Text style={s.paragraphe}>{pdfTexte(texte)}</Text>
    </View>
  );
}

function LigneTaux({ s, l, i, avecY, seuilVert, seuilOrange }: { s: Styles; l: TauxLigne; i: number; avecY: boolean; seuilVert: number; seuilOrange: number }) {
  const total = 1.6 + 1 + (avecY ? 1 : 0) + 1.2 + 1 + 2.2;
  const w = (x: number) => `${(x / total) * 100}%`;
  return (
    <View style={[s.ligne, { backgroundColor: i % 2 === 0 ? VINCI.blanc : VINCI_PDF.rowAlt, alignItems: "center" }]} wrap={false}>
      <Text style={[s.cellule, { width: w(1.6) }]}>{pdfTexte(l.nom)}</Text>
      <Text style={[s.cellule, { width: w(1), textAlign: "right" }]}>{pdfTexte(l.portee)}</Text>
      {avecY && <Text style={[s.cellule, { width: w(1), textAlign: "right" }]}>{pdfTexte(l.y)}</Text>}
      <Text style={[s.cellule, { width: w(1.2), textAlign: "right" }]}>{pdfTexte(l.capacite)}</Text>
      <Text style={[s.cellule, { width: w(1), textAlign: "right", fontWeight: 700, color: l.zone ? undefined : VINCI.noir }]}>{pdfTexte(l.taux)}</Text>
      <View style={{ width: w(2.2), paddingHorizontal: 4 }}>
        <Jauge taux={l.horsAbaque ? Number.POSITIVE_INFINITY : l.ratio} seuilVert={seuilVert} seuilOrange={seuilOrange} hauteur={7} />
      </View>
    </View>
  );
}
