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
