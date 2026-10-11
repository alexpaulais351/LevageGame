-- =====================================================================
-- Correctif (étape 8, machines personnelles) : suppression d'un compte utilisateur.
-- La suppression de auth.users déclenche en cascade, dans la même instruction :
--   - machines (owner_id) → machine_configurations → load_charts ;
--   - chart_sources (owner_id) ;
--   - load_charts.entered_by / verified_by `on delete set null` (UPDATE des abaques).
-- Les contrôles de clé étrangère immédiats voyaient un état intermédiaire de cette cascade :
--   - load_charts.source_id (RESTRICT) : la source disparaissait avant les abaques qui la référencent ;
--   - load_charts.configuration_id : l'UPDATE `set null` portait sur un abaque dont la
--     configuration était déjà supprimée.
-- Résultat : tout compte possédant un abaque personnel ne pouvait plus être supprimé.
-- Les deux contraintes passent en DIFFÉRÉES (contrôle au COMMIT, après toutes les cascades).
-- Intégrité inchangée : une source encore référencée, ou un abaque sans configuration,
-- reste refusé (23503) à la validation de la transaction ; seule l'échéance du contrôle change.
-- =====================================================================
alter table public.load_charts drop constraint load_charts_source_id_fkey;
alter table public.load_charts
  add constraint load_charts_source_id_fkey
  foreign key (source_id) references public.chart_sources (id)
  on delete no action
  deferrable initially deferred;

alter table public.load_charts drop constraint load_charts_configuration_id_fkey;
alter table public.load_charts
  add constraint load_charts_configuration_id_fkey
  foreign key (configuration_id) references public.machine_configurations (id)
  on delete cascade
  deferrable initially deferred;
