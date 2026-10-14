-- Suivi de fréquentation pour l'administrateur (D41) : connexions et pages vues par compte.
--  - journal en schéma private (aucun accès direct depuis l'API) ;
--  - écriture uniquement par deux RPC SECURITY DEFINER limitées à l'utilisateur courant ;
--  - lecture uniquement par admin_statistiques (vérifie est_admin).
-- Une ligne par compte, jour (Europe/Paris) et page : le volume reste faible.

create table private.journal_visites (
  user_id  uuid not null references auth.users (id) on delete cascade,
  jour     date not null,
  chemin   text not null,
  vues     integer not null default 1,
  premiere timestamptz not null default now(),
  derniere timestamptz not null default now(),
  primary key (user_id, jour, chemin)
);
create index journal_visites_jour_idx on private.journal_visites (jour);

create table private.journal_connexions (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  le      timestamptz not null default now()
);
create index journal_connexions_le_idx on private.journal_connexions (le);
create index journal_connexions_user_idx on private.journal_connexions (user_id, le desc);

revoke all on private.journal_visites, private.journal_connexions from public, anon, authenticated;

-- Page vue par le compte courant (approuvé). Identifiants remplacés par « :id » pour regrouper les pages.
create or replace function public.noter_visite(chemin text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  c text;
begin
  if uid is null or not private.est_approuve() then
    return;
  end if;
  c := lower(split_part(split_part(coalesce(noter_visite.chemin, ''), '?', 1), '#', 1));
  c := regexp_replace(c, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', ':id', 'g');
  c := left(c, 80);
  if c !~ '^/[a-z0-9/:_\-]*$' then
    return;
  end if;
  insert into private.journal_visites as j (user_id, jour, chemin)
  values (uid, (now() at time zone 'Europe/Paris')::date, c)
  on conflict (user_id, jour, chemin) do update set vues = j.vues + 1, derniere = now();
end;
$$;
revoke all on function public.noter_visite(text) from public, anon;
grant execute on function public.noter_visite(text) to authenticated;

-- Connexion réussie du compte courant (appelée après signInWithPassword ; tout statut).
create or replace function public.noter_connexion()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into private.journal_connexions (user_id) values (auth.uid());
end;
$$;
revoke all on function public.noter_connexion() from public, anon;
grant execute on function public.noter_connexion() to authenticated;

-- Indicateurs pour la page /admin/statistiques (période de 1 à 365 jours).
create or replace function public.admin_statistiques(jours integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  n integer := least(greatest(coalesce(admin_statistiques.jours, 30), 1), 365);
  aujourdhui date := (now() at time zone 'Europe/Paris')::date;
  debut date := aujourdhui - (n - 1);
  resultat jsonb;
begin
  if not private.est_admin() then
    raise exception 'réservé à l''administrateur' using errcode = '42501';
  end if;

  with
  v as (select * from private.journal_visites where jour >= debut),
  cx as (select user_id, (le at time zone 'Europe/Paris')::date as jour from private.journal_connexions where le >= debut::timestamp at time zone 'Europe/Paris'),
  serie as (
    select d::date as jour,
           (select count(distinct user_id) from v where v.jour = d::date) as visiteurs,
           (select coalesce(sum(vues), 0) from v where v.jour = d::date) as vues,
           (select count(*) from cx where cx.jour = d::date) as connexions
    from generate_series(debut, aujourdhui, interval '1 day') d
  ),
  pages as (
    select chemin, sum(vues) as vues, count(distinct user_id) as visiteurs
    from v group by chemin order by sum(vues) desc, chemin limit 15
  ),
  comptes as (
    select p.id, u.email::text as email, p.full_name as nom, coalesce(o.name, p.entreprise_declaree) as entreprise,
           p.statut, p.est_admin, p.created_at,
           greatest(u.last_sign_in_at, (select max(le) from private.journal_connexions jc where jc.user_id = p.id)) as derniere_connexion,
           (select max(derniere) from private.journal_visites jv where jv.user_id = p.id) as derniere_activite,
           (select count(*) from cx where cx.user_id = p.id) as connexions,
           (select coalesce(sum(vues), 0) from v where v.user_id = p.id) as vues,
           (select count(distinct jour) from v where v.user_id = p.id) as jours_actifs,
           (select count(*) from public.projects pr where pr.owner_id = p.id) as projets,
           (select count(*) from public.lifting_studies s join public.projects pr on pr.id = s.project_id where pr.owner_id = p.id) as etudes
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.organizations o on o.id = p.organization_id
  )
  select jsonb_build_object(
    'jours', n,
    'debut', debut,
    'fin', aujourdhui,
    'comptes_par_statut', (select coalesce(jsonb_object_agg(statut, nb), '{}'::jsonb) from (select statut::text as statut, count(*) as nb from public.profiles group by statut) s),
    'inscriptions', (select count(*) from public.profiles where created_at >= debut::timestamp at time zone 'Europe/Paris'),
    'actifs_jour', (select count(distinct user_id) from v where jour = aujourdhui),
    'actifs_7j', (select count(distinct user_id) from v where jour > aujourdhui - 7),
    'actifs_periode', (select count(distinct user_id) from v),
    'connexions', (select count(*) from cx),
    'vues', (select coalesce(sum(vues), 0) from v),
    'projets', (select count(*) from public.projects),
    'etudes', (select count(*) from public.lifting_studies),
    'serie', (select coalesce(jsonb_agg(jsonb_build_object('jour', jour, 'visiteurs', visiteurs, 'vues', vues, 'connexions', connexions) order by jour), '[]'::jsonb) from serie),
    'pages', (select coalesce(jsonb_agg(jsonb_build_object('chemin', chemin, 'vues', vues, 'visiteurs', visiteurs)), '[]'::jsonb) from pages),
    'comptes', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'email', email, 'nom', nom, 'entreprise', entreprise, 'statut', statut, 'est_admin', est_admin,
        'cree_le', created_at, 'derniere_connexion', derniere_connexion, 'derniere_activite', derniere_activite,
        'connexions', connexions, 'vues', vues, 'jours_actifs', jours_actifs, 'projets', projets, 'etudes', etudes)
        order by coalesce(derniere_activite, derniere_connexion) desc nulls last, created_at desc), '[]'::jsonb) from comptes)
  ) into resultat;
  return resultat;
end;
$$;
revoke all on function public.admin_statistiques(integer) from public, anon;
grant execute on function public.admin_statistiques(integer) to authenticated;
