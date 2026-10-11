-- =====================================================================
-- LevageGame — schéma initial (tables, types, contraintes, triggers)
-- Unités internes : kg, m. Les montants physiques sont en numeric
-- (valeurs exactes, pas d'arrondi flottant sur les capacités d'abaque).
-- Les politiques RLS sont dans la migration suivante (_rls.sql).
-- =====================================================================

-- Schéma interne, non exposé par l'API, pour les fonctions utilitaires.
create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------
create type public.study_status as enum ('brouillon', 'valide', 'archive');
create type public.chart_status as enum ('a_verifier', 'verifie');
create type public.chart_axis_y as enum ('boom_length_m', 'height_m', 'none');
create type public.accessory_kind as enum (
  'elingue_chaine', 'cable', 'textile', 'manille', 'palonnier', 'crochet'
);
create type public.attachment_kind as enum (
  'pdf_constructeur', 'plan', 'photo', 'logo', 'autre'
);

-- ---------------------------------------------------------------------
-- Fonction générique de mise à jour de updated_at
-- ---------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Organisations et profils
-- ---------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  logo_path   text,
  address     text,
  siret       text check (siret is null or siret ~ '^[0-9]{14}$'),
  -- Créateur : seul habilité à modifier l'organisation (MVP mono-utilisateur).
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index organizations_created_by_idx on public.organizations (created_by);

create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  organization_id  uuid references public.organizations (id) on delete set null,
  full_name        text,
  role             text,   -- fonction métier (chef de chantier…), pas un rôle d'accès
  phone            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index profiles_organization_id_idx on public.profiles (organization_id);

-- ---------------------------------------------------------------------
-- Réglages utilisateur (seuils du verdict, en %)
-- ---------------------------------------------------------------------
create table public.user_settings (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  threshold_green   numeric(5,2) not null default 80,
  threshold_orange  numeric(5,2) not null default 100,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint user_settings_thresholds_chk
    check (threshold_green > 0 and threshold_green < threshold_orange and threshold_orange <= 100)
);

-- ---------------------------------------------------------------------
-- Projets, études, versions
-- ---------------------------------------------------------------------
create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  organization_id  uuid references public.organizations (id) on delete set null,
  name             text not null check (length(btrim(name)) > 0),
  site_address     text,
  client           text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index projects_owner_id_idx on public.projects (owner_id);
create index projects_organization_id_idx on public.projects (organization_id);

