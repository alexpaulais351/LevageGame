# Proposition d'architecture — Adéquation de levage

> Statut : **PROPOSITION — en attente de validation**. Aucun code applicatif n'est écrit avant validation.

## 1. Arbitrages entre les documents sources

Le modèle `CLAUDE-modele-nouveau-projet.md` (issu de Conduc Rail) et le cahier des charges (`CAHIER-DES-CHARGES.md`) se contredisent sur 4 points. Proposition : **le cahier des charges prime** sur la stack, **le modèle prime** sur la charte, l'UI et les patterns.

| Sujet | Modèle Conduc Rail | Cahier des charges | Proposition |
|---|---|---|---|
| Accès BDD | Prisma ORM | Supabase + RLS stricte | **supabase-js + `@supabase/ssr`**, types générés (`supabase gen types`). Prisma contourne la RLS (connexion rôle `postgres`) → incompatible avec « RLS stricte ». |
| Auth | NextAuth v5 credentials | Supabase Auth (mdp + lien magique) | **Supabase Auth**. |
| Stockage navigateur | localStorage interdit | Mode invité, données locales | **IndexedDB** (via `idb-keyval` + persist Zustand), pas de localStorage. Données invité = brouillon unique + historique court, reprises à la création du compte. |
| Mutations | Server Actions uniquement | — | Conservé : Server Actions + Zod. Mode invité : calcul 100 % client, aucune mutation serveur. |

Conservés du modèle : TypeScript strict, Tailwind + shadcn/ui, lucide-react, charte VINCI (`design-tokens.ts`), @react-pdf/renderer, Zustand, TanStack Query, Zod, shell Sidebar/Topbar, `formatNombreFR`, hook `useExportPDF`.
Polices VINCI Sans : non disponibles dans ce dépôt → fallback Arial tant que les `.woff2` ne sont pas fournis.

## 2. Architecture

```
Navigateur (tablette/PC)
 ├─ Next.js App Router (RSC + composants client)
 │   ├─ Assistant 9 étapes (Zustand : état de l'étude en cours)
 │   ├─ Visuels SVG : élévation, vue en plan, courbe de charge, jauge
 │   └─ PDF : @react-pdf/renderer (généré côté client → marche en invité)
 ├─ packages/engine  ← moteur de calcul PUR TypeScript (aucune dépendance UI/BDD), Vitest
 └─ IndexedDB (invité)
Serveur Next.js (Vercel)
 ├─ Server Actions (Zod) → Supabase (clé anon + JWT utilisateur → RLS appliquée)
 └─ Route de callback Auth Supabase (seule route, imposée par le flux lien magique)
Supabase
 ├─ Postgres + RLS · migrations versionnées `supabase/migrations/`
 ├─ Storage : `chart-sources` (PDF constructeur, public lecture), `user-files` (privé : logos, PDF perso)
 └─ Auth
```

### Moteur de calcul (`src/engine/`, module pur)
- `chart.ts` : lecture d'abaque. Grille portée × (longueur de flèche | hauteur) → capacité.
  - Interpolation **uniquement** si sécuritaire : on retient la **valeur la plus défavorable des nœuds encadrants** (option : interpolation linéaire sur la portée seulement si le constructeur l'autorise explicitement — champ `interpolation_allowed` de l'abaque, défaut `false`).
  - Hors tableau → `null` = **NON ADÉQUAT** (« hors abaque »), jamais d'extrapolation.
- `load.ts` : charge totale = charge + accessoires + moufle/crochet (+ fléchette repliée, + câble si l'abaque l'exige).
- `rigging.ts` : effort par brin selon nb de brins, angle (β ≤ 60°), facteur de mode ; comparaison aux CMU.
- `ground.ts` : effort max sous appui (donnée constructeur ou saisie), pression sous plaque, comparaison à la portance.
- `environment.ts` : vent (limites machine/charge), distances lignes électriques (tableau par tension).
- `verdict.ts` : taux d'utilisation par position, pire cas, seuils paramétrables → ADÉQUAT / AVEC RÉSERVES / NON ADÉQUAT + liste des points bloquants / à lever.
- Chaque fonction renvoie `{ valeur, formule, entrées, source }` pour l'affichage du détail.

### Arborescence
```
src/app/(public)/            accueil, mentions, outil invité
src/app/(auth)/login
src/app/(app)/projets/[id]/etudes/[etudeId]/[etape]
src/app/(app)/machines       catalogue + machines perso
src/components/{ui,layout,modules/{wizard,visuals,pdf}}
src/engine/                  moteur pur + __tests__
src/lib/{supabase,design-tokens,utils,pdf}
src/actions/  src/stores/  src/types/
supabase/migrations/  supabase/seed/charts/*.csv (+ *.source.json)
scripts/import-chart.ts      CSV → BDD, contrôles de cohérence
```

## 3. Schéma de données (Postgres)

