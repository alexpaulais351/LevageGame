import { describe, expect, it } from "vitest";

import { calageDepuisSpecs } from "@/lib/catalog";
import { buildPdfModel } from "@/lib/pdf/model";
import { computeStudy } from "@/lib/study/compute";
import { createInitialData } from "@/lib/study/defaults";

import { PDF_TAILLE_MAX, PHOTO_TAILLE_MAX, cheminPhoto, cheminSourcePdf, validerPdf, validerPhoto } from "./files";
import { mapMachine } from "./queries";
import {
  abaqueSaisiSchema,
  configurationAvecAbaqueSchema,
  configurationSchema,
  machinePersoSchema,
  paramsSchema,
  paramsVersJson,
  sourceSaisieSchema,
  specsDepuisJson,
  specsSchema,
  specsVersJson,
  verifierSchema,
} from "./schemas";

const ID = "3f2b8f2e-6c1d-4f1e-9d6a-0c5a2f7b9e11";
const octets = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PNG = octets(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const JPG = octets(0xff, 0xd8, 0xff, 0xe0);
const PDF = octets(0x25, 0x50, 0x44, 0x46, 0x2d);

describe("fichiers joints", () => {
  it("photo : PNG/JPEG ≤ 2 Mo avec signature cohérente", () => {
    expect(validerPhoto({ type: "image/png", size: 1000, entete: PNG })).toEqual({ ok: true, ext: "png", mime: "image/png" });
    expect(validerPhoto({ type: "image/jpeg", size: PHOTO_TAILLE_MAX, entete: JPG })).toEqual({ ok: true, ext: "jpg", mime: "image/jpeg" });
    expect(validerPhoto({ type: "image/jpeg", size: PHOTO_TAILLE_MAX + 1, entete: JPG })).toMatchObject({ ok: false, error: expect.stringMatching(/2 Mo/) });
    expect(validerPhoto({ type: "image/gif", size: 10, entete: PNG })).toMatchObject({ ok: false });
    expect(validerPhoto({ type: "image/png", size: 10, entete: JPG })).toMatchObject({ ok: false, error: expect.stringMatching(/contenu/) });
    expect(validerPhoto({ type: "image/png", size: 0, entete: PNG })).toMatchObject({ ok: false });
  });
  it("PDF constructeur : application/pdf ≤ 15 Mo avec signature %PDF-", () => {
    expect(validerPdf({ type: "application/pdf", size: PDF_TAILLE_MAX, entete: PDF })).toMatchObject({ ok: true, ext: "pdf" });
    expect(validerPdf({ type: "application/pdf", size: PDF_TAILLE_MAX + 1, entete: PDF })).toMatchObject({ ok: false, error: expect.stringMatching(/15 Mo/) });
    expect(validerPdf({ type: "text/html", size: 10, entete: PDF })).toMatchObject({ ok: false });
    expect(validerPdf({ type: "application/pdf", size: 10, entete: PNG })).toMatchObject({ ok: false, error: expect.stringMatching(/pas un PDF/) });
  });
  it("chemins sous <uid>/machines/<id>/", () => {
    expect(cheminPhoto("u1", "m1", "jpg")).toBe("u1/machines/m1/photo.jpg");
    expect(cheminSourcePdf("u1", "m1")).toBe("u1/machines/m1/source.pdf");
  });
});

describe("schémas Zod machines", () => {
  it("machine : modèle requis, calage en couple, valeurs > 0", () => {
    const ok = machinePersoSchema.safeParse({ typeId: ID, manufacturerId: ID, model: " LTM 1100 ", specs: { masseKg: 60000, calageLongueurM: 7, calageLargeurM: 7.5 } });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.model).toBe("LTM 1100");
      expect(ok.data.specs.longueurM).toBeNull();
    }
    expect(machinePersoSchema.safeParse({ typeId: ID, manufacturerId: ID, model: "", specs: {} }).success).toBe(false);
    expect(machinePersoSchema.safeParse({ typeId: "x", manufacturerId: ID, model: "A", specs: {} }).success).toBe(false);
    expect(specsSchema.safeParse({ calageLongueurM: 5 }).success).toBe(false);
    expect(specsSchema.safeParse({ masseKg: -1 }).success).toBe(false);
    expect(specsSchema.safeParse({ masseKg: 0 }).success).toBe(false);
  });
  it("specs ↔ JSON : seules les valeurs connues sont stockées", () => {
    const s = specsSchema.parse({ masseKg: 1200, calageLongueurM: 3.4, calageLargeurM: 3.8 });
    const j = specsVersJson(s);
    expect(j).toEqual({ masse_kg: 1200, calage: { longueurM: 3.4, largeurM: 3.8 } });
    expect(specsDepuisJson(j)).toEqual(s);
    expect(specsDepuisJson(null).masseKg).toBeNull();
    expect(specsDepuisJson({ calage: { longueurM: 3 } }).calageLongueurM).toBeNull();
  });
  it("paramètres libres : clés uniques (insensible à la casse), objet stocké", () => {
    expect(paramsSchema.safeParse([{ cle: "Flèche", valeur: "30 m" }, { cle: "flèche", valeur: "x" }]).success).toBe(false);
    expect(paramsSchema.safeParse([{ cle: " ", valeur: "x" }]).success).toBe(false);
    const p = paramsSchema.parse([{ cle: " Flèche ", valeur: " 30 m " }, { cle: "Calage", valeur: "100 %" }]);
    expect(paramsVersJson(p)).toEqual({ Flèche: "30 m", Calage: "100 %" });
  });
  it("configuration : libellé requis, moufle ≥ 0", () => {
    expect(configurationSchema.safeParse({ label: "", params: [], moufleKg: null }).success).toBe(false);
    expect(configurationSchema.safeParse({ label: "A", params: [], moufleKg: -1 }).success).toBe(false);
    expect(configurationSchema.parse({ label: "A", params: [] }).moufleKg).toBeNull();
  });
  it("source : titre requis, URL http(s) seulement", () => {
    expect(sourceSaisieSchema.safeParse({ documentTitle: "" }).success).toBe(false);
    expect(sourceSaisieSchema.safeParse({ documentTitle: "T", url: "javascript:alert(1)" }).success).toBe(false);
    expect(sourceSaisieSchema.parse({ documentTitle: "T", url: "https://exemple.test/doc.pdf", reference: "" }).reference).toBeNull();
  });
  it("abaque et configuration complète", () => {
    const abaque = { mode: "csv", csv: "radius_m,y,capacity\n3,0,1", grille: [], axisY: "none", unit: "kg", standard: "", deductionsIncluded: false, interpolationAllowed: false };
    expect(abaqueSaisiSchema.safeParse(abaque).success).toBe(true);
    expect(abaqueSaisiSchema.safeParse({ ...abaque, unit: "lb" }).success).toBe(false);
    expect(abaqueSaisiSchema.safeParse({ ...abaque, mode: "xlsx" }).success).toBe(false);
    expect(configurationAvecAbaqueSchema.safeParse({ machineId: ID, configuration: { label: "C", params: [] }, source: { documentTitle: "T" }, abaque }).success).toBe(true);
    expect(configurationAvecAbaqueSchema.safeParse({ machineId: "x", configuration: { label: "C", params: [] }, source: { documentTitle: "T" }, abaque }).success).toBe(false);
  });
  it("vérification : la case de confirmation est obligatoire", () => {
    expect(verifierSchema.safeParse({ chartId: ID, confirme: false }).success).toBe(false);
    expect(verifierSchema.safeParse({ chartId: ID }).success).toBe(false);
    expect(verifierSchema.safeParse({ chartId: ID, confirme: true }).success).toBe(true);
  });
});

