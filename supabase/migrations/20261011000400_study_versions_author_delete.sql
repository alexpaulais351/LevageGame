-- =====================================================================
-- Correctif : suppression d'un compte utilisateur.
-- study_versions.author_id est `on delete set null` : à la suppression de
-- l'utilisateur, la base exécute un UPDATE interne (author_id := NULL) que le
-- trigger d'immuabilité rejetait, ce qui bloquait toute suppression de compte
-- (« study_versions est immuable »). Seul ce cas est désormais toléré :
-- author_id passe de non-NULL à NULL, toutes les autres colonnes inchangées.
-- Toute autre modification reste interdite, quel que soit le rôle.
-- =====================================================================
create or replace function private.study_versions_forbid_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.author_id is not null
     and new.author_id is null
     and (to_jsonb(new) - 'author_id') = (to_jsonb(old) - 'author_id') then
    return new;
  end if;
  raise exception 'study_versions est immuable : créer une nouvelle version'
    using errcode = 'P0001';
end;
$$;
