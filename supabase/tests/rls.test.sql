-- =====================================================================
-- Tests RLS (pgTAP) — exécutés par `supabase test db` ou via psql.
-- Deux utilisateurs (A, B) + anon. Tout se passe dans une transaction
-- annulée à la fin : la base n'est pas modifiée.
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(46);

-- Isole les tests du catalogue réel chargé par seed/charts.sql : on retire (dans la transaction,
-- annulée en fin de test) les machines publiques et leurs sources, pour raisonner sur un catalogue maîtrisé.
delete from machines where owner_id is null;
delete from chart_sources where owner_id is null;

-- ---------------------------------------------------------------------
-- Jeu de données (rôle propriétaire, RLS non appliquée)
-- ---------------------------------------------------------------------
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local', 'authenticated', 'authenticated', '{"full_name":"Alice"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local', 'authenticated', 'authenticated', '{"full_name":"Bruno"}');
-- Comptes validés explicitement par l'administrateur (sinon aucun accès, cf. comptes_admin.test.sql).
update profiles set statut = 'approuve'
 where id in ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002');

insert into projects (id, owner_id, name) values
  ('11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'Projet A'),
  ('11111111-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002', 'Projet B');
insert into lifting_studies (id, project_id, title) values
  ('22222222-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-00000000000a', 'Étude A'),
  ('22222222-0000-0000-0000-00000000000b', '11111111-0000-0000-0000-00000000000b', 'Étude B');
insert into study_versions (id, study_id, data, author_id) values
  ('33333333-0000-0000-0000-00000000000a', '22222222-0000-0000-0000-00000000000a', '{"v":1}', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-00000000000b', '22222222-0000-0000-0000-00000000000b', '{"v":1}', 'bbbbbbbb-0000-0000-0000-000000000002');

-- Machine publique fictive (données de test uniquement, jamais en seed).
insert into machines (id, type_id, manufacturer_id, model, owner_id) values
  ('44444444-0000-0000-0000-000000000000',
   (select id from machine_types where code = 'grue_mobile'),
   (select id from manufacturers where name = 'Liebherr'), 'TEST-PUBLIC', null),
  ('44444444-0000-0000-0000-00000000000a',
   (select id from machine_types where code = 'grue_mobile'),
   (select id from manufacturers where name = 'Tadano'), 'TEST-PRIVEE-A', 'aaaaaaaa-0000-0000-0000-000000000001');
insert into machine_configurations (id, machine_id, label) values
  ('55555555-0000-0000-0000-000000000000', '44444444-0000-0000-0000-000000000000', 'Config publique'),
  ('55555555-0000-0000-0000-00000000000a', '44444444-0000-0000-0000-00000000000a', 'Config A');
insert into chart_sources (id, owner_id, document_title) values
  ('66666666-0000-0000-0000-000000000000', null, 'Source publique'),
  ('66666666-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'Source A');
insert into load_charts (id, configuration_id, axis_y, source_id) values
  ('77777777-0000-0000-0000-000000000000', '55555555-0000-0000-0000-000000000000', 'none', '66666666-0000-0000-0000-000000000000'),
  ('77777777-0000-0000-0000-00000000000a', '55555555-0000-0000-0000-00000000000a', 'boom_length_m', '66666666-0000-0000-0000-00000000000a');
insert into load_chart_points (chart_id, x, capacity_kg) values
  ('77777777-0000-0000-0000-000000000000', 3, 1000),
  ('77777777-0000-0000-0000-00000000000a', 3, 2000);

-- ---------------------------------------------------------------------
-- Contraintes et triggers de schéma
-- ---------------------------------------------------------------------
select is((select count(*)::int from profiles where id in ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002')),
  2, 'profils créés par le trigger d''inscription');
select is((select threshold_green from user_settings where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  90.00::numeric, 'réglages par défaut créés (90 %)');
select is((select index from study_versions where id = '33333333-0000-0000-0000-00000000000a'),
  1, 'index de version attribué automatiquement');
select is((select count(*)::int from machine_types), 10, 'seed : 10 types de machines');
select is((select count(*)::int from machines where owner_id is null and model <> 'TEST-PUBLIC'), 0, 'catalogue public isolé : aucune machine hors test');
select is((select count(*)::int from load_chart_points p join load_charts c on c.id = p.chart_id
           join machine_configurations mc on mc.id = c.configuration_id join machines m on m.id = mc.machine_id
           where m.model not like 'TEST-%'), 0, 'catalogue public isolé : aucune valeur hors test');
select throws_ok($$update study_versions set data = '{"v":2}' where id = '33333333-0000-0000-0000-00000000000a'$$,
  'P0001', null, 'versions immuables même pour le propriétaire de la base');
select throws_ok($$insert into load_chart_points (chart_id, x, y, capacity_kg) values ('77777777-0000-0000-0000-000000000000', 4, 10, 900)$$,
  '23514', null, 'y doit valoir 0 quand axis_y = none');
select throws_ok($$insert into load_chart_points (chart_id, x, capacity_kg) values ('77777777-0000-0000-0000-000000000000', -1, 900)$$,
  '23514', null, 'portée négative refusée');
select throws_ok($$insert into load_chart_points (chart_id, x, capacity_kg) values ('77777777-0000-0000-0000-000000000000', 5, -1)$$,
  '23514', null, 'capacité négative refusée');
select throws_ok($$update user_settings set threshold_green = 90, threshold_orange = 80 where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '23514', null, 'seuils : vert < orange imposé');
select throws_ok($$update lifting_studies set current_version_id = '33333333-0000-0000-0000-00000000000b' where id = '22222222-0000-0000-0000-00000000000a'$$,
  '23503', null, 'version courante d''une autre étude refusée');

-- ---------------------------------------------------------------------
-- Utilisateur A
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

select results_eq($$select name from projects$$, $$values ('Projet A'::text)$$, 'A ne voit que son projet');
select is((select count(*)::int from lifting_studies), 1, 'A ne voit que son étude');
select is((select count(*)::int from study_versions), 1, 'A ne voit que ses versions');
select is((select count(*)::int from profiles), 1, 'A ne voit que son profil');
select throws_ok($$insert into lifting_studies (project_id, title) values ('11111111-0000-0000-0000-00000000000b', 'intrus')$$,
  '42501', null, 'A ne peut pas créer d''étude dans le projet de B');
select throws_ok($$insert into study_versions (study_id, data, author_id) values ('22222222-0000-0000-0000-00000000000b', '{}', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  '42501', null, 'A ne peut pas versionner l''étude de B');
select lives_ok($$insert into study_versions (study_id, data, author_id) values ('22222222-0000-0000-0000-00000000000a', '{"v":2}', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'A crée une nouvelle version de son étude');
select throws_ok($$update study_versions set data = '{}' where study_id = '22222222-0000-0000-0000-00000000000a'$$,
  '42501', null, 'A ne peut pas modifier ses versions');
select throws_ok($$delete from study_versions where study_id = '22222222-0000-0000-0000-00000000000a'$$,
  '42501', null, 'A ne peut pas supprimer ses versions');

-- Catalogue
select is((select count(*)::int from machines), 2, 'A voit le public + sa machine');
select is((select count(*)::int from chart_sources), 2, 'A voit la source publique et la sienne');
select is_empty($$update machines set model = 'pirate' where id = '44444444-0000-0000-0000-000000000000' returning id$$,
  'A ne peut pas modifier une machine publique');
select is_empty($$update load_charts set status = 'verifie' where id = '77777777-0000-0000-0000-000000000000' returning id$$,
  'A ne peut pas passer un abaque public en vérifié');
select is_empty($$delete from load_chart_points where chart_id = '77777777-0000-0000-0000-000000000000' returning chart_id$$,
  'A ne peut pas supprimer des points publics');
select throws_ok($$insert into machine_configurations (machine_id, label) values ('44444444-0000-0000-0000-000000000000', 'ajout')$$,
  '42501', null, 'A ne peut pas ajouter de configuration à une machine publique');
select throws_ok($$update machines set owner_id = null where id = '44444444-0000-0000-0000-00000000000a'$$,
  '42501', null, 'A ne peut pas publier sa machine (owner_id NULL)');
select throws_ok($$insert into machines (type_id, manufacturer_id, model, owner_id) values ((select id from machine_types limit 1), (select id from manufacturers limit 1), 'X', null)$$,
  '42501', null, 'A ne peut pas créer de machine publique');
select throws_ok($$update machine_configurations set machine_id = '44444444-0000-0000-0000-000000000000' where id = '55555555-0000-0000-0000-00000000000a'$$,
  '42501', null, 'A ne peut pas rattacher sa configuration à une machine publique');
select throws_ok($$insert into machine_types (code, label, family) values ('x', 'x', 'x')$$,
  '42501', null, 'A ne peut pas modifier les types de machines');
select lives_ok($$update load_charts set status = 'verifie' where id = '77777777-0000-0000-0000-00000000000a'$$,
  'A peut vérifier son propre abaque');
select is((select verified_by from load_charts where id = '77777777-0000-0000-0000-00000000000a'),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'vérificateur forcé à l''utilisateur courant');

-- Storage
select lives_ok($$insert into storage.objects (bucket_id, name) values ('user-files', 'aaaaaaaa-0000-0000-0000-000000000001/logo.png')$$,
  'A dépose dans son dossier user-files');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('user-files', 'bbbbbbbb-0000-0000-0000-000000000002/x.png')$$,
  '42501', null, 'A ne peut pas déposer dans le dossier de B');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('chart-sources', 'x.pdf')$$,
  '42501', null, 'A ne peut pas écrire dans chart-sources');

-- ---------------------------------------------------------------------
-- Utilisateur B
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);

select results_eq($$select name from projects$$, $$values ('Projet B'::text)$$, 'B ne voit que son projet');
select is((select count(*)::int from machines where id = '44444444-0000-0000-0000-00000000000a'), 0, 'B ne voit pas la machine privée de A');
select is((select count(*)::int from load_chart_points where chart_id = '77777777-0000-0000-0000-00000000000a'), 0, 'B ne voit pas les points privés de A');
select is((select count(*)::int from chart_sources where id = '66666666-0000-0000-0000-00000000000a'), 0, 'B ne voit pas la source privée de A');
select is_empty($$update projects set name = 'pirate' where id = '11111111-0000-0000-0000-00000000000a' returning id$$,
  'B ne peut pas modifier le projet de A');
select is((select count(*)::int from storage.objects where bucket_id = 'user-files'), 0, 'B ne voit pas les fichiers de A');

-- ---------------------------------------------------------------------
-- Anonyme : plus aucun accès (mode invité supprimé, D25)
-- ---------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);

select throws_ok($$select count(*) from machines$$, '42501', null, 'anon ne lit plus le catalogue public');
select throws_ok($$select count(*) from load_chart_points$$, '42501', null, 'anon ne lit plus les points d''abaque');
select throws_ok($$select count(*) from projects$$, '42501', null, 'anon n''a pas accès aux projets');
select throws_ok($$insert into machines (type_id, manufacturer_id, model) values ((select id from machine_types limit 1), (select id from manufacturers limit 1), 'X')$$,
  '42501', null, 'anon ne peut pas écrire dans le catalogue');

select * from finish();
rollback;
