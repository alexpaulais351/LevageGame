# Adéquation de levage

Application web d'aide à la rédaction des **adéquations de levage** (BTP, France) : choix de la machine, charge, lecture d'abaque constructeur, taux d'utilisation, verdict (ADÉQUAT / ADÉQUAT AVEC RÉSERVES / NON ADÉQUAT) et export PDF. Accès sur compte (Supabase) uniquement, chaque compte étant validé par l'administrateur.

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
| `npm run charts:check` | Contrôle de cohérence des abaques de `data/charts/` |
| `npm run charts:sql` | Génère `supabase/seed/charts.sql` (catalogue public, statut `a_verifier`) |
| `npm run exemples:sql` | Régénère les modèles des projets d'exemple (nouvelle migration `*_projets_exemples_modeles.sql` si nécessaire) |
| `npx supabase@latest start` / `db reset` / `test db` | Base locale, migrations + seed, tests RLS pgTAP |

La CI (GitHub Actions) exécute lint, typecheck, tests, contrôle des abaques et build, plus un job base de données (migrations, seed et tests pgTAP sur un Supabase local), à chaque push et pull request.

## Déploiement

- **Production** : https://levagegame.vercel.app — branche `main` (protégée, fusion par pull request avec CI verte).
- **Preview** : un déploiement Vercel par pull request.
- **Vercel** : framework Next.js (`vercel.json`), variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` pour Production et Preview.
- **Supabase** (projet `unvedfxxiasjpbtamsdd`, eu-west-1) : migrations de `supabase/migrations/` appliquées dans l'ordre (jamais de modification manuelle du schéma) ; catalogue public chargé depuis `supabase/seed/charts.sql`. Auth : Site URL `https://levagegame.vercel.app`, Redirect URLs `https://levagegame.vercel.app/**`. Pour un usage en équipe, configurer un SMTP (confirmation d'e-mail).

## Projets d'exemple (D30)

Chaque compte reçoit, au moment où l'administrateur le valide, deux projets « [EXEMPLE] » (3 études) qu'il peut ensuite modifier ou supprimer. Les modèles sont décrits dans `scripts/exemples/etudes.ts` ; `data` et `result` sont calculés par le moteur et stockés dans `private.modeles_exemples` (migration générée). À la validation, `private.creer_exemples` retrouve machine / configuration / abaque par modèle + slug et vérifie l'empreinte md5 de l'abaque : si une configuration manque ou si un abaque a changé, le projet concerné est simplement sauté (la validation n'échoue jamais).

**Si un abaque, le moteur de calcul ou une étude d'exemple change** : `npm run exemples:sql` écrit une nouvelle migration datée `supabase/migrations/<horodatage>_projets_exemples_modeles.sql` (les migrations déjà appliquées ne sont jamais modifiées), à committer puis appliquer en production après le nouveau `supabase/seed/charts.sql`. Le test Vitest `scripts/exemples/__tests__` échoue tant que la dernière migration de modèles n'est pas à jour. Les comptes déjà validés ne sont pas concernés (une seule création par compte, `private.exemples_servis`).

## Avertissement réglementaire

Outil d'aide à la rédaction. L'adéquation doit être validée par une personne compétente, sur la base de la documentation constructeur de la machine réellement présente sur le chantier. Cadre de référence : arrêté du 1er mars 2004, Code du travail (R.4323-22 et suivants), CACES R482/R483/R487/R489/R490. Aucune valeur d'abaque n'est inventée ni extrapolée.
