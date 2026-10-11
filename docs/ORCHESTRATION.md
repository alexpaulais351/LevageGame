# Prompt — Économie de tokens et orchestration des sous-agents

À appliquer pendant tout le projet « site d'adéquation de levage » (voir `prompt.md`).

## Principe
L'agent principal **orchestre** : il planifie, délègue, contrôle et intègre. Il ne lit ni ne produit lui-même ce qu'un sous-agent moins coûteux peut faire. Chaque tâche est confiée au **modèle le moins cher capable de la réussir**.

## Choix du modèle par tâche
| Niveau | Modèle | Tâches |
|---|---|---|
| Léger | Haiku | Recherche de fichiers, grep, lecture et résumé de docs, saisie d'abaques depuis un tableau fourni, renommages, formatage, i18n, textes d'interface, messages de commit |
| Standard | Sonnet | Composants UI, pages, requêtes Supabase, migrations simples, tests unitaires, mise en page PDF, corrections de bugs localisés |
| Avancé | Opus | Architecture, schéma de données et RLS, moteur de calcul (abaque, interpolation, appuis), revue de sécurité, débogage difficile, arbitrages |

Règles :
- Commencer au niveau le plus bas plausible ; ne monter d'un niveau qu'après un échec constaté, pas par précaution.
- Tout ce qui touche à l'exactitude des calculs de levage ou des abaques est **relu par le niveau avancé**, même si la saisie a été faite au niveau léger.

## Sous-agents
- Déléguer dès qu'une tâche demande de lire plusieurs fichiers ou de fouiller le dépôt : le sous-agent renvoie **la conclusion**, pas le contenu des fichiers.
- Lancer en **parallèle** les tâches indépendantes (ex. un sous-agent par type de machine, par constructeur, par écran).
- Chaque consigne de sous-agent est autonome et courte : objectif, fichiers concernés, contraintes, format de retour attendu, critère de fin.
- Format de retour imposé : résumé ≤ 15 lignes, liste des fichiers modifiés, points bloquants. Pas de code recopié dans le compte rendu.
- Ne pas refaire soi-même une recherche déjà confiée à un sous-agent.
- Un sous-agent = une tâche. Pas de sous-agent « fourre-tout ».

## Hygiène du contexte
- Ne lire que la partie utile d'un fichier (plage de lignes), jamais un fichier entier « pour voir ».
- Chercher (grep/glob) avant de lire.
- Ne jamais charger dans le contexte : `node_modules`, fichiers générés, lockfiles, PDF constructeur complets, gros CSV d'abaques. Les traiter par script et n'afficher que le résultat.
- Modifier par édition ciblée, ne pas réécrire un fichier entier pour changer quelques lignes.
- Ne pas relire un fichier que l'on vient d'écrire.
- Sorties de commandes limitées (filtrer, tronquer, `--quiet`), ne garder que les erreurs.
- Vider ou compacter le contexte à chaque fin d'étape ; repartir des fichiers de mémoire ci-dessous.

## Mémoire du projet dans le dépôt
Tenir à jour, en version courte :
- `CLAUDE.md` : stack, conventions, commandes, structure des dossiers, règles métier incontournables (≤ 100 lignes).
- `docs/PLAN.md` : étapes, état d'avancement, prochaine tâche.
- `docs/DECISIONS.md` : décisions prises, une ligne chacune.

Toute nouvelle session et tout sous-agent partent de ces fichiers, pas de l'historique de conversation.

## Abaques : traitement économe
- Un sous-agent léger par machine : il extrait le tableau depuis la doc constructeur vers un CSV normalisé + fiche source.
- Import en base par script, jamais par collage dans la conversation.
- Contrôle par échantillonnage (quelques points par configuration) au niveau avancé, plus tests automatiques de cohérence (capacité décroissante avec la portée, pas de valeur négative ou manquante).

## Style de réponse
- Pas de reformulation de la demande, pas de récapitulatif des étapes, pas d'explication du code évident.
- Annoncer en une ligne ce qui va être fait, puis le faire.
- Compte rendu final : ce qui a été livré, ce qui reste, ce qui n'a pas pu être vérifié.
- Une seule question à la fois, uniquement si la réponse change ce qui sera construit.

## Avant de lancer une tâche coûteuse
Si une tâche implique de nombreux sous-agents ou un traitement en masse (ex. import de dizaines d'abaques), présenter d'abord le découpage et le modèle prévu pour chaque lot, puis attendre la validation.
