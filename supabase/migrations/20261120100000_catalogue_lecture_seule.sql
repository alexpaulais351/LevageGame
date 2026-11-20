-- =====================================================================
-- Catalogue en lecture seule (D55, demande utilisateur 2026-11-20) : fin des machines personnelles.
-- Un utilisateur ne crée, ne modifie ni ne supprime plus aucune machine, configuration, abaque, nœud ou source.
-- Le catalogue est alimenté par l'administrateur (SQL / service_role) ; une demande d'abaque passe par un ticket (D54).
--
-- Les machines personnelles déjà créées restent lisibles par leur propriétaire (policies de lecture inchangées)
-- et disparaissent avec le compte (cascades inchangées). Aucune donnée n'est supprimée.
-- =====================================================================

drop policy if exists machines_insert on public.machines;
drop policy if exists machines_update on public.machines;
drop policy if exists machines_delete on public.machines;
drop policy if exists machine_configurations_write on public.machine_configurations;
drop policy if exists load_charts_write on public.load_charts;
drop policy if exists load_chart_points_write on public.load_chart_points;
drop policy if exists chart_sources_write on public.chart_sources;

revoke insert, update, delete on
  public.machines, public.machine_configurations, public.load_charts, public.load_chart_points, public.chart_sources
from authenticated, anon;

-- Pièces jointes : uniquement celles des études de l'utilisateur (plus de photo ni de PDF de machine).
drop policy if exists attachments_all on public.attachments;
create policy attachments_all on public.attachments
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and machine_id is null
    and (study_id is null or exists (
      select 1 from public.lifting_studies s
      join public.projects p on p.id = s.project_id
      where s.id = attachments.study_id and p.owner_id = (select auth.uid())
    ))
  );
