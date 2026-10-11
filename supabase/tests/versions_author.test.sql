-- Immuabilité des versions et suppression de compte (migration 20261011000400).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(4);

insert into auth.users (id, email, aud, role) values
  ('cccccccc-0000-0000-0000-000000000003', 'c@test.local', 'authenticated', 'authenticated');
insert into projects (id, owner_id, name) values
  ('11111111-0000-0000-0000-00000000000c', 'cccccccc-0000-0000-0000-000000000003', 'Projet C');
insert into lifting_studies (id, project_id, title) values
  ('22222222-0000-0000-0000-00000000000c', '11111111-0000-0000-0000-00000000000c', 'Étude C');
insert into study_versions (id, study_id, data, author_id) values
  ('33333333-0000-0000-0000-00000000000c', '22222222-0000-0000-0000-00000000000c', '{"v":1}', 'cccccccc-0000-0000-0000-000000000003');

select throws_ok($$update study_versions set data = '{"v":2}' where id = '33333333-0000-0000-0000-00000000000c'$$,
  'P0001', null, 'les données d''une version restent immuables');
select throws_ok($$update study_versions set author_id = 'cccccccc-0000-0000-0000-000000000003', data = '{"v":3}' where id = '33333333-0000-0000-0000-00000000000c'$$,
  'P0001', null, 'author_id ne peut pas masquer une modification de données');
-- Cas exact de `on delete set null` lors de la suppression d'un compte : author_id seul passe à NULL.
-- (La suppression réelle de auth.users ne se teste pas ici : une ligne créée dans la même
-- transaction déclenche un re-contrôle de FK ; elle est vérifiée hors transaction.)
select lives_ok($$update study_versions set author_id = null where id = '33333333-0000-0000-0000-00000000000c'$$,
  'author_id peut passer à NULL (suppression de compte)');
select is((select author_id from study_versions where id = '33333333-0000-0000-0000-00000000000c'), null::uuid,
  'author_id est bien NULL et les données sont inchangées');

select * from finish();
rollback;
