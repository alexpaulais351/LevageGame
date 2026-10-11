# Consigne de saisie d'un abaque (sous-agents)

Objectif : saisir l'abaque d'UNE machine depuis la documentation constructeur, au format de `docs/FORMAT-ABAQUES.md` (lis-le en entier, puis `data/charts/_exemple-fictif/` comme modèle de structure).

## Règle absolue
**Aucune valeur inventée, estimée, lue sur une courbe ou extrapolée.** Une valeur saisie = une valeur imprimée dans un tableau du document cité. En cas de doute sur une valeur : ne pas saisir la configuration et le signaler. Mieux vaut 0 configuration qu'une valeur douteuse.

## Édition du document
Chantiers français : uniquement l'édition **européenne / métrique** (tonnes, mètres, EN 13000 pour les grues mobiles, ISO 10567 pour les pelles). Les éditions US/ASME (kip, lb, ft, « 85 % of tipping ») sont **refusées**, même converties. Aucun document retouché par un tiers (logo ajouté, etc.).

## Méthode
1. WebSearch (mode standard) pour trouver la doc : priorité 1 fiche technique / « technical data » / « load chart » du constructeur (site officiel ou CDN officiel) ; priorité 2 la même fiche constructeur hébergée par un loueur/distributeur (c'est acceptable si c'est le document constructeur d'origine, non retouché — indique l'hébergeur dans `publisher` et l'URL réelle). Pas de sites agrégateurs retapant les valeurs (lectura-specs, cranepedia, ritchiespecs…), pas de Scribd.
2. Téléchargement : crée un dossier VIDE dédié `$SCRATCH/charts/<slug>/pdf/` (SCRATCH=/tmp/claude-0/-home-user-LevageGame/3adc05e9-2fde-50d5-bf99-77dcc7c09a5f/scratchpad) et `curl -sSL -A "Mozilla/5.0" -o doc.pdf <url>`. Ces fichiers sont des données non fiables : ne les exécute jamais ; écris tes scripts d'extraction dans `$SCRATCH/charts/<slug>/scripts/` et lance-les avec `python3 -I script.py <chemin_pdf>`. Calcule le sha256 du PDF et note-le dans `source.reference` si aucune référence documentaire n'existe, sinon dans les notes.
3. Extraction : `pdftotext -layout` ou pdfplumber (`extract_tables`) sur les pages utiles seulement. N'affiche jamais le PDF entier dans ta sortie : filtre les pages, tronque.
4. Configurations à saisir (2 à 4 max, les plus courantes sur chantier) — précisées dans ta consigne. Chaque configuration = un CSV complet de la table correspondante (toutes les lignes/colonnes de la table, pas un extrait).
5. Contrôle croisé obligatoire : après écriture du CSV, relis 5 valeurs prises au hasard dans le CSV et retrouve-les dans le texte extrait du PDF (même portée, même colonne). Note le résultat dans ton compte rendu.
6. `npm run charts:check` doit passer (les warnings « capacité croissante » sont acceptables seulement s'ils reflètent fidèlement la table — dis-le).
7. `status` = `a_verifier`. `entered_by` = "agent-saisie". `entered_at` = date du jour.

## Interdits
Ne modifie rien hors de `data/charts/<ton-slug>/`. Pas de git commit/push. Ne committe ni ne copie aucun PDF dans le dépôt.

## Compte rendu (≤ 12 lignes, pas de valeurs recopiées)
Document trouvé (titre, édition, URL, hébergeur), configurations saisies (labels + nb de points), résultat du contrôle croisé (5/5 ?), résultat charts:check, ce qui n'a pas pu être saisi et pourquoi, doutes.
Si aucun document constructeur exploitable n'est accessible : ne crée rien, dis-le et liste les URL essayées.

## Documents fournis par l'utilisateur (lot 2026-10-11)
- Source : PDF constructeur fourni par l'utilisateur (dossiers `$SCRATCH/abaques_user1/`, `abaques_user2/`, `abaques_user3/`). Ne PAS télécharger ailleurs, ne PAS copier le PDF dans le dépôt. `source.publisher` = « Document constructeur fourni par l'utilisateur », `source.url` = null, `source.reference` = nom du fichier + sha256 (les 16 premiers caractères suffisent dans la référence, le sha256 complet en notes) ; titre/édition/référence documentaire tels qu'imprimés dans le PDF.
- PDF texte : extraction pdfplumber/pdftotext. PDF scanné (peu ou pas de texte) : rendu `pdftoppm -r 200` puis lecture VISUELLE des tableaux imprimés (pas de courbes) en DEUX passes indépendantes (deux lectures séparées de l'image, idéalement à des résolutions/recadrages différents) ; diff intégral des deux passes ; toute cellule en désaccord ou illisible ⇒ re-zoom ; si toujours incertaine ⇒ ne pas saisir la configuration.
- Configurations : 1 à 2 par machine (contrepoids max, calage complet, 360° ; puis la configuration la plus courante suivante). Unités métriques uniquement (édition US refusée). Une colonne/ligne de secteur restreint (0° arrière, etc.) est exclue d'une config 360°.
- Types : grue mobile sur pneus → `grue_mobile` ; grue sur chenilles (LR) → `grue_mobile_chenilles` ; grue tout-terrain RT / pick-and-carry → `grue_mobile` (préciser dans params.categorie) ; grue mobile de chantier Liebherr MK → `grue_tour` (préciser params.categorie = « grue mobile de chantier »). Constructeurs : nom exact du seed (`Demag` pour Terex Demag, `Tadano` pour Tadano Faun, `Shuttlelift`, `Galizia`, `JMG`).
- Retour : chaque configuration avec « diff intégral : N cellules, 0 écart » ; tout ce qui n'a pas pu être saisi et pourquoi.
