import { describe, expect, it } from "vitest";

import { createInitialData } from "@/lib/study/defaults";

import {
  connexionSchema,
  entrepriseSchema,
  etudeCreationSchema,
  idSchema,
  inscriptionSchema,
  nouvelleAdequationSchema,
  profilSchema,
  projetCreationSchema,
  seuilsUtilisateurSchema,
  studyDataSchema,
  versionEnregistrerSchema,
} from "./schemas";

const UUID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

describe("schémas d'authentification", () => {
  it("normalise l'e-mail", () => {
    const r = connexionSchema.parse({ email: "  Jean@Example.FR ", motDePasse: "x" });
    expect(r.email).toBe("jean@example.fr");
  });
  it("refuse e-mail invalide et mot de passe court", () => {
    const ok = { nom: "Alex", entreprise: "BTP", email: "a@b.fr", motDePasse: "12345678", confirmation: "12345678" };
    expect(inscriptionSchema.safeParse({ ...ok, email: "pas-un-mail" }).success).toBe(false);
    expect(inscriptionSchema.safeParse({ ...ok, motDePasse: "1234567", confirmation: "1234567" }).success).toBe(false);
    expect(inscriptionSchema.safeParse({ ...ok, nom: " " }).success).toBe(false);
    expect(inscriptionSchema.safeParse({ ...ok, entreprise: " " }).success).toBe(false);
    expect(inscriptionSchema.safeParse({ ...ok, confirmation: "12345679" }).success).toBe(false);
    expect(inscriptionSchema.safeParse(ok).success).toBe(true);
  });
});

describe("schémas projets / études", () => {
  it("projet : nom requis, champs facultatifs vides → null", () => {
    expect(projetCreationSchema.safeParse({ nom: "  " }).success).toBe(false);
    expect(projetCreationSchema.parse({ nom: " Tour A ", adresse: "", client: "VINCI" })).toEqual({
      nom: "Tour A",
      adresse: null,
      client: "VINCI",
    });
  });
  it("étude : projetId UUID et titre requis", () => {
    expect(etudeCreationSchema.safeParse({ projetId: "abc", titre: "x" }).success).toBe(false);
    expect(etudeCreationSchema.safeParse({ projetId: UUID, titre: "" }).success).toBe(false);
    expect(etudeCreationSchema.safeParse({ projetId: UUID, titre: "Levage poutre" }).success).toBe(true);
    expect(idSchema.safeParse("1; drop table projects").success).toBe(false);
  });
  it("profil et entreprise", () => {
    expect(profilSchema.parse({ nom: "Alex", telephone: "" })).toEqual({ nom: "Alex", fonction: null, telephone: null });
    expect(entrepriseSchema.safeParse({ nom: "" }).success).toBe(false);
  });
});

describe("seuils utilisateur (miroir de la contrainte SQL)", () => {
  it("accepte 0 < vert < orange ≤ 100", () => {
    expect(seuilsUtilisateurSchema.safeParse({ vert: 80, orange: 100 }).success).toBe(true);
    expect(seuilsUtilisateurSchema.safeParse({ vert: 70.5, orange: 95 }).success).toBe(true);
  });
  it("refuse les valeurs hors bornes", () => {
    expect(seuilsUtilisateurSchema.safeParse({ vert: 0, orange: 100 }).success).toBe(false);
    expect(seuilsUtilisateurSchema.safeParse({ vert: 90, orange: 90 }).success).toBe(false);
    expect(seuilsUtilisateurSchema.safeParse({ vert: 80, orange: 101 }).success).toBe(false);
    expect(seuilsUtilisateurSchema.safeParse({ vert: undefined, orange: 100 }).success).toBe(false);
  });
});

describe("données d'étude", () => {
  it("accepte l'état initial du store", () => {
    expect(studyDataSchema.safeParse(createInitialData()).success).toBe(true);
  });
  it("refuse un état sans section opération ou trop volumineux", () => {
    expect(studyDataSchema.safeParse({}).success).toBe(false);
    const gros = createInitialData();
    gros.operation.description = "x".repeat(4000);
    gros.reserves.liste = Array.from({ length: 150 }, (_, i) => ({ id: String(i), texte: "y".repeat(4000) }));
    expect(studyDataSchema.safeParse(gros).success).toBe(false);
  });
  it("refuse des seuils hors 0–100", () => {
    const d = { ...createInitialData(), seuils: { vertPct: 80, orangePct: 250 } };
    expect(studyDataSchema.safeParse(d).success).toBe(false);
  });
  it("enregistrer une version exige un id d'étude valide", () => {
    expect(versionEnregistrerSchema.safeParse({ etudeId: "x", data: createInitialData() }).success).toBe(false);
    expect(versionEnregistrerSchema.safeParse({ etudeId: UUID, data: createInitialData() }).success).toBe(true);
  });
  it("nouvelle adéquation : un projet existant OU un nouveau projet", () => {
    const base = { titre: "T" };
    expect(nouvelleAdequationSchema.safeParse(base).success).toBe(false);
    expect(nouvelleAdequationSchema.safeParse({ ...base, projetId: UUID }).success).toBe(true);
    expect(nouvelleAdequationSchema.safeParse({ ...base, nouveauProjet: "Nouveau" }).success).toBe(true);
    expect(nouvelleAdequationSchema.safeParse({ ...base, projetId: UUID, nouveauProjet: "Nouveau" }).success).toBe(false);
  });
});