describe("lecture des machines", () => {
  it("mapMachine : statut, source, nombre de nœuds ; l'abaque vérifié prime", () => {
    const m = mapMachine(
      {
        id: "m1",
        model: "X",
        specs: { masse_kg: 100 },
        owner_id: "u1",
        type: { id: "t", code: "grue_mobile", label: "Grue mobile sur pneus" },
        manufacturer: [{ id: "f", name: "Liebherr" }],
        configurations: [
          {
            id: "c1",
            label: "B",
            params: { Flèche: "30 m" },
            hook_block_mass_kg: "250.00",
            notes: null,
            charts: [
              { id: "k1", status: "a_verifier", axis_y: "none", standard: null, verified_at: null, source: null, points: [{ count: 3 }] },
              { id: "k2", status: "verifie", axis_y: "none", standard: "EN 13000", verified_at: "2026-10-11T10:00:00Z", source: [{ document_title: "Doc", reference: "R", edition: null, url: "https://x.test", publisher: null, file_path: "u1/machines/m1/source.pdf" }], points: [{ count: 5 }] },
            ],
          },
          { id: "c0", label: "A", params: null, hook_block_mass_kg: null, notes: null, charts: [] },
        ],
      },
      "u1/machines/m1/photo.jpg",
    );
    expect(m.perso).toBe(true);
    expect(m.manufacturerName).toBe("Liebherr");
    expect(m.configurations.map((c) => c.label)).toEqual(["A", "B"]);
    expect(m.configurations[0].abaque).toBeNull();
    const b = m.configurations[1];
    expect(b.moufleKg).toBe(250);
    expect(b.abaque).toMatchObject({ id: "k2", status: "verifie", nbPoints: 5, source: { titre: "Doc", pdfPath: "u1/machines/m1/source.pdf" } });
    expect(m.specs.masseKg).toBe(100);
  });
  it("catalogue public : owner_id NULL ⇒ pas perso", () => {
    expect(mapMachine({ id: "m", model: "Y", specs: {}, owner_id: null, type: null, manufacturer: null, configurations: [] }).perso).toBe(false);
  });
  it("calageDepuisSpecs", () => {
    expect(calageDepuisSpecs({ calage: { longueurM: 6, largeurM: 7 } })).toEqual({ longueurM: 6, largeurM: 7 });
    expect(calageDepuisSpecs({ calage: { longueurM: 6 } })).toBeNull();
    expect(calageDepuisSpecs(null)).toBeNull();
  });
});

describe("PDF : photo de la machine personnelle", () => {
  const chart = {
    id: "c",
    axisX: "radius_m" as const,
    axisY: "none" as const,
    points: [{ x: 3, y: null, capacityKg: 1000 }],
    interpolationAllowed: false,
    status: "a_verifier" as const,
    standard: "EN 13000",
    source: { title: "FICTIF", reference: "R", edition: "", url: "" },
    deductionsIncluded: false,
  };
  const sel = { typeId: "t", typeLabel: "Grue", manufacturerId: "f", manufacturerName: "F", machineId: "m", model: "M", configurationId: "c", configurationLabel: "C", chart };
  const meta = { genereLe: new Date("2026-10-11T10:00:00Z"), machinePhotoUrl: "data:image/png;base64,AAAA" };
  const model = (selection: typeof sel & { personnelle?: boolean }) => {
    const d = createInitialData();
    d.machine.selection = selection;
    return buildPdfModel(d, computeStudy(d), meta);
  };
  it("photo reprise dans la section machine pour une machine personnelle uniquement", () => {
    expect(model({ ...sel, personnelle: true }).machine).toMatchObject({ photoUrl: "data:image/png;base64,AAAA", personnelle: true });
    expect(model(sel).machine).toMatchObject({ photoUrl: null, personnelle: false });
  });
});
