# Prompt — Site d'adéquation de levage

## Rôle
Tu es un développeur full-stack senior. Tu construis une application web de **création et de vérification d'adéquations de levage** destinée aux entreprises de BTP (directeurs de travaux, conducteurs de travaux, chefs de chantier, chefs de manœuvre).

## Stack imposée
- **Front** : Next.js (App Router) + TypeScript + Tailwind CSS, interface en français, responsive (utilisable sur tablette en chantier).
- **Back / données** : Supabase (Auth, Postgres avec RLS, Storage pour les PDF et documents constructeur).
- **Code** : dépôt GitHub (branche `main` protégée, PR, CI lint + tests).
- **Déploiement** : Vercel (preview par PR, production sur `main`), variables d'environnement Supabase configurées dans Vercel.

## Objectif fonctionnel
Permettre à l'utilisateur de :
1. Choisir un **moyen de levage par type**, puis par constructeur / modèle / configuration.
2. Saisir la charge, les accessoires et les conditions du levage.
3. Voir **visuellement et en temps réel** si le levage est adéquat par rapport à l'abaque de la machine.
4. Produire une **fiche d'adéquation de levage complète, exportable en PDF**.

## Types de moyens de levage
- Grue mobile (automotrice, sur chenilles)
- Grue à tour (GME / GMA)
- Grue auxiliaire de chargement (camion-bras)
- Chariot télescopique (type Manitou, Merlo), fixe et rotatif
- Pelle hydraulique en levage (sur pneus, sur chenilles, rail-route)
- Chariot élévateur
- Architecture extensible : un nouveau type doit pouvoir être ajouté sans refonte.

## Abaques (courbes de charge) — point critique
- Recherche et intègre les abaques constructeurs des machines les plus courantes sur les chantiers français (Liebherr, Tadano/Demag, Grove, Potain, Manitou, Merlo, Caterpillar, Komatsu, Volvo, Palfinger, Fassi, etc.).
- **Aucune valeur inventée ou extrapolée.** Chaque abaque est saisi depuis la documentation officielle du constructeur, avec : source (document, référence, édition, lien), norme de calcul (EN 13000, ISO 10567…), date de saisie, statut `vérifié` / `à vérifier`.
- Un abaque dépend de la **configuration** : longueur de flèche, contrepoids, calage (stabilisateurs sortis à 100 % / 50 % / rentrés, sur pneus), zone de travail (360°, arrière, latéral), fléchette, mouflage ; pour les télescopiques : accessoire (fourches, potence, treuil) ; pour les pelles : longueur de balancier, lame/stabilisateurs, axial/transversal, présence de clapets de sécurité.
- Modèle de données : tableau portée × hauteur (ou portée × longueur de flèche) → capacité. Interpolation uniquement si elle est sécuritaire (sinon valeur inférieure retenue), jamais d'extrapolation hors tableau.
- Les machines dont l'abaque est `à vérifier` sont clairement signalées à l'écran et sur le PDF.
- L'utilisateur connecté peut **ajouter sa propre machine** et saisir/importer son abaque (CSV) avec le PDF constructeur en pièce jointe.

## Parcours utilisateur (assistant par étapes)
1. **Chantier / opération** : projet, lieu, date, description du levage, intervenants.
2. **Charge** : désignation, masse, dimensions, position du centre de gravité, surface au vent.
3. **Accessoires de levage** : élingues (chaîne, câble, textile), manilles, palonnier, crochet/moufle ; nombre de brins, angle d'élingage, facteur de mode, CMU de chaque accessoire ; vérification CMU ≥ effort par brin.
4. **Moyen de levage** : type → constructeur → modèle → configuration.
5. **Géométrie du levage** : portée de prise, portée de pose, hauteur sous crochet nécessaire, obstacles ; positions multiples (prise / rotation / pose).
6. **Appuis et sol** : effort maximal sous patin/chenille, plaques de répartition, pression transmise comparée à la portance admissible du sol ; proximité de fouilles, talus, réseaux enterrés, ouvrages.
7. **Environnement** : vent limite (machine et charge), lignes électriques et caténaires (distances de sécurité), voies ferrées ou circulées, survol, interférences avec d'autres engins, balisage.
8. **Personnel et documents** : conducteur (CACES, autorisation de conduite), chef de manœuvre, élingueur ; VGP de l'engin et des accessoires à jour.
9. **Synthèse** : résultat, réserves, signatures.

