-- Validation des comptes par l'administrateur (migration 20261011000600, D25).
-- P : inscrit en attente · X : approuvé non admin · S : approuvé puis suspendu · ADM : administrateur.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(53);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('d0000000-0000-0000-0000-0000000000a1', 'attente@test.local', 'authenticated', 'authenticated', '{"full_name":"Paul Attente","entreprise":"BTP Test"}'),
  ('d0000000-0000-0000-0000-0000000000a2', 'approuve@test.local', 'authenticated', 'authenticated', '{"full_name":"Xavier"}'),
  ('d0000000-0000-0000-0000-0000000000a3', 'suspendu@test.local', 'authenticated', 'authenticated', '{"full_name":"Sam"}'),
  ('d0000000-0000-0000-0000-0000000000a4', 'Admin@Test.local', 'authenticated', 'authenticated', '{"full_name":"Admin"}'),
  ('d0000000-0000-0000-0000-0000000000a5', 'admin2@test.local', 'authenticated', 'authenticated', '{"full_name":"Admin 2"}');
-- Projets d'exemple (D30) hors sujet ici : comptes marqués « servis » (testés dans projets_exemples.test.sql).
insert into private.exemples_servis (user_id)
select id from auth.users where id::text like 'd0000000-0000-0000-0000-0000000000a_';

-- Machine publique fictive (données de test uniquement) et projets de chacun.
insert into machines (id, type_id, manufacturer_id, model, owner_id) values
  ('44444444-0000-0000-0000-0000000000d0',
   (select id from machine_types where code = 'grue_mobile'),
   (select id from manufacturers where name = 'Liebherr'), 'TESTADM-PUBLIC', null);
insert into projects (id, owner_id, name) values
  ('11111111-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-0000000000a1', 'Projet P'),
  ('11111111-0000-0000-0000-0000000000d2', 'd0000000-0000-0000-0000-0000000000a2', 'Projet X'),
  ('11111111-0000-0000-0000-0000000000d3', 'd0000000-0000-0000-0000-0000000000a3', 'Projet S');

-- ---------------------------------------------------------------------
-- Inscription et désignation de l'administrateur (rôle propriétaire)
-- ---------------------------------------------------------------------
select is((select statut::text from profiles where id = 'd0000000-0000-0000-0000-0000000000a1'), 'en_attente',
  'un nouvel inscrit est en attente');
select is((select est_admin from profiles where id = 'd0000000-0000-0000-0000-0000000000a1'), false, 'un nouvel inscrit n''est pas admin');
select is((select entreprise_declaree from profiles where id = 'd0000000-0000-0000-0000-0000000000a1'), 'BTP Test',
  'entreprise déclarée à l''inscription conservée');
update profiles set statut = 'approuve'
 where id in ('d0000000-0000-0000-0000-0000000000a2', 'd0000000-0000-0000-0000-0000000000a3');
select lives_ok($$select private.designer_admin('admin@test.local')$$, 'designer_admin (postgres) : e-mail insensible à la casse');
select lives_ok($$select private.designer_admin('admin2@test.local')$$, 'second administrateur désigné');
select results_eq($$select statut::text, est_admin from profiles where id = 'd0000000-0000-0000-0000-0000000000a4'$$,
  $$values ('approuve'::text, true)$$, 'l''administrateur désigné est approuvé et admin');
select throws_ok($$select private.designer_admin('inconnu@test.local')$$, 'P0002', null, 'designer_admin : compte inconnu refusé');
select is(has_function_privilege('authenticated', 'private.designer_admin(text)', 'execute'), false,
  'designer_admin non exécutable par authenticated');
select is(has_function_privilege('anon', 'public.admin_lister_comptes()', 'execute'), false,
  'RPC admin non exécutable par anon');

