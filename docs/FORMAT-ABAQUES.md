# Format de saisie des abaques

Règle d'or : **chaque valeur provient du document cité ; aucune valeur déduite, extrapolée ou « corrigée ».** Champ inconnu = `null`, jamais deviné. Tout est importé en `a_verifier` ; seul un contrôle humain contre le PDF peut le faire passer à `verifie` (hors de ce flux).

## Arborescence

```
data/charts/<constructeur>-<modele-slug>/
  machine.json
  <slug-config>.csv        # un CSV par configuration
```
Les dossiers préfixés `_` sont validés par `charts:check` mais ignorés par `charts:sql` (exemples, tests).

## machine.json

| Champ | Contenu |
|---|---|
| `manufacturer` | nom exact du seed (`supabase/seed.sql`, table `manufacturers`) |
| `type_code` | code du seed `machine_types` (ex. `grue_mobile`) |
| `model` | modèle tel qu'écrit par le constructeur |
| `specs` | objet libre, valeurs de la doc uniquement |
| `source` | `document_title` (obligatoire), `reference`, `edition`, `url`, `publisher`, `page_refs` (nullables) |
| `configurations[]` | `slug` (clé naturelle, unique dans la machine), `label`, `params` (flèche, contrepoids, calage %, zone, fléchette, mouflage, accessoire, balancier… ; `null` si inconnu), `hook_block_mass_kg` (`null` si inconnu), `chart` |
| `chart` | `file` (CSV), `axis_y` (`boom_length_m` / `height_m` / `none`), `unit` (`kg` / `t`), `standard` (ex. EN 13000, ou `null`), `deductions_included`, `interpolation_allowed` (`false` par défaut ; `true` seulement si la doc l'autorise), `notes` |
| `entered_at`, `entered_by` | date ISO et nom de la personne qui a saisi |
| `status` | toujours `"a_verifier"` |

Les clés inconnues sont refusées (schéma strict). `chart.notes` et `source.page_refs` sont stockés dans `machine_configurations.notes` ; le `slug` est conservé dans `params.slug`.

## CSV

- En-tête exact : `radius_m,y,capacity` ; séparateur virgule, décimale point.
- `y` = longueur de flèche ou hauteur (m) selon `axis_y` ; `y = 0` si `axis_y = none`.
- `capacity` dans l'unité déclarée (`unit`) ; convertie en kg à l'import. Maximum 1 décimale en kg, 2 décimales pour portée et y.
- **Cellule vide = capacité vide dans le tableau constructeur (pas 0).** Elle est signalée en warning et non insérée en base (absence de nœud = hors abaque).

## Commandes

- `npm run charts:check` : valide tous les dossiers (schéma, CSV, `validateChart` du moteur, références du seed) ; code retour ≠ 0 si erreur.
- `npm run charts:sql` : génère `supabase/seed/charts.sql` (idempotent ; upsert par constructeur+modèle, puis machine+slug ; `a_verifier`, `owner_id` NULL), chargé par `supabase db reset` via `[db.seed] sql_paths`.
