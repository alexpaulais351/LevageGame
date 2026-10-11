-- =====================================================================
-- LevageGame — suppression du mode invité et validation des comptes par l'administrateur (D25).
--
-- Principe :
--  - tout compte créé (mot de passe ou lien magique) naît `en_attente` ; il n'accède à AUCUNE
--    donnée (catalogue compris) tant qu'un administrateur ne l'a pas `approuve` ;
--  - le rôle anon n'a plus aucune lecture (le mode invité est supprimé) ;
--  - un utilisateur ne peut jamais modifier lui-même statut / est_admin / statut_modifie_* ;
--  - l'administrateur agit via deux RPC SECURITY DEFINER (admin_lister_comptes, admin_definir_statut) ;
--  - le premier administrateur est désigné hors application : private.designer_admin(email),
--    exécutable uniquement par postgres / service_role.
--
-- REPRISE DE L'EXISTANT : les profils déjà présents au moment de la migration (comptes créés en
-- production par l'utilisateur avant l'introduction de la validation) passent en `approuve`.
-- Seuls les comptes créés APRÈS la migration attendent une validation.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Statut de compte sur profiles
-- ---------------------------------------------------------------------
create type public.statut_compte as enum ('en_attente', 'approuve', 'refuse', 'suspendu');

alter table public.profiles
  add column statut              public.statut_compte not null default 'en_attente',
  add column est_admin           boolean not null default false,
  add column statut_modifie_par  uuid references auth.users (id) on delete set null,
  add column statut_modifie_le   timestamptz,
  -- Entreprise déclarée à l'inscription (avant toute organisation) : information pour l'administrateur.
  add column entreprise_declaree text;

alter table public.profiles
  add constraint profiles_entreprise_declaree_len check (char_length(entreprise_declaree) <= 160);

-- Comptes existants : approuvés (cf. en-tête).
update public.profiles set statut = 'approuve', statut_modifie_le = now();

create index profiles_statut_idx on public.profiles (statut);

-- ---------------------------------------------------------------------
-- 2. Fonctions d'autorisation (schéma private, non exposé)
-- ---------------------------------------------------------------------
create or replace function private.est_approuve()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.statut = 'approuve'
  );
$$;
revoke all on function private.est_approuve() from public, anon;
grant execute on function private.est_approuve() to authenticated, service_role;

create or replace function private.est_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.est_admin and p.statut = 'approuve'
  );
$$;
revoke all on function private.est_admin() from public, anon;
grant execute on function private.est_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. Garde : statut / est_admin / statut_modifie_* jamais modifiables par l'utilisateur
-- SECURITY INVOKER volontairement : `current_user` vaut `authenticated` pour une requête de
-- l'API, et le propriétaire (postgres) à l'intérieur des fonctions SECURITY DEFINER d'administration.
-- ---------------------------------------------------------------------
create or replace function private.profiles_guard_statut()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      raise exception 'création de profil réservée au système' using errcode = '42501';
    end if;
    if new.statut is distinct from old.statut
       or new.est_admin is distinct from old.est_admin
       or new.statut_modifie_par is distinct from old.statut_modifie_par
       or new.statut_modifie_le is distinct from old.statut_modifie_le then
      raise exception 'statut du compte non modifiable par l''utilisateur' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.profiles_guard_statut() from public;

create trigger profiles_guard_statut
  before insert or update on public.profiles
  for each row execute function private.profiles_guard_statut();

-- ---------------------------------------------------------------------
-- 4. Inscription : entreprise déclarée conservée (statut en_attente par défaut)
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, entreprise_declaree)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    left(nullif(btrim(new.raw_user_meta_data ->> 'entreprise'), ''), 160)
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;

-- ---------------------------------------------------------------------
-- 5. Plus aucun accès anon
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;

alter policy machine_types_select          on public.machine_types          to authenticated;
alter policy manufacturers_select          on public.manufacturers          to authenticated;
alter policy machines_select               on public.machines               to authenticated;
alter policy machine_configurations_select on public.machine_configurations to authenticated;
alter policy load_charts_select            on public.load_charts            to authenticated;
alter policy load_chart_points_select      on public.load_chart_points      to authenticated;
alter policy chart_sources_select          on public.chart_sources          to authenticated;
alter policy chart_sources_read            on storage.objects               to authenticated;

-- PDF constructeur : bucket privé (l'URL publique contournait toute vérification de compte).
update storage.buckets set public = false where id = 'chart-sources';

-- ---------------------------------------------------------------------
-- 6. Compte approuvé exigé : politiques RESTRICTIVES (combinées en ET avec les politiques
-- existantes, qui restent inchangées). Aucune donnée n'est lisible ni modifiable hors statut approuve.
-- ---------------------------------------------------------------------
create policy organizations_compte_approuve on public.organizations
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));
create policy user_settings_compte_approuve on public.user_settings
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));
create policy projects_compte_approuve on public.projects
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));
create policy lifting_studies_compte_approuve on public.lifting_studies
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));
create policy study_versions_compte_approuve on public.study_versions
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));
create policy machine_types_compte_approuve on public.machine_types
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));
create policy manufacturers_compte_approuve on public.manufacturers
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));
create policy machines_compte_approuve on public.machines
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));
create policy machine_configurations_compte_approuve on public.machine_configurations
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));
create policy chart_sources_compte_approuve on public.chart_sources
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));
create policy load_charts_compte_approuve on public.load_charts
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));
create policy load_chart_points_compte_approuve on public.load_chart_points
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));
create policy accessories_compte_approuve on public.accessories
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));
create policy attachments_compte_approuve on public.attachments
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));

