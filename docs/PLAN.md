# PLAN

Détail des étapes : `docs/ARCHITECTURE.md` §5.

| # | Étape | État |
|---|---|---|
| — | Proposition architecture / schéma / plan | ✅ validée |
| 0 | Socle Next.js + charte + CI | ✅ (shadcn écrit à la main : ui.shadcn.com bloqué par le proxy) |
| 1 | Schéma + migrations + RLS | ✅ 46 tests pgTAP (`npx supabase test db`) |
| 2 | Moteur de calcul + tests | à faire |
| 3 | Abaques MVP (grues mobiles, télescopiques, pelles) | à faire — besoin des PDF constructeur |
| 4 | Assistant 9 étapes, mode invité | à faire |
| 5 | Visuels interactifs + comparateur | à faire |
| 6 | Export PDF | à faire |
| 7 | Comptes, projets, versions | à faire |
| 8 | Machines perso + import CSV | à faire |
| 9 | Déploiement Vercel | à faire |

**Prochaine tâche** : validation des arbitrages (`DECISIONS.md` D1–D4), puis étape 0.