-- ---------------------------------------------------------------------
-- Anonyme : aucune lecture
-- ---------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$select count(*) from machines$$, '42501', null, 'anon : catalogue inaccessible');
select throws_ok($$select count(*) from machine_types$$, '42501', null, 'anon : référentiels inaccessibles');
select throws_ok($$select count(*) from profiles$$, '42501', null, 'anon : profils inaccessibles');
select throws_ok($$select * from admin_lister_comptes()$$, '42501', null, 'anon : RPC admin refusée');
reset role;

-- ---------------------------------------------------------------------
-- P : inscrit en attente — ne lit rien, ne peut pas s'auto-approuver
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-0000000000a1', true);

select results_eq($$select statut::text from profiles$$, $$values ('en_attente'::text)$$, 'P lit son propre profil (en attente)');
select is((select count(*)::int from machines), 0, 'P en attente : catalogue invisible');
select is((select count(*)::int from machine_types) + (select count(*)::int from manufacturers), 0, 'P en attente : référentiels invisibles');
select is((select count(*)::int from load_charts) + (select count(*)::int from load_chart_points) + (select count(*)::int from chart_sources), 0,
  'P en attente : abaques et sources invisibles');
select is((select count(*)::int from projects), 0, 'P en attente : son propre projet est invisible');
select is((select count(*)::int from user_settings), 0, 'P en attente : réglages invisibles');
select throws_ok($$insert into projects (owner_id, name) values ('d0000000-0000-0000-0000-0000000000a1', 'nouveau')$$,
  '42501', null, 'P en attente : création de projet refusée');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('user-files', 'd0000000-0000-0000-0000-0000000000a1/x.png')$$,
  '42501', null, 'P en attente : dépôt de fichier refusé');
-- Compte non approuvé : aucune ligne modifiable (politique restrictive) ; le trigger de garde
-- couvre les comptes approuvés (cf. X). Le statut inchangé est contrôlé par l'admin plus bas.
select is_empty($$update profiles set statut = 'approuve' where id = 'd0000000-0000-0000-0000-0000000000a1' returning id$$,
  'P ne peut pas s''auto-approuver');
select is_empty($$update profiles set est_admin = true where id = 'd0000000-0000-0000-0000-0000000000a1' returning id$$,
  'P ne peut pas se rendre admin');
select throws_ok($$insert into profiles (id, statut) values ('d0000000-0000-0000-0000-0000000000ff', 'approuve')$$,
  '42501', null, 'P ne peut pas créer de profil');
select throws_ok($$select * from admin_lister_comptes()$$, '42501', null, 'P : admin_lister_comptes refusée');
select throws_ok($$select admin_definir_statut('d0000000-0000-0000-0000-0000000000a1', 'approuve')$$,
  '42501', null, 'P : admin_definir_statut refusée');
select throws_ok($$select private.designer_admin('attente@test.local')$$, '42501', null, 'P : designer_admin refusée');

-- ---------------------------------------------------------------------
-- X : approuvé non admin — lit comme avant, ne touche pas à son statut
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-0000000000a2', true);

select results_eq($$select name from projects$$, $$values ('Projet X'::text)$$, 'X approuvé : voit son projet (et seulement le sien)');
select is((select count(*)::int from machines where id = '44444444-0000-0000-0000-0000000000d0'), 1, 'X approuvé : voit le catalogue public');
select ok((select count(*)::int from machine_types) > 0, 'X approuvé : voit les référentiels');
select lives_ok($$update profiles set full_name = 'Xavier B.' where id = 'd0000000-0000-0000-0000-0000000000a2'$$, 'X modifie son nom');
select throws_ok($$update profiles set est_admin = true where id = 'd0000000-0000-0000-0000-0000000000a2'$$,
  '42501', null, 'X approuvé ne peut pas se rendre admin');
select throws_ok($$update profiles set statut_modifie_le = now() where id = 'd0000000-0000-0000-0000-0000000000a2'$$,
  '42501', null, 'X ne peut pas falsifier l''horodatage de statut');
