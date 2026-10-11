import { describe, expect, it } from "vitest";

import { construireEmail, echapperHtml, lienValidation, lireDemande, secretsEgaux } from "./email.ts";

const ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const webhook = (record: Record<string, unknown>) => ({ type: "INSERT", table: "profiles", record });

describe("notifier-inscription", () => {
  it("lit une demande d'INSERT sur profiles en attente", () => {
    expect(lireDemande(webhook({ id: ID, full_name: " Paul ", entreprise_declaree: "BTP", email: "p@x.fr", statut: "en_attente" }))).toEqual({
      id: ID,
      nom: "Paul",
      entreprise: "BTP",
      email: "p@x.fr",
      creeLe: null,
    });
  });
  it("ignore tout autre événement", () => {
    expect(lireDemande({ type: "UPDATE", table: "profiles", record: { id: ID } })).toBeNull();
    expect(lireDemande(webhook({ id: "pas-un-uuid" }))).toBeNull();
    expect(lireDemande(webhook({ id: ID, statut: "approuve" }))).toBeNull();
    expect(lireDemande(null)).toBeNull();
  });
  it("lien vers la page d'administration de la demande", () => {
    expect(lienValidation("https://app.example.fr/", ID)).toBe(`https://app.example.fr/admin/comptes/${ID}`);
  });
  it("e-mail en français, données échappées, bouton « Valider la demande »", () => {
    const m = construireEmail({ id: ID, nom: "<script>x</script>", entreprise: "A & B", email: "p@x.fr", creeLe: null }, "https://app.example.fr");
    expect(m.html).toContain("Valider la demande");
    expect(m.html).toContain(`https://app.example.fr/admin/comptes/${ID}`);
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("A &amp; B");
    expect(m.texte).toContain("Entreprise : A & B");
    expect(echapperHtml(`"'`)).toBe("&quot;&#39;");
  });
  it("secret partagé comparé à temps constant", () => {
    expect(secretsEgaux("abc", "abc")).toBe(true);
    expect(secretsEgaux("abc", "abd")).toBe(false);
    expect(secretsEgaux("abc", "abcd")).toBe(false);
    expect(secretsEgaux("", "x")).toBe(false);
  });
});
