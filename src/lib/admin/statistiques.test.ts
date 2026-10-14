import { describe, expect, it } from "vitest";

import { ilYA, libellePage, mapStatistiques, periode } from "./statistiques";

describe("statistiques administrateur", () => {
  it("période : 7, 30 ou 90 jours, 30 par défaut", () => {
    expect(periode("7")).toBe(7);
    expect(periode("90")).toBe(90);
    expect(periode("12")).toBe(30);
    expect(periode(undefined)).toBe(30);
  });

  it("convertit la réponse de admin_statistiques", () => {
    const s = mapStatistiques({
      jours: 7,
      debut: "2026-10-08",
      fin: "2026-10-14",
      comptes_par_statut: { approuve: 10, suspendu: 1 },
      connexions: 3,
      vues: "12",
      serie: [{ jour: "2026-10-14", visiteurs: 2, vues: 12, connexions: 3 }],
      pages: [{ chemin: "/projets/:id", vues: 5, visiteurs: 2 }],
      comptes: [{ id: "a", email: "a@b.fr", nom: "", statut: "approuve", est_admin: true, connexions: 2, derniere_connexion: null }],
    });
    expect(s.comptesParStatut).toEqual({ en_attente: 0, approuve: 10, refuse: 0, suspendu: 1 });
    expect(s.vues).toBe(12);
    expect(s.serie[0].connexions).toBe(3);
    expect(s.comptes[0]).toMatchObject({ nom: null, estAdmin: true, connexions: 2, derniereConnexion: null, projets: 0 });
  });

  it("libellés de pages et ancienneté", () => {
    expect(libellePage("/projets/:id")).toBe("Projet (fiche)");
    expect(libellePage("/inconnue")).toBe("/inconnue");
    const maintenant = new Date("2026-10-14T10:00:00Z");
    expect(ilYA(null, maintenant)).toBe("jamais");
    expect(ilYA("2026-10-14T06:00:00Z", maintenant)).toBe("aujourd'hui");
    expect(ilYA("2026-10-13T10:00:00Z", maintenant)).toBe("hier");
    expect(ilYA("2026-10-09T10:00:00Z", maintenant)).toBe("il y a 5 j");
    expect(ilYA("2026-08-01T10:00:00Z", maintenant)).toBe("01/08/2026");
  });
});