create table public.lifting_studies (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  reference           text,
  title               text not null check (length(btrim(title)) > 0),
  status              public.study_status not null default 'brouillon',
  current_version_id  uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index lifting_studies_project_id_idx on public.lifting_studies (project_id);
create index lifting_studies_current_version_id_idx on public.lifting_studies (current_version_id);
create unique index lifting_studies_reference_uq
  on public.lifting_studies (project_id, reference) where reference is not null;

-- Version figée d'une étude : ni UPDATE (trigger + absence de politique),
-- ni DELETE direct (suppression uniquement par cascade de l'étude).
-- Pas de colonne updated_at : la ligne n'est jamais modifiée.
create table public.study_versions (
  id          uuid primary key default gen_random_uuid(),
  study_id    uuid not null references public.lifting_studies (id) on delete cascade,
  index       integer not null check (index > 0),
  data        jsonb not null check (jsonb_typeof(data) = 'object'),
  result      jsonb check (result is null or jsonb_typeof(result) = 'object'),
  author_id   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint study_versions_study_index_uq unique (study_id, index),
  -- Cible de la FK composite depuis lifting_studies (version de la même étude).
  constraint study_versions_study_id_id_uq unique (study_id, id)
);
create index study_versions_author_id_idx on public.study_versions (author_id);

-- La version courante doit appartenir à la même étude (FK composite) ;
-- à la suppression de la version, seule current_version_id est remise à NULL.
alter table public.lifting_studies
  add constraint lifting_studies_current_version_fk
  foreign key (id, current_version_id)
  references public.study_versions (study_id, id)
  on delete set null (current_version_id);

-- Numérotation automatique des versions si index non fourni.
create or replace function private.study_versions_set_index()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.index is null then
    select coalesce(max(v.index), 0) + 1 into new.index
    from public.study_versions v
    where v.study_id = new.study_id;
  end if;
  return new;
end;
$$;

-- Immuabilité : toute modification est refusée, quel que soit le rôle.
create or replace function private.study_versions_forbid_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'study_versions est immuable : créer une nouvelle version'
    using errcode = 'P0001';
end;
$$;

create trigger study_versions_set_index
  before insert on public.study_versions
  for each row execute function private.study_versions_set_index();

create trigger study_versions_forbid_update
  before update on public.study_versions
  for each row execute function private.study_versions_forbid_update();

-- ---------------------------------------------------------------------
-- Catalogue machines
-- ---------------------------------------------------------------------
-- Un type de machine = une ligne + un schéma JSON des paramètres de
-- configuration attendus (extensible sans migration).
create table public.machine_types (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  label          text not null,
  family         text not null,
  params_schema  jsonb not null default '{}'::jsonb check (jsonb_typeof(params_schema) = 'object'),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.manufacturers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index manufacturers_name_uq on public.manufacturers (lower(name));

-- owner_id NULL = catalogue public (modifiable uniquement par service_role).
create table public.machines (
  id               uuid primary key default gen_random_uuid(),
  type_id          uuid not null references public.machine_types (id) on delete restrict,
  manufacturer_id  uuid not null references public.manufacturers (id) on delete restrict,
  model            text not null check (length(btrim(model)) > 0),
  owner_id         uuid references auth.users (id) on delete cascade,
  specs            jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index machines_type_id_idx on public.machines (type_id);
create index machines_manufacturer_id_idx on public.machines (manufacturer_id);
create index machines_owner_id_idx on public.machines (owner_id);
create unique index machines_public_model_uq
  on public.machines (manufacturer_id, lower(model)) where owner_id is null;

create table public.machine_configurations (
  id                  uuid primary key default gen_random_uuid(),
  machine_id          uuid not null references public.machines (id) on delete cascade,
  label               text not null check (length(btrim(label)) > 0),
  params              jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object'),
  hook_block_mass_kg  numeric(10,2) check (hook_block_mass_kg is null or hook_block_mass_kg >= 0),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index machine_configurations_machine_id_idx on public.machine_configurations (machine_id);

-- Documents constructeur. owner_id NULL = source du catalogue public.
create table public.chart_sources (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references auth.users (id) on delete cascade,
  document_title  text not null check (length(btrim(document_title)) > 0),
  reference       text,
  edition         text,
  url             text,
  file_path       text,
  publisher       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index chart_sources_owner_id_idx on public.chart_sources (owner_id);

create table public.load_charts (
  id                     uuid primary key default gen_random_uuid(),
  configuration_id       uuid not null references public.machine_configurations (id) on delete cascade,
  axis_x                 text not null default 'radius_m' check (axis_x = 'radius_m'),
  axis_y                 public.chart_axis_y not null default 'none',
  unit                   text not null default 'kg' check (unit = 'kg'),
  standard               text,   -- EN 13000, ISO 10567, EN 1459…
  deductions_included    boolean not null default false,
  interpolation_allowed  boolean not null default false,
  status                 public.chart_status not null default 'a_verifier',
  source_id              uuid references public.chart_sources (id) on delete restrict,
  entered_by             uuid default auth.uid() references auth.users (id) on delete set null,
  entered_at             timestamptz not null default now(),
  verified_by            uuid references auth.users (id) on delete set null,
  verified_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- Un abaque « vérifié » porte obligatoirement sa date de vérification.
  constraint load_charts_verified_chk
    check (status <> 'verifie' or verified_at is not null)
);
create index load_charts_configuration_id_idx on public.load_charts (configuration_id);
create index load_charts_source_id_idx on public.load_charts (source_id);
create index load_charts_entered_by_idx on public.load_charts (entered_by);
create index load_charts_verified_by_idx on public.load_charts (verified_by);

-- Nœuds de l'abaque. y NOT NULL DEFAULT 0 : une colonne de clé primaire ne
-- peut être NULL ; pour axis_y = 'none' (abaque à une dimension), y vaut 0
-- par convention, garanti par trigger.
create table public.load_chart_points (
  chart_id     uuid not null references public.load_charts (id) on delete cascade,
  x            numeric(7,2) not null check (x >= 0),
  y            numeric(7,2) not null default 0 check (y >= 0),
  capacity_kg  numeric(10,1) not null check (capacity_kg >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (chart_id, x, y)
);

-- y = 0 imposé quand l'abaque n'a pas d'axe secondaire.
create or replace function private.load_chart_points_check_y()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_axis public.chart_axis_y;
begin
  select c.axis_y into v_axis from public.load_charts c where c.id = new.chart_id;
  if v_axis = 'none' and new.y <> 0 then
    raise exception 'abaque sans axe y : y doit valoir 0 (reçu %)', new.y
      using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Garde-fous sur load_charts :
--  - passage en axis_y='none' interdit si des points ont y <> 0 ;
--  - passage en 'verifie' par un utilisateur : vérificateur = lui-même, date = maintenant ;
--  - retour en 'a_verifier' : traces de vérification effacées.
create or replace function private.load_charts_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.axis_y = 'none' and old.axis_y <> 'none'
     and exists (select 1 from public.load_chart_points p where p.chart_id = new.id and p.y <> 0) then
    raise exception 'axis_y = none incompatible avec des points y <> 0'
      using errcode = '23514';
  end if;

  if new.status = 'verifie' then
    if (tg_op = 'INSERT' or old.status <> 'verifie') and auth.uid() is not null then
      new.verified_by := auth.uid();
      new.verified_at := now();
    end if;
  else
    new.verified_by := null;
    new.verified_at := null;
  end if;
  return new;
end;
$$;

create trigger load_chart_points_check_y
  before insert or update on public.load_chart_points
  for each row execute function private.load_chart_points_check_y();

create trigger load_charts_guard
  before insert or update on public.load_charts
  for each row execute function private.load_charts_guard();

-- ---------------------------------------------------------------------
-- Accessoires de levage et pièces jointes (données utilisateur)
-- ---------------------------------------------------------------------
create table public.accessories (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        public.accessory_kind not null,
  label       text not null check (length(btrim(label)) > 0),
  wll_kg      numeric(10,1) not null check (wll_kg >= 0),   -- CMU
  specs       jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  vgp_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index accessories_owner_id_idx on public.accessories (owner_id);

-- Le fichier est rangé dans le bucket user-files sous <owner_id>/…
create table public.attachments (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  study_id    uuid references public.lifting_studies (id) on delete cascade,
  machine_id  uuid references public.machines (id) on delete cascade,
  kind        public.attachment_kind not null,
  file_path   text not null,
  mime        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint attachments_path_prefix_chk check (file_path like owner_id::text || '/%')
);
create index attachments_owner_id_idx on public.attachments (owner_id);
create index attachments_study_id_idx on public.attachments (study_id);
create index attachments_machine_id_idx on public.attachments (machine_id);

-- ---------------------------------------------------------------------
-- Triggers updated_at (toutes les tables qui en ont)
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations', 'profiles', 'user_settings', 'projects', 'lifting_studies',
    'machine_types', 'manufacturers', 'machines', 'machine_configurations',
    'chart_sources', 'load_charts', 'load_chart_points', 'accessories', 'attachments'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function private.set_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Création automatique du profil et des réglages à l'inscription
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Un profil ne peut rejoindre qu'une organisation créée par l'utilisateur
-- (l'adhésion multi-membres sera gérée côté serveur plus tard).
create or replace function private.profiles_guard_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and new.organization_id is not null
     and new.organization_id is distinct from old.organization_id
     and not exists (
       select 1 from public.organizations o
       where o.id = new.organization_id and o.created_by = auth.uid()
     ) then
    raise exception 'organisation non autorisée' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.profiles_guard_organization() from public;

create trigger profiles_guard_organization
  before update on public.profiles
  for each row execute function private.profiles_guard_organization();
