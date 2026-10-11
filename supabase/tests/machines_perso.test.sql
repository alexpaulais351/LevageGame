-- Machines personnelles (étape 8) : flux complet de l'utilisateur A sous RLS, étanchéité vis-à-vis de B,
-- catalogue public intouchable, vérification posée par le trigger load_charts_guard.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(19);

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'a8@test.local', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-0000000000b2', 'b8@test.local', 'authenticated', 'authenticated');
-- Comptes validés explicitement par l'administrateur (sinon aucun accès, cf. comptes_admin.test.sql).
update profiles set statut = 'approuve'
 where id in ('aaaaaaaa-0000-0000-0000-0000000000a1', 'bbbbbbbb-0000-0000-0000-0000000000b2');
insert into machines (id, type_id, manufacturer_id, model, owner_id) values
  ('44444444-0000-0000-0000-0000000000f0',
   (select id from machine_types where code = 'grue_mobile'),
   (select id from manufacturers where name = 'Liebherr'), 'TEST8-PUBLIC', null);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000a1', true);

-- Création : machine + configuration + source (PDF) + abaque + nœuds + pièces jointes
select lives_ok($$insert into machines (id, type_id, manufacturer_id, model, owner_id, specs) values
  ('44444444-0000-0000-0000-0000000000a1', (select id from machine_types where code = 'grue_mobile'),
   (select id from manufacturers where name = 'Tadano'), 'PERSO8', 'aaaaaaaa-0000-0000-0000-0000000000a1',
   '{"masse_kg": 1200, "calage": {"longueurM": 3.4, "largeurM": 3.8}}')$$, 'A crée sa machine personnelle avec specs');
select lives_ok($$insert into machine_configurations (id, machine_id, label, params, hook_block_mass_kg) values
  ('55555555-0000-0000-0000-0000000000a1', '44444444-0000-0000-0000-0000000000a1', 'Flèche 20 m',
   '{"Flèche": "20 m", "Calage": "100 %"}', 250)$$, 'A crée une configuration avec paramètres libres');
select lives_ok($$insert into attachments (id, owner_id, machine_id, kind, file_path, mime) values
  ('88888888-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-0000000000a1', '44444444-0000-0000-0000-0000000000a1', 'pdf_constructeur',
   'aaaaaaaa-0000-0000-0000-0000000000a1/machines/44444444-0000-0000-0000-0000000000a1/source.pdf', 'application/pdf'),
  ('88888888-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-0000000000a1', '44444444-0000-0000-0000-0000000000a1', 'photo',
   'aaaaaaaa-0000-0000-0000-0000000000a1/machines/44444444-0000-0000-0000-0000000000a1/photo.jpg', 'image/jpeg')$$,
  'A joint PDF constructeur et photo à sa machine');
select lives_ok($$insert into chart_sources (id, owner_id, document_title, file_path) values
  ('66666666-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Document FICTIF',
   'aaaaaaaa-0000-0000-0000-0000000000a1/machines/44444444-0000-0000-0000-0000000000a1/source.pdf')$$, 'A crée sa source avec PDF');
select lives_ok($$insert into load_charts (id, configuration_id, axis_y, status, source_id) values
  ('77777777-0000-0000-0000-0000000000a1', '55555555-0000-0000-0000-0000000000a1', 'boom_length_m', 'a_verifier', '66666666-0000-0000-0000-0000000000a1')$$,
  'A crée son abaque (a_verifier)');
select lives_ok($$insert into load_chart_points (chart_id, x, y, capacity_kg) values
  ('77777777-0000-0000-0000-0000000000a1', 3, 20, 1500.5), ('77777777-0000-0000-0000-0000000000a1', 4, 20, 1200)$$, 'A insère les nœuds de son abaque');
select is((select verified_by from load_charts where id = '77777777-0000-0000-0000-0000000000a1'), null::uuid, 'abaque neuf : pas de vérificateur');

-- Vérification : verified_by / verified_at posés par le trigger, pas par le client
select lives_ok($$update load_charts set status = 'verifie', verified_by = 'bbbbbbbb-0000-0000-0000-0000000000b2' where id = '77777777-0000-0000-0000-0000000000a1'$$,
  'A marque son abaque vérifié');
select is((select verified_by from load_charts where id = '77777777-0000-0000-0000-0000000000a1'),
  'aaaaaaaa-0000-0000-0000-0000000000a1'::uuid, 'verified_by forcé à A (valeur client ignorée)');
select isnt((select verified_at from load_charts where id = '77777777-0000-0000-0000-0000000000a1'), null::timestamptz, 'verified_at posé par le trigger');

-- Garde-fous : pièce jointe vers la machine publique, catalogue public
select throws_ok($$insert into attachments (owner_id, machine_id, kind, file_path) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', '44444444-0000-0000-0000-0000000000f0', 'photo', 'aaaaaaaa-0000-0000-0000-0000000000a1/x.jpg')$$,
  '42501', null, 'A ne peut pas joindre un fichier à une machine publique');
select is_empty($$update machines set model = 'pirate' where id = '44444444-0000-0000-0000-0000000000f0' returning id$$, 'A ne modifie pas le catalogue public');

-- Étanchéité vis-à-vis de B
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-0000000000b2', true);
select is((select count(*)::int from machines where id = '44444444-0000-0000-0000-0000000000a1')
        + (select count(*)::int from attachments where machine_id = '44444444-0000-0000-0000-0000000000a1')
        + (select count(*)::int from load_chart_points where chart_id = '77777777-0000-0000-0000-0000000000a1'), 0,
  'B ne voit ni la machine, ni les pièces jointes, ni les nœuds de A');
select throws_ok($$insert into load_chart_points (chart_id, x, y, capacity_kg) values ('77777777-0000-0000-0000-0000000000a1', 9, 20, 1)$$,
  '42501', null, 'B ne peut pas ajouter de nœud à l''abaque de A');

-- Retour à A
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000a1', true);
-- Suppression : une source encore référencée reste protégée (contrôle différé, rendu immédiat ici) ;
-- machine puis source supprimées dans la même transaction (cascade de suppression de compte) : accepté.
set constraints load_charts_source_id_fkey immediate;
select throws_ok($$delete from chart_sources where id = '66666666-0000-0000-0000-0000000000a1'$$,
  '23503', null, 'une source encore référencée par un abaque ne peut pas être supprimée');
set constraints load_charts_source_id_fkey deferred;
-- Un abaque sans configuration est refusé (la RLS s'applique avant la clé étrangère).
select throws_ok($$insert into load_charts (configuration_id, axis_y) values ('55555555-0000-0000-0000-0000000000ff', 'none')$$,
  '42501', null, 'un abaque ne peut pas être créé pour une configuration inexistante');
select is((select confdeltype::text from pg_constraint where conname = 'load_charts_source_id_fkey'), 'a',
  'source_id : NO ACTION différé (suppression de compte)');
select lives_ok($$delete from chart_sources where id = '66666666-0000-0000-0000-0000000000a1'; delete from machines where id = '44444444-0000-0000-0000-0000000000a1'$$,
  'source puis machine supprimées ensemble : la contrainte différée est satisfaite après les cascades');
select is((select count(*)::int from load_charts where id = '77777777-0000-0000-0000-0000000000a1')
        + (select count(*)::int from load_chart_points where chart_id = '77777777-0000-0000-0000-0000000000a1')
        + (select count(*)::int from attachments where machine_id = '44444444-0000-0000-0000-0000000000a1'), 0,
  'configurations, abaque, nœuds et pièces jointes supprimés avec la machine');

select * from finish();
rollback;
