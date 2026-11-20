import { describe, expect, it } from "vitest";

import {
  CATEGORIES_TICKET,
  creationTicketSchema,
  filtrerTickets,
  MAILTO_ABAQUE,
  mapTicket,
  optionDe,
  peutSupprimer,
  STATUTS_TICKET,
  traitementTicketSchema,
  trierPourAdmin,
  type Ticket,
} from "./tickets";

const t = (o: Partial<Ticket>): Ticket => ({
  id: "x",
  numero: 1,
  titre: "Titre",
  description: "Description",
  categorie: "amelioration",
  priorite: "normale",
  statut: "nouveau",
  page: null,
  reponse: null,
  creeLe: "2026-11-01T10:00:00Z",
  majLe: "2026-11-01T10:00:00Z",
  auteurId: "moi",
  auteurNom: "Camille",
  auteurEmail: "camille@exemple.fr",
  ...o,
});

describe("tickets", () => {
  it("valide la création (trim, page vide → null)", () => {
    const r = creationTicketSchema.parse({
      titre: "  Export  ",
      description: "Logo client",
      categorie: "export",
      priorite: "haute",
      page: "  ",
    });
    expect(r).toEqual({
      titre: "Export",
      description: "Logo client",
      categorie: "export",
      priorite: "haute",
      page: null,
    });
  });

  it("refuse titre trop court, catégorie ou priorité inconnue", () => {
    expect(
      creationTicketSchema.safeParse({
        titre: "ab",
        description: "Valide",
        categorie: "export",
        priorite: "haute",
      }).success,
    ).toBe(false);
    expect(
      creationTicketSchema.safeParse({
        titre: "Titre",
        description: "Valide",
        categorie: "piratage",
        priorite: "haute",
      }).success,
    ).toBe(false);
    expect(
      creationTicketSchema.safeParse({
        titre: "Titre",
        description: "Valide",
        categorie: "export",
        priorite: "urgente",
      }).success,
    ).toBe(false);
  });

  it("valide le traitement (réponse vide → null, identifiant UUID exigé)", () => {
    const id = "a1000000-0000-4000-8000-000000000001";
    expect(
      traitementTicketSchema.parse({
        id,
        statut: "resolu",
        priorite: "basse",
        reponse: " ",
      }).reponse,
    ).toBeNull();
    expect(
      traitementTicketSchema.safeParse({
        id: "1",
        statut: "resolu",
        priorite: "basse",
      }).success,
    ).toBe(false);
    expect(
      traitementTicketSchema.safeParse({
        id,
        statut: "ferme",
        priorite: "basse",
      }).success,
    ).toBe(false);
  });

  it("filtre « À traiter » = nouveau + en cours", () => {
    const l = [
      t({ id: "1", statut: "nouveau" }),
      t({ id: "2", statut: "en_cours" }),
      t({ id: "3", statut: "resolu" }),
      t({ id: "4", statut: "refuse" }),
    ];
    expect(filtrerTickets(l, "a_traiter").map((x) => x.id)).toEqual(["1", "2"]);
    expect(filtrerTickets(l, "resolu").map((x) => x.id)).toEqual(["3"]);
    expect(filtrerTickets(l, "tous")).toHaveLength(4);
  });

  it("tri administrateur : priorité haute d'abord, puis plus récent", () => {
    const l = [
      t({ id: "a", priorite: "basse", creeLe: "2026-11-03T00:00:00Z" }),
      t({ id: "b", priorite: "haute", creeLe: "2026-11-01T00:00:00Z" }),
      t({ id: "c", priorite: "normale", creeLe: "2026-11-01T00:00:00Z" }),
      t({ id: "d", priorite: "normale", creeLe: "2026-11-02T00:00:00Z" }),
    ];
    expect(trierPourAdmin(l).map((x) => x.id)).toEqual(["b", "d", "c", "a"]);
  });

  it("suppression : auteur tant que « nouveau », administrateur toujours", () => {
    expect(peutSupprimer(t({ statut: "nouveau" }), "moi", false)).toBe(true);
    expect(peutSupprimer(t({ statut: "en_cours" }), "moi", false)).toBe(false);
    expect(
      peutSupprimer(t({ statut: "nouveau", auteurId: "autre" }), "moi", false),
    ).toBe(false);
    expect(
      peutSupprimer(t({ statut: "resolu", auteurId: "autre" }), "moi", true),
    ).toBe(true);
  });

  it("libellés et repli sur la dernière option", () => {
    expect(optionDe(CATEGORIES_TICKET, "abaque").label).toBe(
      "Intégration d'abaque",
    );
    expect(optionDe(STATUTS_TICKET, "inconnu").value).toBe("refuse");
  });

  it("lien mailto de l'abaque avec objet encodé", () => {
    expect(MAILTO_ABAQUE).toMatch(
      /^mailto:[^?]+@vinci-construction\.com\?subject=Ad%C3%A9quation/,
    );
  });

  it("convertit une ligne de lister_tickets (nom absent → partie locale de l'e-mail)", () => {
    const m = mapTicket({
      id: "i",
      numero: "12",
      titre: "T",
      description: "D",
      categorie: "abaque",
      priorite: "haute",
      statut: "nouveau",
      page: null,
      reponse: null,
      created_at: "c",
      updated_at: "u",
      auteur_id: "a",
      auteur_nom: null,
      auteur_email: "jean.dupont@exemple.fr",
    });
    expect(m.numero).toBe(12);
    expect(m.auteurNom).toBe("jean.dupont");
  });
});
