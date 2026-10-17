# PLAN

Détail des étapes : `docs/ARCHITECTURE.md` §5.

| # | Étape | État |
|---|---|---|
| — | Proposition architecture / schéma / plan | ✅ validée |
| 0 | Socle Next.js + charte + CI | ✅ (shadcn écrit à la main : ui.shadcn.com bloqué par le proxy) |
| 1 | Schéma + migrations + RLS | ✅ 46 tests pgTAP (`npx supabase test db`) |
| 2 | Moteur de calcul + tests | ✅ 553 tests, couverture 99,8 % |
| 3 | Abaques MVP (grues mobiles, télescopiques, pelles) | 🟡 3 machines saisies et relues, en ligne, `a_verifier` (GMK3060L, LTM 1060-3.1, Cat 323) ; manquantes : voir docs/ABAQUES.md |
| 4 | Assistant 9 étapes (mode invité retiré en 10) | ✅ /outil, IndexedDB, résultat temps réel |
| 5 | Visuels interactifs + comparateur | ✅ courbe en escalier, élévation (crochet déplaçable), plan, comparateur |
| 6 | Export PDF | ✅ fiche A4 côté client (police VINCI Sans via TTF convertis) |
| 7 | Comptes, projets, versions | ✅ auth @supabase/ssr, projets/études/versions (Server Actions + Zod), reprise du brouillon invité, profil/logo/seuils |
| 8 | Machines perso + import CSV | ✅ /machines (catalogue + Mes machines), CSV/grille, PDF constructeur, vérification ; migration 0500 (suppression de compte) |
| 9 | Déploiement Vercel | ✅ production = `main` (protégée : PR + CI verte), preview par PR, site https://levagegame.vercel.app |

| 10 | Comptes obligatoires validés par l'administrateur | ✅ mode invité supprimé, /login (connexion + création), /compte-en-attente, /admin/comptes, e-mail de notification (Resend, Edge Function) ; migration 0600 |

| 11 | Retours utilisateur 2026-10-12 | ✅ coef. de marge sur la charge, facteur de mode retiré, seuil vert 90 %, portance minimale (étape Sol), page Machines compacte + disponibilité des abaques, classeur `docs/Machines-abaques.xlsx` (D32–D35) ; migrations 20261012100741 (modèles d'exemple) et 20261012100800 (seuil 90) |

| 12 | Accueil + PDF des abaques | ✅ page d'accueil (logo, raccourcis, présentation intégrée), liens PDF des abaques (D36–D37) ; PDF à déposer dans le bucket `chart-sources/catalogue/` |

| 13 | Transport des pièces | ✅ `/transport` : catégorie TE, voiture pilote, démarches, véhicules adaptés, schémas (D38, docs/TRANSPORT.md), demande Word (D39), synthèse PDF (D40) ; art. 13 version 2024 à confirmer |

| 14 | Statistiques administrateur | ✅ `/admin/statistiques` : utilisateurs actifs, connexions, pages vues, activité par compte, projets / études (D41) ; migration 20261014090000 |
| 15 | Retours utilisateur 2026-10-15 / 17 | ✅ véhicule retenu et vignettes (Transport), signature EBGC, hauteur de prise / pose et hauteur sous crochet calculée (D42), adéquation rapide `/outil/rapide` (D43) |

**Prochaine tâche** : contrôle humain des abaques et ajout des machines manquantes (docs/ABAQUES.md, data/machines-sans-abaque.json).