```
organizations(id, name, logo_path, address, siret, created_at)
profiles(id → auth.users, organization_id, full_name, role, phone)
projects(id, owner_id, organization_id, name, site_address, client, created_at)
lifting_studies(id, project_id, reference, title, status[brouillon|valide|archive], current_version_id)
study_versions(id, study_id, index, data jsonb, result jsonb, author_id, created_at)   -- immuable, historique

machine_types(id, code, label, family, params_schema jsonb)   -- extensible : un type = une ligne + un schéma de paramètres
manufacturers(id, name)
machines(id, type_id, manufacturer_id, model, owner_id NULL=catalogue public,
         specs jsonb  -- masse, empattement, dims, hauteur pied de flèche, axe de rotation…
)
machine_configurations(id, machine_id, label,
         params jsonb  -- flèche, contrepoids, calage %, zone 360/arrière, fléchette, mouflage,
                       -- accessoire télesco, balancier, axial/transversal, clapets…
         hook_block_mass_kg, notes)
load_charts(id, configuration_id, axis_x='radius_m', axis_y['boom_length_m'|'height_m'|'none'],
         unit='kg', standard (EN 13000, ISO 10567, EN 1459…), deductions_included bool,
         interpolation_allowed bool default false,
         status[a_verifier|verifie], source_id, entered_by, entered_at, verified_by, verified_at)
load_chart_points(chart_id, x, y, capacity_kg)   PK(chart_id,x,y)
chart_sources(id, document_title, reference, edition, url, file_path, publisher)
accessories(id, owner_id, kind[elingue_chaine|cable|textile|manille|palonnier|crochet], label, wll_kg, specs jsonb, vgp_date)
attachments(id, owner_id, study_id NULL, machine_id NULL, kind, file_path, mime, created_at)
user_settings(user_id, threshold_green, threshold_orange)
```

**RLS**
- `projects`, `lifting_studies`, `study_versions`, `attachments`, `accessories`, `user_settings` : `owner_id = auth.uid()` (via jointure projet pour études/versions). Organisations : membres seulement (prévu, usage mono-utilisateur au MVP).
- Catalogue (`machine_types`, `manufacturers`, `machines`, `machine_configurations`, `load_charts`, `load_chart_points`, `chart_sources`) : `SELECT` si `owner_id IS NULL OR owner_id = auth.uid()` (lecture anonyme du public pour le mode invité) ; `INSERT/UPDATE/DELETE` seulement sur ses propres lignes ; catalogue public modifiable uniquement par `service_role` (scripts d'import).
- `study_versions` : pas d'`UPDATE` (immuabilité).

## 4. Abaques — méthode

1. Un sous-agent léger par machine : recherche de la fiche constructeur officielle → CSV normalisé + `source.json` (titre, référence, édition, URL, norme).
2. Si la doc officielle n'est pas accessible (fréquent : abaques complets diffusés sous login/concession) : **aucune saisie**, la machine est listée « abaque manquant » dans `docs/ABAQUES.md`.
3. Import par script + tests de cohérence (capacité décroissante avec la portée à flèche constante, aucune valeur négative/manquante, unités).
4. Relecture par échantillonnage au niveau avancé. Statut `verifie` **uniquement** après contrôle humain contre le PDF ; tout ce que j'importe arrive en `a_verifier`.

⚠ Point dur à signaler dès maintenant : beaucoup d'abaques complets (Liebherr LTM, Grove, Potain) ne sont pas publiquement téléchargeables. Le MVP peut nécessiter que **tu fournisses les PDF constructeur** des machines cibles.

## 5. Plan de livraison

| Étape | Contenu | Critère de fin |
|---|---|---|
| 0 | Socle : Next.js, Tailwind/shadcn, charte VINCI, shell, Supabase local, CI GitHub (lint + typecheck + tests), README | `npm run build` + CI verts |
| 1 | Schéma + migrations + RLS + tests RLS | migrations rejouables, tests RLS OK |
| 2 | Moteur de calcul pur + tests unitaires (abaque, interpolation sécuritaire, élingage, sol, verdict) | couverture moteur ≥ 90 % |
| 3 | Abaques MVP : 2-3 grues mobiles, 2-3 télescopiques, 2 pelles (statut `a_verifier` sauf validation) | import + tests de cohérence verts |
| 4 | Assistant 9 étapes en mode invité (IndexedDB) + jauge temps réel | parcours complet sans compte |
| 5 | Visuels : courbe de charge, élévation interactive, vue en plan, comparateur | déplacement crochet → recalcul |
| 6 | Export PDF A4 complet | PDF conforme section « Export PDF » |
| 7 | Comptes : projets, études, versions, duplication, reprise du brouillon invité, logo entreprise | parcours compte complet |
| 8 | Machines perso : saisie/import CSV + PDF joint | import CSV validé |
| 9 | Déploiement Vercel (preview par PR, prod sur `main`) | URL prod |
| 10+ | Extension : grue à tour, camion-bras, chariot élévateur, catalogue élargi | — |

Modèles prévus (cf. `ORCHESTRATION.md`) : étapes 1, 2, revue RLS, relecture abaques → avancé ; 0, 4-8 → standard ; recherche/saisie abaques, textes, i18n → léger.
