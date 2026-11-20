-- =====================================================================
-- Tickets : demandes des utilisateurs à l'administrateur (D54, repris du module « Tickets » de Contrat Game).
--  - tout compte approuvé ouvre un ticket et ne voit que les siens ;
--  - l'administrateur voit tous les tickets et les traite (statut, priorité, réponse) ;
--  - suppression : l'administrateur, ou l'auteur tant que le ticket est « nouveau » ;
--  - titre, description, catégorie, page et auteur ne sont jamais modifiables après création (trigger de garde).
-- =====================================================================

create table public.tickets (
  id          uuid primary key default gen_random_uuid(),
  numero      bigint generated always as identity unique,
  auteur_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titre       text not null check (char_length(btrim(titre)) between 3 and 160),
  description text not null check (char_length(btrim(description)) between 5 and 10000),
  categorie   text not null default 'amelioration'
              check (categorie in ('amelioration', 'anomalie', 'export', 'affichage', 'donnees', 'abaque', 'autre')),
  priorite    text not null default 'normale' check (priorite in ('basse', 'normale', 'haute')),
  statut      text not null default 'nouveau' check (statut in ('nouveau', 'en_cours', 'resolu', 'refuse')),
  page        text check (char_length(page) <= 300),
  reponse     text check (char_length(reponse) <= 10000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index tickets_statut_created_idx on public.tickets (statut, created_at desc);
create index tickets_auteur_idx on public.tickets (auteur_id, created_at desc);

create trigger set_updated_at before update on public.tickets
  for each row execute function private.set_updated_at();

-- Garde : après création, seuls statut / priorité / réponse évoluent (par l'administrateur, cf. policies).
create or replace function private.tickets_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.auteur_id is distinct from old.auteur_id
       or new.numero is distinct from old.numero
       or new.titre is distinct from old.titre
       or new.description is distinct from old.description
       or new.categorie is distinct from old.categorie
       or new.page is distinct from old.page
       or new.created_at is distinct from old.created_at then
      raise exception 'seuls le statut, la priorité et la réponse d''un ticket sont modifiables' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.tickets_guard() from public;
create trigger tickets_guard before update on public.tickets
  for each row execute function private.tickets_guard();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.tickets enable row level security;
-- Les privilèges par défaut de Supabase accordent tout à authenticated : on repart de zéro.
revoke all on public.tickets from anon, authenticated;
grant select, insert, delete on public.tickets to authenticated;
grant update (statut, priorite, reponse) on public.tickets to authenticated;
grant all on public.tickets to service_role;

create policy tickets_select on public.tickets
  for select to authenticated
  using (auteur_id = (select auth.uid()) or (select private.est_admin()));

-- Création : pour soi, au statut « nouveau », sans réponse.
create policy tickets_insert on public.tickets
  for insert to authenticated
  with check (auteur_id = (select auth.uid()) and statut = 'nouveau' and reponse is null);

-- Traitement : administrateur uniquement.
create policy tickets_update on public.tickets
  for update to authenticated
  using ((select private.est_admin())) with check ((select private.est_admin()));

create policy tickets_delete on public.tickets
  for delete to authenticated
  using ((select private.est_admin()) or (auteur_id = (select auth.uid()) and statut = 'nouveau'));

-- Compte approuvé exigé (D25).
create policy tickets_compte_approuve on public.tickets
  as restrictive for all to authenticated
  using ((select private.est_approuve())) with check ((select private.est_approuve()));

-- ---------------------------------------------------------------------
-- Lecture avec l'auteur (nom, e-mail) : profils et auth.users ne sont pas lisibles entre comptes.
-- L'administrateur reçoit tous les tickets ; un utilisateur, les siens.
-- ---------------------------------------------------------------------
create or replace function public.lister_tickets()
returns table (
  id uuid,
  numero bigint,
  titre text,
  description text,
  categorie text,
  priorite text,
  statut text,
  page text,
  reponse text,
  created_at timestamptz,
  updated_at timestamptz,
  auteur_id uuid,
  auteur_nom text,
  auteur_email text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  admin boolean;
begin
  if uid is null or not private.est_approuve() then
    raise exception 'réservé aux comptes validés' using errcode = '42501';
  end if;
  admin := private.est_admin();
  return query
    select t.id, t.numero, t.titre, t.description, t.categorie, t.priorite, t.statut, t.page, t.reponse,
           t.created_at, t.updated_at, t.auteur_id, p.full_name, u.email::text
    from public.tickets t
    join auth.users u on u.id = t.auteur_id
    left join public.profiles p on p.id = t.auteur_id
    where admin or t.auteur_id = uid
    order by t.created_at desc;
end;
$$;
revoke all on function public.lister_tickets() from public, anon;
grant execute on function public.lister_tickets() to authenticated;
