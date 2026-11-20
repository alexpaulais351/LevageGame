-- Catalogue en lecture seule (migration 20261120100000, D55) : plus de machines personnelles.
-- A : compte approuvé · une ancienne machine personnelle de A (créée en superutilisateur) reste lisible par A seul.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'a55@test.local', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-0000000000c2', 'b55@test.local', 'authenticated', 'authenticated');
insert into private.exemples_servis (user_id)
select id from auth.users where id in ('aaaaaaaa-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000c2');
update profiles set statut = 'approuve'
 where id in ('aaaaaaaa-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000c2');

-- Ancienne machine personnelle de A, avec configuration, source, abaque, nœud et photo.
insert into machines (id, type_id, manufacturer_id, model, owner_id) values
  ('44444444-0000-0000-0000-0000000000c1', (select id from machine_types where code = 'grue_mobile'),
   (select id from manufacturers where name = 'Tadano'), 'ANCIENNE-PERSO', 'aaaaaaaa-0000-0000-0000-0000000000c1');
insert into machine_configurations (id, machine_id, label) values
  ('55555555-0000-0000-0000-0000000000c1', '44444444-0000-0000-0000-0000000000c1', 'Config A');
insert into chart_sources (id, owner_id, document_title) values
  ('66666666-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-0000000000c1', 'Source A');
insert into load_charts (id, configuration_id, axis_y, source_id) values
  ('77777777-0000-0000-0000-0000000000c1', '55555555-0000-0000-0000-0000000000c1', 'none', '66666666-0000-0000-0000-0000000000c1');
insert into load_chart_points (chart_id, x, capacity_kg) values ('77777777-0000-0000-0000-0000000000c1', 3, 1000);
insert into attachments (id, owner_id, machine_id, kind, file_path) values
  ('88888888-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-0000000000c1', '44444444-0000-0000-0000-0000000000c1', 'photo', 'a/photo.jpg');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000c1', true);

select throws_ok($$insert into machines (type_id, manufacturer_id, model, owner_id) values
  ((select id from machine_types where code = 'grue_mobile'), (select id from manufacturers where name = 'Tadano'), 'NOUVELLE', 'aaaaaaaa-0000-0000-0000-0000000000c1')$$,
  '42501', null, 'A ne peut plus créer de machine personnelle');
select throws_ok($$update machines set model = 'RENOMMEE' where id = '44444444-0000-0000-0000-0000000000c1'$$,
  '42501', null, 'A ne peut plus modifier son ancienne machine');
select throws_ok($$delete from machines where id = '44444444-0000-0000-0000-0000000000c1'$$,
  '42501', null, 'A ne peut plus supprimer son ancienne machine');
select throws_ok($$insert into machine_configurations (machine_id, label) values ('44444444-0000-0000-0000-0000000000c1', 'Nouvelle')$$,
  '42501', null, 'A ne peut plus créer de configuration');
select throws_ok($$insert into chart_sources (owner_id, document_title) values ('aaaaaaaa-0000-0000-0000-0000000000c1', 'Doc')$$,
  '42501', null, 'A ne peut plus créer de source');
select throws_ok($$insert into load_charts (configuration_id, axis_y) values ('55555555-0000-0000-0000-0000000000c1', 'none')$$,
  '42501', null, 'A ne peut plus créer d''abaque');
select throws_ok($$insert into load_chart_points (chart_id, x, capacity_kg) values ('77777777-0000-0000-0000-0000000000c1', 4, 900)$$,
  '42501', null, 'A ne peut plus ajouter de nœud');
select throws_ok($$update load_charts set status = 'verifie' where id = '77777777-0000-0000-0000-0000000000c1'$$,
  '42501', null, 'A ne peut plus marquer un abaque vérifié');
select throws_ok($$insert into attachments (owner_id, machine_id, kind, file_path) values
  ('aaaaaaaa-0000-0000-0000-0000000000c1', '44444444-0000-0000-0000-0000000000c1', 'photo', 'a/autre.jpg')$$,
  '42501', null, 'A ne peut plus joindre de fichier à une machine');
select is((select count(*)::int from machines where id = '44444444-0000-0000-0000-0000000000c1')
        + (select count(*)::int from load_chart_points where chart_id = '77777777-0000-0000-0000-0000000000c1'), 2,
  'A lit toujours son ancienne machine et ses nœuds');

-- B ne voit rien de A.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-0000000000c2', true);
select is((select count(*)::int from machines where id = '44444444-0000-0000-0000-0000000000c1')
        + (select count(*)::int from attachments where machine_id = '44444444-0000-0000-0000-0000000000c1'), 0,
  'B ne voit ni la machine ni la photo de A');
reset role;

select is((select bool_or(has_table_privilege('authenticated', 'public.' || t, p))
           from unnest(array['machines', 'machine_configurations', 'load_charts', 'load_chart_points', 'chart_sources']) t,
                unnest(array['INSERT', 'UPDATE', 'DELETE']) p), false,
  'aucun droit d''écriture d''authenticated sur le catalogue');
-- Suppression du compte de A : tout part en cascade (contrainte source_id différée).
select lives_ok($$delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-0000000000c1'$$, 'suppression du compte de A');
select is((select count(*)::int from machines where id = '44444444-0000-0000-0000-0000000000c1')
        + (select count(*)::int from chart_sources where id = '66666666-0000-0000-0000-0000000000c1')
        + (select count(*)::int from attachments where id = '88888888-0000-0000-0000-0000000000c1'), 0,
  'machine, source et pièce jointe de A supprimées avec le compte');

select * from finish();
rollback;