## Calculs et résultat
- Charge totale = masse de la charge + accessoires + moufle/crochet (+ fléchette repliée le cas échéant).
- Capacité lue à l'abaque pour chaque position (portée, hauteur, configuration).
- **Taux d'utilisation** = charge totale / capacité, pour la position la plus défavorable.
- Seuils paramétrables par l'utilisateur (ex. vert < 80 %, orange 80–100 %, rouge > 100 %).
- Verdict global : **ADÉQUAT / ADÉQUAT AVEC RÉSERVES / NON ADÉQUAT**, avec la liste des points bloquants et des points à lever.
- Chaque calcul est affiché avec son détail (formule, valeurs, source de l'abaque) pour pouvoir être contrôlé.
- Moteur de calcul isolé dans un module pur TypeScript, couvert par des tests unitaires.

## Interactif et visuel
- **Schéma en élévation** (SVG) de la machine à l'échelle : flèche, portée, hauteur, charge, obstacles ; l'utilisateur déplace le crochet à la souris/au doigt et les valeurs se mettent à jour.
- **Courbe de charge** affichée avec le point de fonctionnement placé dessus, zone verte/orange/rouge.
- **Vue en plan** : rayon de giration, zone de balayage, emprise des stabilisateurs, positions de prise et de pose.
- Jauge de taux d'utilisation en temps réel.
- Comparateur : tester rapidement une autre machine ou configuration sur le même levage.

## Comptes et mode invité
- **Mode invité** : accès complet à l'outil sans compte ; données conservées localement (navigateur) ; export PDF possible avec mention « non enregistré ». À la création du compte, l'adéquation en cours est reprise.
- **Compte** (Supabase Auth, e-mail + mot de passe, lien magique) : création de **projets** (chantiers), enregistrement de plusieurs adéquations par projet, duplication, historique des versions, machines personnalisées, logo et coordonnées d'entreprise pour les PDF.
- RLS stricte : chaque utilisateur ne voit que ses données ; le catalogue de machines publiques est en lecture seule.

## Export PDF
Fiche d'adéquation complète, mise en page professionnelle A4 :
- En-tête : logo, entreprise, projet, référence, indice, date, rédacteur.
- Description de l'opération, charge, accessoires (avec vérification des CMU).
- Machine et configuration, extrait de l'abaque utilisé avec sa source.
- Schémas (élévation, vue en plan, courbe avec point de fonctionnement).
- Détail des calculs, taux d'utilisation, vérification des appuis et du sol.
- Environnement, vent limite, mesures de prévention.
- Personnel, CACES, VGP.
- Verdict, réserves, cadres de signature (rédacteur, chef de manœuvre, conducteur, responsable chantier).

## Cadre réglementaire à respecter (France)
- Examen d'adéquation au sens de l'arrêté du 1er mars 2004 ; Code du travail (R.4323-22 et suivants).
- Recommandations CACES : R482, R483, R487, R489, R490.
- Mention permanente dans l'application et sur le PDF : l'outil est une aide à la rédaction ; l'adéquation doit être validée par une personne compétente, sur la base de la documentation constructeur de la machine réellement présente sur le chantier.

## Modèle de données (indicatif)
`profiles`, `organizations`, `projects`, `lifting_studies`, `study_versions`, `machine_types`, `manufacturers`, `machines`, `machine_configurations`, `load_charts`, `load_chart_points`, `chart_sources`, `accessories`, `attachments`.

## Méthode de travail
1. Commence par me proposer l'architecture, le schéma de base de données et le plan de livraison par étapes ; attends ma validation.
2. Livre un MVP : grues mobiles + chariots télescopiques + pelles, avec quelques machines dont l'abaque est vérifié, parcours complet et export PDF.
3. Étends ensuite le catalogue et les types de machines.
4. Migrations Supabase versionnées dans le dépôt, tests sur le moteur de calcul, README d'installation et de déploiement.
5. Signale toute hypothèse ou donnée d'abaque que tu n'as pas pu vérifier, plutôt que de la combler.