-- Profil : le propriétaire lit TOUJOURS sa ligne (affichage « en attente ») ;
-- la modification (nom, fonction…) exige un compte approuvé.
create policy profiles_update_compte_approuve on public.profiles
  as restrictive for update to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));

-- Storage : buckets de l'application réservés aux comptes approuvés.
create policy app_buckets_compte_approuve on storage.objects
  as restrictive for all to authenticated
  using (bucket_id not in ('user-files', 'chart-sources') or (select private.est_approuve()))
  with check (bucket_id not in ('user-files', 'chart-sources') or (select private.est_approuve()));

-- ---------------------------------------------------------------------
-- 7. RPC d'administration (exposées, vérifient elles-mêmes est_admin)
-- ---------------------------------------------------------------------
create or replace function public.admin_lister_comptes()
returns table (
  id uuid,
  email text,
  nom text,
  entreprise text,
  statut public.statut_compte,
  est_admin boolean,
  created_at timestamptz,
  statut_modifie_le timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.est_admin() then
    raise exception 'réservé à l''administrateur' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.full_name, coalesce(o.name, p.entreprise_declaree),
           p.statut, p.est_admin, p.created_at, p.statut_modifie_le
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.organizations o on o.id = p.organization_id
    order by p.created_at desc;
end;
$$;
revoke all on function public.admin_lister_comptes() from public, anon;
grant execute on function public.admin_lister_comptes() to authenticated;

create or replace function public.admin_definir_statut(user_id uuid, statut public.statut_compte)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  appelant uuid := auth.uid();
  cible public.profiles%rowtype;
begin
  if appelant is null or not private.est_admin() then
    raise exception 'réservé à l''administrateur' using errcode = '42501';
  end if;
  if admin_definir_statut.user_id = appelant then
    raise exception 'un administrateur ne peut pas modifier son propre compte' using errcode = '42501';
  end if;
  if admin_definir_statut.statut = 'en_attente' then
    raise exception 'statut cible invalide' using errcode = '22023';
  end if;
  select * into cible from public.profiles p where p.id = admin_definir_statut.user_id for update;
  if not found then
    raise exception 'compte introuvable' using errcode = 'P0002';
  end if;
  if cible.est_admin then
    raise exception 'un compte administrateur ne se gère pas depuis l''application' using errcode = '42501';
  end if;
  update public.profiles p
     set statut = admin_definir_statut.statut,
         statut_modifie_par = appelant,
         statut_modifie_le = now()
   where p.id = admin_definir_statut.user_id;
end;
$$;
revoke all on function public.admin_definir_statut(uuid, public.statut_compte) from public, anon;
grant execute on function public.admin_definir_statut(uuid, public.statut_compte) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Désignation de l'administrateur (hors application : SQL postgres / service_role)
--    select private.designer_admin('adresse@exemple.fr');
-- ---------------------------------------------------------------------
create or replace function private.designer_admin(email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  select u.id into uid from auth.users u where lower(u.email) = lower(btrim(designer_admin.email));
  if uid is null then
    raise exception 'aucun compte pour %', designer_admin.email using errcode = 'P0002';
  end if;
  update public.profiles p
     set statut = 'approuve', est_admin = true, statut_modifie_par = null, statut_modifie_le = now()
   where p.id = uid;
  if not found then
    raise exception 'profil absent pour %', designer_admin.email using errcode = 'P0002';
  end if;
  return uid;
end;
$$;
revoke all on function private.designer_admin(text) from public, anon, authenticated;
grant execute on function private.designer_admin(text) to service_role;

-- ---------------------------------------------------------------------
-- 9. Notification e-mail de l'administrateur à chaque inscription (Database Webhook maison).
-- Appelle l'Edge Function `notifier-inscription` via pg_net, avec l'URL et le secret partagé lus
-- dans Vault (secrets `notifier_inscription_url` et `notifier_inscription_secret`).
-- Sans ces secrets (local, CI) : aucun appel. Une erreur d'appel ne bloque jamais l'inscription.
-- ---------------------------------------------------------------------
create extension if not exists pg_net;

create or replace function private.notifier_inscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  url text;
  secret text;
  courriel text;
begin
  select s.decrypted_secret into url from vault.decrypted_secrets s where s.name = 'notifier_inscription_url';
  select s.decrypted_secret into secret from vault.decrypted_secrets s where s.name = 'notifier_inscription_secret';
  if url is null or secret is null or new.statut <> 'en_attente' then
    return new;
  end if;
  select u.email::text into courriel from auth.users u where u.id = new.id;
  begin
    perform net.http_post(
      url := url,
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'profiles',
        'record', jsonb_build_object(
          'id', new.id,
          'full_name', new.full_name,
          'entreprise_declaree', new.entreprise_declaree,
          'statut', new.statut,
          'created_at', new.created_at,
          'email', courriel
        )
      ),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', secret),
      timeout_milliseconds := 5000
    );
  exception when others then
    raise warning 'notifier_inscription : appel impossible (%)', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function private.notifier_inscription() from public;

create trigger profiles_notifier_inscription
  after insert on public.profiles
  for each row execute function private.notifier_inscription();