select throws_ok($$select * from admin_lister_comptes()$$, '42501', null, 'X non admin : admin_lister_comptes refusée');
select throws_ok($$select admin_definir_statut('d0000000-0000-0000-0000-0000000000a1', 'approuve')$$,
  '42501', null, 'X non admin : ne peut pas approuver P');

-- ---------------------------------------------------------------------
-- ADM : administrateur
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-0000000000a4', true);

select results_eq($$select email, nom, entreprise, statut::text from admin_lister_comptes() where id = 'd0000000-0000-0000-0000-0000000000a1'$$,
  $$values ('attente@test.local'::text, 'Paul Attente'::text, 'BTP Test'::text, 'en_attente'::text)$$,
  'admin liste les demandes (e-mail, nom, entreprise, statut) : P toujours en attente, non admin');
select is((select count(*)::int from projects), 0, 'admin : aucune lecture des projets des autres');
select lives_ok($$select admin_definir_statut('d0000000-0000-0000-0000-0000000000a1', 'approuve')$$, 'admin approuve P');
select results_eq($$select statut::text from admin_lister_comptes() where id = 'd0000000-0000-0000-0000-0000000000a1'$$,
  $$values ('approuve'::text)$$, 'P est approuvé');
select lives_ok($$select admin_definir_statut('d0000000-0000-0000-0000-0000000000a3', 'suspendu')$$, 'admin suspend S');
select throws_ok($$select admin_definir_statut('d0000000-0000-0000-0000-0000000000a4', 'suspendu')$$,
  '42501', null, 'admin ne peut pas modifier son propre compte');
select throws_ok($$select admin_definir_statut('d0000000-0000-0000-0000-0000000000a5', 'suspendu')$$,
  '42501', null, 'un compte administrateur ne se gère pas via la RPC');
select throws_ok($$select admin_definir_statut('d0000000-0000-0000-0000-0000000000a2', 'en_attente')$$,
  '22023', null, 'retour à en_attente refusé');
select throws_ok($$update profiles set statut = 'suspendu' where id = 'd0000000-0000-0000-0000-0000000000a4'$$,
  '42501', null, 'admin ne modifie pas son statut par UPDATE direct');

-- ---------------------------------------------------------------------
-- Effets : P approuvé lit ; S suspendu perd l'accès ; P refusé le perd aussi
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-0000000000a1', true);
select results_eq($$select name from projects$$, $$values ('Projet P'::text)$$, 'P approuvé : accède à son projet');
select is((select count(*)::int from machines where id = '44444444-0000-0000-0000-0000000000d0'), 1, 'P approuvé : accède au catalogue');

select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-0000000000a3', true);
select is((select count(*)::int from projects) + (select count(*)::int from machines), 0, 'S suspendu : plus aucun accès');
select throws_ok($$insert into projects (owner_id, name) values ('d0000000-0000-0000-0000-0000000000a3', 'x')$$,
  '42501', null, 'S suspendu : écriture refusée');

select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-0000000000a4', true);
select lives_ok($$select admin_definir_statut('d0000000-0000-0000-0000-0000000000a1', 'refuse')$$, 'admin refuse P');
select lives_ok($$select admin_definir_statut('d0000000-0000-0000-0000-0000000000a3', 'approuve')$$, 'admin réactive S');

select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-0000000000a1', true);
select is((select count(*)::int from projects), 0, 'P refusé : plus aucun accès');

select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-0000000000a3', true);
select results_eq($$select name from projects$$, $$values ('Projet S'::text)$$, 'S réactivé : accès rétabli');

reset role;
select results_eq($$select statut_modifie_par, statut_modifie_le is not null from profiles where id = 'd0000000-0000-0000-0000-0000000000a3'$$,
  $$values ('d0000000-0000-0000-0000-0000000000a4'::uuid, true)$$, 'auteur et horodatage de la décision enregistrés');

select * from finish();
rollback;
