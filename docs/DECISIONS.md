# DÉCISIONS

- D1 (validée 2026-10-11) — supabase-js + RLS au lieu de Prisma : Prisma se connecte en rôle privilégié et contourne la RLS exigée.
- D2 (validée 2026-10-11) — Supabase Auth au lieu de NextAuth : imposé par le cahier des charges (mdp + lien magique).
- D3 (validée 2026-10-11) — Mode invité stocké en IndexedDB, pas localStorage (interdit par le modèle).
- D4 (validée 2026-10-11) — Charte VINCI et patterns UI du modèle Conduc Rail conservés ; polices VINCI fournies le 2026-10-11.
- D5 — Lecture d'abaque entre nœuds : valeur la plus défavorable par défaut ; interpolation seulement si autorisée par la doc ; jamais d'extrapolation.
- D6 — Tout abaque importé arrive en `a_verifier` ; passage en `verifie` uniquement après contrôle humain contre le PDF constructeur.
- D7 — PDF généré côté client (@react-pdf/renderer) pour fonctionner en mode invité.
- D8 — Moteur de calcul dans `src/engine/`, pur TypeScript, testé Vitest.
- D9 — Polices VINCI commitées dans le dépôt public (choix explicite de l'utilisateur, 2026-10-11) ; Expanded, Rounded et Dingbats non utilisées.
- D10 — `load_chart_points.y` NOT NULL DEFAULT 0 : colonne de clé primaire (PK(chart_id,x,y)) ; pour `axis_y = 'none'`, y = 0 imposé par trigger.
- D11 — `study_versions` immuable : aucun droit UPDATE/DELETE pour `authenticated` + trigger refusant tout UPDATE (même `service_role`) ; suppression uniquement par cascade de l'étude.
- D12 — `lifting_studies.current_version_id` : FK composite (id, current_version_id) → study_versions(study_id, id) pour garantir que la version courante appartient à l'étude.
- D13 — `chart_sources.owner_id` ajouté (NULL = source publique) pour permettre aux utilisateurs de sourcer leurs abaques perso ; lecture si propre ou référencée par un abaque visible.
- D14 — `machine_types` et `manufacturers` : référentiels en lecture seule hors `service_role`.
- D15 — Passage d'un abaque perso en `verifie` : `verified_by`/`verified_at` forcés par trigger à l'utilisateur courant ; un abaque public n'est modifiable que par `service_role`.
- D16 — Fonctions utilitaires/triggers dans un schéma `private` non exposé, `search_path = ''` ; seuils verdict contraints 0 < vert < orange ≤ 100.
