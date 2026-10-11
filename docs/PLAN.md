# PLAN

Détail des étapes : `docs/ARCHITECTURE.md` §5.

| # | Étape | État |
|---|---|---|
| — | Proposition architecture / schéma / plan | ✅ validée |
| 0 | Socle Next.js + charte + CI | ✅ (shadcn écrit à la main : ui.shadcn.com bloqué par le proxy) |
| 1 | Schéma + migrations + RLS | ✅ 46 tests pgTAP (`npx supabase test db`) |
| 2 | Moteur de calcul + tests | ✅ 553 tests, couverture 99,8 % |
| 3 | Abaques MVP (grues mobiles, télescopiques, pelles) | 🟡 3 machines saisies et relues, en ligne, `a_verifier` (GMK3060L, LTM 1060-3.1, Cat 323) ; manquantes : voir docs/ABAQUES.md |
| 4 | Assistant 9 étapes, mode invité | ✅ /outil, IndexedDB, résultat temps réel |
| 5 | Visuels interactifs + comparateur | ✅ courbe en escalier, élévation (crochet déplaçable), plan, comparateur |
| 6 | Export PDF | ✅ fiche A4 côté client (police VINCI Sans via TTF convertis) |
| 7 | Comptes, projets, versions | ✅ auth @supabase/ssr, projets/études/versions (Server Actions + Zod), reprise du brouillon invité, profil/logo/seuils |
| 8 | Machines perso + import CSV | ✅ /machines (catalogue + Mes machines), CSV/grille, PDF constructeur, vérification ; migration 0500 (suppression de compte) |
| 9 | Déploiement Vercel | 🟡 site en ligne (levagegame.vercel.app) ; CI complète (dont job base de données) ; branche `main`, protection et production sur `main` à créer par l'utilisateur |

**Prochaine tâche** : création de `main` (utilisateur), puis contrôle humain des abaques et ajout des machines manquantes (docs/ABAQUES.md).
