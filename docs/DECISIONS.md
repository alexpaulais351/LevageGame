# DÉCISIONS

- D1 (proposée) — supabase-js + RLS au lieu de Prisma : Prisma se connecte en rôle privilégié et contourne la RLS exigée.
- D2 (proposée) — Supabase Auth au lieu de NextAuth : imposé par le cahier des charges (mdp + lien magique).
- D3 (proposée) — Mode invité stocké en IndexedDB, pas localStorage (interdit par le modèle).
- D4 (proposée) — Charte VINCI et patterns UI du modèle Conduc Rail conservés ; police Arial tant que VINCI Sans n'est pas fournie.
- D5 — Lecture d'abaque entre nœuds : valeur la plus défavorable par défaut ; interpolation seulement si autorisée par la doc ; jamais d'extrapolation.
- D6 — Tout abaque importé arrive en `a_verifier` ; passage en `verifie` uniquement après contrôle humain contre le PDF constructeur.
- D7 — PDF généré côté client (@react-pdf/renderer) pour fonctionner en mode invité.
- D8 — Moteur de calcul dans `src/engine/`, pur TypeScript, testé Vitest.
