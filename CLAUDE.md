# CLAUDE.md — Adéquation de levage (LevageGame)

Application web de création et de vérification d'**adéquations de levage** (BTP, France).
Utilisateurs : directeurs/conducteurs de travaux, chefs de chantier, chefs de manœuvre — PC et tablette en chantier.
Accès sur compte uniquement (pas de mode invité). Toute création de compte est **validée par l'administrateur** avant le moindre accès (statut `en_attente` → `approuve` / `refuse` / `suspendu`). Chaque utilisateur ne voit que ses données ; catalogue machines public en lecture seule pour les comptes approuvés.

Références : `docs/CAHIER-DES-CHARGES.md` (besoin) · `docs/ARCHITECTURE.md` (architecture, schéma) · `docs/PLAN.md` (avancement) · `docs/DECISIONS.md` · `docs/ORCHESTRATION.md` (économie de tokens, sous-agents).

> Statut : architecture validée — voir docs/PLAN.md.

## Stack (proposée, voir DECISIONS)
```
Next.js App Router · TypeScript strict · Tailwind + shadcn/ui · lucide-react
Supabase : Postgres + RLS, Auth (mdp + lien magique), Storage — via supabase-js / @supabase/ssr
Mutations : Server Actions + Zod · State : Zustand · Server state : TanStack Query v5
PDF : @react-pdf/renderer (côté client) · Tests : Vitest · CI : GitHub Actions · Hébergement : Vercel
Étude en cours d'édition : store Zustand en mémoire ; persistance = versions en base. Jamais localStorage/sessionStorage
```
Interdits : Prisma (contourne la RLS) · API Routes custom (sauf callback Auth) · localStorage · WebSocket · Redis · tRPC.

## Charte VINCI
Reprise du modèle Conduc Rail : couleurs uniquement depuis `src/lib/design-tokens.ts` (`VINCI`, `VINCI_PDF`).
Primaire #004489 · foncé #003370 · rouge #E20025 · gris #B5ABA1 / #F0F0F0 / #DCDCDC.
Verdict : vert #7AA536 · jaune #F2AB1B · rouge #E20025. Jamais de couleur hors palette.
Tables : en-tête #004489 blanc gras, lignes alternées blanc/#F0F0F0. PDF : bande #004489, pied #003370.
Polices : VINCI Sans / Sans Condensed / Serif — `public/fonts/` + `src/styles/vinci-fonts.css` (fallback Arial).

## Règles métier incontournables
1. **Aucune valeur d'abaque inventée ni extrapolée.** Toute donnée vient d'une doc constructeur, avec source, norme, date, statut `a_verifier`/`verifie`.
2. Lecture d'abaque : hors tableau → NON ADÉQUAT. Entre deux nœuds → valeur la plus défavorable, sauf `interpolation_allowed` explicite.
3. Abaque `a_verifier` → signalé à l'écran et sur le PDF.
4. Charge totale = charge + accessoires + moufle/crochet (+ fléchette repliée).
5. Taux = charge totale / capacité, position la plus défavorable. Seuils paramétrables (défaut 80 / 100 %).
6. Verdict : ADÉQUAT / ADÉQUAT AVEC RÉSERVES / NON ADÉQUAT + points bloquants.
7. Tout calcul affiche formule, valeurs, source.
8. Mention permanente (app + PDF) : outil d'aide à la rédaction ; validation par une personne compétente sur la doc de la machine réellement présente.
9. Cadre : arrêté du 1er mars 2004, Code du travail R.4323-22 s., CACES R482/R483/R487/R489/R490.

## Comptes et accès (D25)
- Pas de mode invité ni d'accès `anon` (aucune lecture, catalogue compris). Routes publiques : `/login`, `/auth/callback` ; connecté non approuvé → `/compte-en-attente`.
- Toute policy RLS d'accès aux données est combinée à `private.est_approuve()` (policies RESTRICTIVES) ; toute Server Action passe par `contexteApprouve()` / `contexteAdmin()` (`src/lib/supabase/session.ts`).
- `statut` / `est_admin` / `statut_modifie_*` jamais modifiables par l'utilisateur (trigger de garde). Admin : RPC `admin_lister_comptes`, `admin_definir_statut` ; pages `/admin/comptes[/<id>]`.
- Désignation de l'admin hors application : `select private.designer_admin('<email>');` (postgres / service_role).
- Notification e-mail de l'admin : Edge Function `notifier-inscription` (voir `docs/DEPLOIEMENT-EMAILS.md`).

## Structure
```
src/engine/        moteur de calcul PUR (aucun import React/Supabase) + __tests__
src/app/           login · auth/callback · compte-en-attente · outil · projets/… · machines/… · admin/comptes
src/components/    ui (shadcn CLI only) · layout · modules/{wizard,visuals,pdf}
src/lib/           supabase/ · design-tokens.ts · utils.ts (formatNombreFR…) · pdf/
src/actions/ src/stores/ src/types/
supabase/migrations/   supabase/functions/   supabase/seed/charts/*.csv + *.source.json
scripts/import-chart.ts
```

## Commandes
```
npm run dev | build | start | lint | typecheck | test   (test = vitest run ; CI : lint, typecheck, test, build)
supabase start | supabase db reset | supabase gen types typescript --local > src/types/db.ts
```

## Conventions
- Interface et libellés en français ; nombres via `formatNombreFR`, jamais `toLocaleString`.
- Unités internes : kg, m, kN, kPa ; affichage en t si ≥ 1000 kg.
- Migrations SQL versionnées uniquement, jamais de modif manuelle en prod.
- Export PDF via `useExportPDF` uniquement.
- Branche `main` protégée (PR + CI verte) = production Vercel ; travail sur branche dédiée, preview par PR.
