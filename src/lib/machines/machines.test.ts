import { describe, expect, it } from "vitest";

import { calageDepuisSpecs } from "@/lib/catalog";
import { buildPdfModel } from "@/lib/pdf/model";
import { computeStudy } from "@/lib/study/compute";
import { createInitialData } from "@/lib/study/defaults";

import { mapMachine } from "./queries";
import { specsDepuisJson, specsSchema, specsVersJson } from "./schemas";

describe("caractéristiques des machines", () => {
  it("specs : valeurs > 0, calage en couple", () => {
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
