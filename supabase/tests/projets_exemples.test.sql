-- Projets d'exemple créés à la validation d'un compte (migrations 20261011000700/0800/0900, D30).
-- Nécessite le catalogue public (seed charts.sql). U1 : validé par l'admin · U2 : validé après modification
-- d'un abaque · ADM : désigné par designer_admin.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(31);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('e0000000-0000-0000-0000-0000000000b1', 'u1@test.local', 'authenticated', 'authenticated', '{"full_name":"Ulysse O''Test"}'),
  ('e0000000-0000-0000-0000-0000000000b2', 'u2@test.local', 'authenticated', 'authenticated', '{}'),
  ('e0000000-0000-0000-0000-0000000000b9', 'adm@test.local', 'authenticated', 'authenticated', '{"full_name":"Admin"}');

select is((select count(*)::int from private.modeles_exemples_v2), 2, 'deux modèles de projet (v2)');
select is((select count(*)::int from projects where owner_id = 'e0000000-0000-0000-0000-0000000000b1'), 0,
  'compte en attente : aucun exemple');

-- Privilèges : rien d'exposé
select is(has_function_privilege('authenticated', 'private.creer_exemples(uuid)', 'execute'), false,
  'creer_exemples non exécutable par authenticated');
select is(has_function_privilege('anon', 'private.creer_exemples(uuid)', 'execute'), false,
  'creer_exemples non exécutable par anon');
select is(has_table_privilege('authenticated', 'private.modeles_exemples_v2', 'select'), false,
  'modeles_exemples_v2 non lisible par authenticated');

-- ---------------------------------------------------------------------
-- designer_admin ⇒ exemples
-- ---------------------------------------------------------------------
select lives_ok($$select private.designer_admin('adm@test.local')$$, 'designer_admin');
select is((select count(*)::int from projects where owner_id = 'e0000000-0000-0000-0000-0000000000b9'), 2,
  'designer_admin : 2 projets d''exemple');

-- ---------------------------------------------------------------------
-- Validation par l'administrateur (admin_definir_statut)
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-0000000000b9","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-0000000000b9', true);
select lives_ok($$select admin_definir_statut('e0000000-0000-0000-0000-0000000000b1', 'approuve')$$, 'validation de U1');
reset role;

select results_eq(
  $$select p.name from projects p where p.owner_id = 'e0000000-0000-0000-0000-0000000000b1' order by p.created_at$$,
  $$values ('[EXEMPLE] Réhabilitation bureaux Lyon 3e – Les Acacias'),
           ('[EXEMPLE] Renouvellement réseau assainissement DN800 – rue des Vignes-Fictives')$$,
  'U1 : 2 projets d''exemple');
select is((select count(*)::int from lifting_studies s join projects p on p.id = s.project_id
            where p.owner_id = 'e0000000-0000-0000-0000-0000000000b1'), 3, 'U1 : 3 études');
select is((select count(*)::int from lifting_studies s join projects p on p.id = s.project_id
            join study_versions v on v.id = s.current_version_id and v.study_id = s.id
            where p.owner_id = 'e0000000-0000-0000-0000-0000000000b1' and v.index = 1
              and v.author_id = 'e0000000-0000-0000-0000-0000000000b1'), 3,
  'U1 : chaque étude a une version A courante dont U1 est l''auteur');
select results_eq(
  $$select left(p.name, 20), s.reference, s.title, v.result -> 'verdict' -> 'value' ->> 'verdict'
      from projects p join lifting_studies s on s.project_id = p.id join study_versions v on v.id = s.current_version_id
     where p.owner_id = 'e0000000-0000-0000-0000-0000000000b1' order by p.created_at, s.reference$$,
  $$values ('[EXEMPLE] Réhabilita', 'ADQ-001', 'Levage d''une CTA en toiture-terrasse', 'ADEQUAT'),
           ('[EXEMPLE] Réhabilita', 'ADQ-002', 'Dépose du groupe froid existant (toiture vers camion)', 'ADEQUAT_AVEC_RESERVES'),
           ('[EXEMPLE] Renouvelle', 'ADQ-001', 'Pose de tuyaux béton DN800 à la pelle en levage', 'ADEQUAT')$$,
  'U1 : références, titres et verdicts stockés attendus');
select is((select count(*)::int from study_versions v join lifting_studies s on s.id = v.study_id join projects p on p.id = s.project_id
            where p.owner_id = 'e0000000-0000-0000-0000-0000000000b1' and (v.data::text like '%@@%' or v.result::text like '%@@%')), 0,
  'aucun marqueur résiduel dans data / result');
select is((select count(*)::int from study_versions v join lifting_studies s on s.id = v.study_id join projects p on p.id = s.project_id
            where p.owner_id = 'e0000000-0000-0000-0000-0000000000b1'
              and v.data -> 'operation' ->> 'redacteur' = 'Ulysse O''Test'), 3, 'rédacteur = nom du compte');
