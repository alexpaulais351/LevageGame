# Outil Transport des pièces (`/transport`)

Aide à la préparation du transport routier d'une pièce avant son levage : catégorie du convoi, accompagnement,
démarches, véhicules adaptés, schémas à l'échelle. Moteur pur : `src/engine/transport.ts` (tests
`src/engine/__tests__/transport.test.ts`) ; véhicules et types de pièces : `src/lib/transport/catalogue.ts` ;
démarches : `src/lib/transport/demarches.ts` ; interface : `src/components/modules/transport/`.

## Règles appliquées (sources consultées le 2026-10-12)

| Règle | Valeur | Source |
|---|---|---|
| Largeur normale (véhicule et chargement) | 2,55 m | Code de la route R.312-10, R.312-20 |
| Longueur normale | porteur 12 m ; véhicule articulé 16,50 m ; train routier 18,75 m | R.312-11 |
| Porte-à-faux arrière du chargement | 3 m au plus au-delà du véhicule | R.312-21 |
| Masse totale roulante | 44 t (transport national, > 4 essieux) | R.312-4 |
| Hauteur | aucune limite réglementaire : étude d'itinéraire (vigilance 4 m ; accès autoroutier TE 4,50 m ; passages à niveau : accord de l'exploitant au-delà de 4,80 m) | R.312 ; arrêté du 4 mai 2006 art. 11 ; annexes arrêté du 7 juin 2019 |
| Catégories de TE (la plus forte l'emporte) | 1re : L ≤ 20 m, l ≤ 3 m, M ≤ 48 t ; 2e : L ≤ 25 m, l ≤ 4 m, M ≤ 72 t ; 3e : au-delà | arrêté du 4 mai 2006, art. 3 |
| Autorisation | préfet du département de départ (DDT), validité ≤ 3 ans ; déclaration possible en 1re catégorie sur le réseau 1TE pour une charge indivisible (engins exclus) | R.433-1, R.433-2 ; Cerfa 15624 |
| Réseaux | 1TE, 2TE48, TE72, TE94, TE120 | annexes de l'arrêté du 7 juin 2019 |
| Signalisation | panneaux « CONVOI EXCEPTIONNEL » ≥ 1,90 × 0,25 m ; feux tournants 2 + 2 (1 + 1 en 1re catégorie) ; 4 feux d'encombrement | arrêté de 2006 art. 16 ; modèle d'APL 2019 |
| Circulation | interdite du samedi 12 h au lundi 6 h (et veilles / lendemains de fête), restrictions PL, barrières de dégel, neige, verglas | R.433-4 |
| Vitesses 3e catégorie | 60 km/h autoroute, 50 km/h route, 30 km/h agglomération | arrêté de 2006 art. 14 (version d'origine) |

### Accompagnement — lecture prudente (à confirmer)
L'article 13 de l'arrêté du 4 mai 2006 a été modifié le 29/01/2024 ; sa version en vigueur n'a pas pu être lue
(Légifrance inaccessible aux outils). Le moteur applique la lecture la plus exigeante des versions consultées :
- 1re catégorie, et 2e catégorie d'une largeur ≤ 3 m : aucun véhicule d'accompagnement ;
- largeur > 3 m : véhicule pilote ;
- 3e catégorie : véhicule pilote + véhicule de protection arrière ;
- largeur > 4,50 m (version 2006 ; 5 m rapporté pour 2024), longueur > 40 m ou masse > 120 t : guidage (forces de l'ordre ou équipe de guidage agréée).

**À vérifier sur Légifrance** : art. 13 version 2024, délais d'instruction et vitesses en vigueur, signalisation du porte-à-faux.

## Véhicules
Caractéristiques **indicatives** (ordres de grandeur du marché ; Faymonville MAX : plateau 9,3 → 22,6 m, plancher
≈ 0,9 m ; Goldhofer THP : 3 m de large, plancher ≈ 1,2 m). Encombrement du convoi = partie avant (cabine / tracteur /
col de cygne) + plateau allongé à la pièce + porte-à-faux ; hauteur = plancher + pièce ; masse = tare indicative + pièce.
Classement : véhicules possibles, puis contrainte croissante (catégorie, + 1 cran si hauteur > 4 m), puis familles
habituelles du type de pièce, puis masse.

## Projet de demande administrative (Word)
Section 5 de l'outil : bouton « Télécharger la demande (Word) ». Document **préparatoire** généré dans le navigateur
(`docx`, `src/lib/transport/demande-docx.ts` ; données : `src/lib/transport/demande.ts`), à reporter sur le formulaire
officiel (Cerfa) ou la téléprocédure de la DDT du département de départ. Pré-rempli avec : profil (nom, fonction,
téléphone, e-mail) et organisation (raison sociale, adresse, SIRET) ou entreprise déclarée à l'inscription ; projet
choisi (nom, adresse du chantier = arrivée, client) ; pièce ; convoi (dimensions hors tout, masse estimée, catégorie,
critères) ; nature cochée (déclaration 1TE si 1re catégorie et charge indivisible, sinon autorisation au voyage ;
« Note de transport » sans demande en transport normal) ; itinéraire saisi ; accompagnement, signalisation,
circulation ; schémas (SVG → PNG) ; pièces à joindre ; zone de signature. Champs inconnus : « à compléter ».
