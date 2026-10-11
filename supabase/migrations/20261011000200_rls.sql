-- =====================================================================
-- LevageGame — droits et Row Level Security
-- Principe : RLS activée partout ; anon ne lit que le catalogue public ;
-- authenticated ne voit/modifie que ses données ; le catalogue public
-- (owner_id IS NULL) n'est modifiable que par service_role (BYPASSRLS).
-- (select auth.uid()) est évalué une fois par requête (initPlan).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Privilèges de base (défense en profondeur, en plus de la RLS)
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema private to anon, authenticated, service_role;

-- anon : lecture du catalogue uniquement.
grant select on
  public.machine_types, public.manufacturers, public.machines,
  public.machine_configurations, public.load_charts, public.load_chart_points,
  public.chart_sources
to anon;

-- authenticated : CRUD filtré par la RLS ; versions sans UPDATE ni DELETE.
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke update, delete on public.study_versions from authenticated;
-- Référentiels gérés uniquement par service_role.
revoke insert, update, delete on public.machine_types, public.manufacturers from authenticated;

grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------
-- Fonction utilitaire : organisation de l'utilisateur courant.
-- SECURITY DEFINER pour éviter la récursion organizations <-> profiles.
-- ---------------------------------------------------------------------
create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id from public.profiles p where p.id = auth.uid();
$$;
revoke all on function private.current_organization_id() from public;
grant execute on function private.current_organization_id() to authenticated;

-- ---------------------------------------------------------------------
-- Activation de la RLS sur toutes les tables
-- ---------------------------------------------------------------------
alter table public.organizations          enable row level security;
alter table public.profiles               enable row level security;
alter table public.user_settings          enable row level security;
alter table public.projects               enable row level security;
alter table public.lifting_studies        enable row level security;
alter table public.study_versions         enable row level security;
alter table public.machine_types          enable row level security;
alter table public.manufacturers          enable row level security;
alter table public.machines               enable row level security;
alter table public.machine_configurations enable row level security;
alter table public.chart_sources          enable row level security;
alter table public.load_charts            enable row level security;
alter table public.load_chart_points      enable row level security;
alter table public.accessories            enable row level security;
alter table public.attachments            enable row level security;

-- ---------------------------------------------------------------------
-- Organisations (membres en lecture, créateur en écriture)
-- ---------------------------------------------------------------------
create policy organizations_select on public.organizations
  for select to authenticated
  using (
    created_by = (select auth.uid())
    or id = (select private.current_organization_id())
  );
create policy organizations_insert on public.organizations
  for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy organizations_update on public.organizations
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));
create policy organizations_delete on public.organizations
  for delete to authenticated
  using (created_by = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Profils et réglages : sa propre ligne (création par trigger d'inscription)
-- ---------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy user_settings_select on public.user_settings
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy user_settings_insert on public.user_settings
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy user_settings_update on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Projets / études / versions
-- ---------------------------------------------------------------------
create policy projects_all on public.projects
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy lifting_studies_all on public.lifting_studies
  for all to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = lifting_studies.project_id and p.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = lifting_studies.project_id and p.owner_id = (select auth.uid())
  ));

-- Versions : lecture et création seulement (aucune politique UPDATE/DELETE).
create policy study_versions_select on public.study_versions
  for select to authenticated
  using (exists (
    select 1 from public.lifting_studies s
    join public.projects p on p.id = s.project_id
    where s.id = study_versions.study_id and p.owner_id = (select auth.uid())
  ));
create policy study_versions_insert on public.study_versions
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.lifting_studies s
      join public.projects p on p.id = s.project_id
      where s.id = study_versions.study_id and p.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- Référentiels : lecture pour tous, écriture service_role seulement
-- ---------------------------------------------------------------------
create policy machine_types_select on public.machine_types
  for select to anon, authenticated using (true);
create policy manufacturers_select on public.manufacturers
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- Machines : public (owner_id NULL) ou personnelles
-- ---------------------------------------------------------------------
create policy machines_select on public.machines
  for select to anon, authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
-- WITH CHECK owner_id = uid : impossible de publier (owner_id NULL) ou de
-- céder une machine ; USING owner_id = uid : catalogue public intouchable.
create policy machines_insert on public.machines
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy machines_update on public.machines
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy machines_delete on public.machines
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Configurations : héritent de la machine.
create policy machine_configurations_select on public.machine_configurations
  for select to anon, authenticated
  using (exists (
    select 1 from public.machines m
    where m.id = machine_configurations.machine_id
      and (m.owner_id is null or m.owner_id = (select auth.uid()))
  ));
create policy machine_configurations_write on public.machine_configurations
  for all to authenticated
  using (exists (
    select 1 from public.machines m
    where m.id = machine_configurations.machine_id and m.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.machines m
    where m.id = machine_configurations.machine_id and m.owner_id = (select auth.uid())
  ));

-- Abaques : héritent de la configuration -> machine.
create policy load_charts_select on public.load_charts
  for select to anon, authenticated
  using (exists (
    select 1 from public.machine_configurations c
    join public.machines m on m.id = c.machine_id
    where c.id = load_charts.configuration_id
      and (m.owner_id is null or m.owner_id = (select auth.uid()))
  ));
create policy load_charts_write on public.load_charts
  for all to authenticated
  using (exists (
    select 1 from public.machine_configurations c
    join public.machines m on m.id = c.machine_id
    where c.id = load_charts.configuration_id and m.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.machine_configurations c
    join public.machines m on m.id = c.machine_id
    where c.id = load_charts.configuration_id and m.owner_id = (select auth.uid())
  ));

-- Points : héritent de l'abaque -> configuration -> machine.
create policy load_chart_points_select on public.load_chart_points
  for select to anon, authenticated
  using (exists (
    select 1 from public.load_charts lc
    join public.machine_configurations c on c.id = lc.configuration_id
    join public.machines m on m.id = c.machine_id
    where lc.id = load_chart_points.chart_id
      and (m.owner_id is null or m.owner_id = (select auth.uid()))
  ));
create policy load_chart_points_write on public.load_chart_points
  for all to authenticated
  using (exists (
    select 1 from public.load_charts lc
    join public.machine_configurations c on c.id = lc.configuration_id
    join public.machines m on m.id = c.machine_id
    where lc.id = load_chart_points.chart_id and m.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.load_charts lc
    join public.machine_configurations c on c.id = lc.configuration_id
    join public.machines m on m.id = c.machine_id
    where lc.id = load_chart_points.chart_id and m.owner_id = (select auth.uid())
  ));

-- Sources : lisibles si propres ou référencées par un abaque visible
-- (la sous-requête sur load_charts est elle-même filtrée par sa RLS).
create policy chart_sources_select on public.chart_sources
  for select to anon, authenticated
  using (
    owner_id = (select auth.uid())
    or exists (select 1 from public.load_charts lc where lc.source_id = chart_sources.id)
  );
create policy chart_sources_write on public.chart_sources
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Accessoires et pièces jointes
-- ---------------------------------------------------------------------
create policy accessories_all on public.accessories
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Une pièce jointe ne peut viser qu'une étude ou une machine de l'utilisateur.
create policy attachments_all on public.attachments
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (study_id is null or exists (
      select 1 from public.lifting_studies s
      join public.projects p on p.id = s.project_id
      where s.id = attachments.study_id and p.owner_id = (select auth.uid())
    ))
    and (machine_id is null or exists (
      select 1 from public.machines m
      where m.id = attachments.machine_id and m.owner_id = (select auth.uid())
    ))
  );