select is((select count(*)::int from study_versions v join lifting_studies s on s.id = v.study_id join projects p on p.id = s.project_id
            join load_charts lc on lc.id = (v.data -> 'machine' -> 'selection' -> 'chart' ->> 'id')::uuid
            join machine_configurations c on c.id = lc.configuration_id
              and c.id = (v.data -> 'machine' -> 'selection' ->> 'configurationId')::uuid
            join machines m on m.id = c.machine_id and m.id = (v.data -> 'machine' -> 'selection' ->> 'machineId')::uuid
              and m.model = v.data -> 'machine' -> 'selection' ->> 'model'
            where p.owner_id = 'e0000000-0000-0000-0000-0000000000b1'
              and v.data -> 'machine' -> 'selection' -> 'chart' ->> 'status' = lc.status::text
              and v.result::text like '%Abaque ' || lc.id || '%'), 3,
  'identifiants machine / configuration / abaque et statut résolus depuis le catalogue');
select ok(exists (select 1 from private.exemples_servis where user_id = 'e0000000-0000-0000-0000-0000000000b1'), 'U1 marqué servi');

-- ---------------------------------------------------------------------
-- Re-validation (suspendu → approuve) : pas de doublon
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-0000000000b9","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-0000000000b9', true);
select lives_ok($$select admin_definir_statut('e0000000-0000-0000-0000-0000000000b1', 'suspendu')$$, 'U1 suspendu');
select lives_ok($$select admin_definir_statut('e0000000-0000-0000-0000-0000000000b1', 'approuve')$$, 'U1 re-validé');
reset role;
select is((select count(*)::int from projects where owner_id = 'e0000000-0000-0000-0000-0000000000b1'), 2,
  're-validation : pas de doublon');
select is(private.creer_exemples('e0000000-0000-0000-0000-0000000000b1'), 0, 'appel direct répété : rien créé');

-- ---------------------------------------------------------------------
-- Abaque modifié depuis la génération ⇒ modèle sauté, validation réussie
-- ---------------------------------------------------------------------
update load_chart_points set capacity_kg = capacity_kg + 1
 where chart_id = (select lc.id from load_charts lc join machine_configurations c on c.id = lc.configuration_id
                    where c.params ->> 'slug' = 'hd-reach-5-7-r2-9-cw5-4t-600-triple-side' limit 1)
   and x = (select min(x) from load_chart_points p join load_charts lc on lc.id = p.chart_id join machine_configurations c on c.id = lc.configuration_id
             where c.params ->> 'slug' = 'hd-reach-5-7-r2-9-cw5-4t-600-triple-side');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-0000000000b9","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-0000000000b9', true);
select lives_ok($$select admin_definir_statut('e0000000-0000-0000-0000-0000000000b2', 'approuve')$$, 'validation de U2 malgré l''abaque modifié');
reset role;
select is((select statut::text from profiles where id = 'e0000000-0000-0000-0000-0000000000b2'), 'approuve', 'U2 approuvé');
select results_eq($$select name from projects where owner_id = 'e0000000-0000-0000-0000-0000000000b2'$$,
  $$values ('[EXEMPLE] Réhabilitation bureaux Lyon 3e – Les Acacias')$$, 'U2 : modèle à l''abaque modifié sauté, l''autre créé');
select is((select v.data -> 'operation' ->> 'redacteur' from study_versions v join lifting_studies s on s.id = v.study_id
            join projects p on p.id = s.project_id where p.owner_id = 'e0000000-0000-0000-0000-0000000000b2' limit 1),
  'Rédacteur', 'sans nom de compte : rédacteur « Rédacteur »');

-- ---------------------------------------------------------------------
-- U1 : ne voit que ses exemples et peut les supprimer
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-0000000000b1', true);
select is((select count(*)::int from projects), 2, 'U1 ne voit que ses 2 projets');
select is((select count(*)::int from lifting_studies), 3, 'U1 ne voit que ses 3 études');
select is((select count(*)::int from study_versions), 3, 'U1 lit ses 3 versions');
select lives_ok($$update lifting_studies set title = 'Renommée' where reference = 'ADQ-002'$$, 'U1 peut modifier une étude d''exemple');
select lives_ok($$delete from projects$$, 'U1 supprime ses projets d''exemple');
select is((select count(*)::int from projects), 0, 'U1 : plus aucun projet');
reset role;
select is((select count(*)::int from projects where owner_id in ('e0000000-0000-0000-0000-0000000000b9', 'e0000000-0000-0000-0000-0000000000b2')), 3,
  'les exemples des autres comptes sont intacts');

select * from finish();
rollback;
