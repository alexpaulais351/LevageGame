# Adéquation de levage

Application web d'aide à la rédaction des **adéquations de levage** (BTP, France) : choix de la machine, charge, lecture d'abaque constructeur, taux d'utilisation, verdict (ADÉQUAT / ADÉQUAT AVEC RÉSERVES / NON ADÉQUAT) et export PDF. Mode invité (données locales dans IndexedDB) et comptes (Supabase).

Documentation : `CLAUDE.md`, `docs/CAHIER-DES-CHARGES.md`, `docs/ARCHITECTURE.md`, `docs/PLAN.md`, `docs/DECISIONS.md`.

## Prérequis

- Node.js 22 et npm 10+
- Un projet Supabase (ou Supabase CLI en local) pour les comptes et le catalogue

## Installation

```bash
npm ci
cp .env.example .env.local   # puis renseigner les variables
npm run dev
```

L'application est servie sur http://localhost:3000.

## Variables d'environnement

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon (publique, protégée par la RLS) |

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript (`tsc --noEmit`) |
| `npm test` | Tests Vitest |

La CI (GitHub Actions) exécute lint, typecheck, tests et build à chaque push et pull request.

## Déploiement (Vercel)

1. Importer le dépôt GitHub dans Vercel (framework Next.js détecté automatiquement).
2. Définir `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` pour chaque environnement.
3. Les migrations Supabase (`supabase/migrations/`) sont appliquées séparément, jamais manuellement en production.

## Avertissement réglementaire

Outil d'aide à la rédaction. L'adéquation doit être validée par une personne compétente, sur la base de la documentation constructeur de la machine réellement présente sur le chantier. Cadre de référence : arrêté du 1er mars 2004, Code du travail (R.4323-22 et suivants), CACES R482/R483/R487/R489/R490. Aucune valeur d'abaque n'est inventée ni extrapolée.
