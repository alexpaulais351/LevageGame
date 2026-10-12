-- =====================================================================
-- LevageGame — seuil vert par défaut porté de 80 % à 90 % (demande utilisateur 2026-10-12, D33).
-- Les réglages restés sur l'ancien défaut (80 / 100) passent à 90 / 100 ; un réglage personnalisé
-- est conservé. Les études et versions déjà enregistrées gardent leurs propres seuils.
-- =====================================================================
alter table public.user_settings alter column threshold_green set default 90;

update public.user_settings
   set threshold_green = 90
 where threshold_green = 80 and threshold_orange = 100;
