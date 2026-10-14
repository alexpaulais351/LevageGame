-- Suivi de fréquentation (migration 20261014090000, D41).
-- X : approuvé · P : en attente · ADM : administrateur.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('e0000000-0000-0000-0000-0000000000b1', 'x@suivi.local', 'authenticated', 'authenticated', '{"full_name":"Xavier"}'),
  ('e0000000-0000-0000-0000-0000000000b2', 'p@suivi.local', 'authenticated', 'authenticated', '{"full_name":"Paul"}'),
  ('e0000000-0000-0000-0000-0000000000b3', 'adm@suivi.local', 'authenticated', 'authenticated', '{"full_name":"Admin"}');
insert into private.exemples_servis (user_id)
select id from auth.users where id::text like 'e0000000-0000-0000-0000-0000000000b_';
update profiles set statut = 'approuve' where id = 'e0000000-0000-0000-0000-0000000000b1';
select private.designer_admin('adm@suivi.local');

-- Accès direct au journal interdit (schéma private).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-0000000000b1', true);
select throws_ok($$select * from private.journal_visites$$, '42501', null, 'journal des visites illisible directement');

-- Compte approuvé : visites et connexion notées, identifiants regroupés.
select lives_ok($$select noter_visite('/projets/11111111-2222-3333-4444-555555555555?onglet=1')$$, 'visite notée');
select lives_ok($$select noter_visite('/projets/aaaaaaaa-2222-3333-4444-555555555555')$$, 'seconde visite de la même page');
select lives_ok($$select noter_visite('javascript:alert(1)')$$, 'chemin invalide ignoré sans erreur');
select lives_ok($$select noter_connexion()$$, 'connexion notée');
select throws_ok($$select admin_statistiques(30)$$, '42501', null, 'statistiques réservées à l''administrateur');

-- Compte en attente : rien n'est noté pour les pages.
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-0000000000b2', true);
select lives_ok($$select noter_visite('/projets')$$, 'compte en attente : appel sans effet');
select throws_ok($$select admin_statistiques(30)$$, '42501', null, 'compte en attente : statistiques refusées');

-- Anonyme : aucune exécution.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$select noter_visite('/')$$, '42501', null, 'anon : noter_visite non exécutable');

reset role;
select is((select vues from private.journal_visites where user_id = 'e0000000-0000-0000-0000-0000000000b1' and chemin = '/projets/:id'), 2,
  'chemin normalisé (/projets/:id) et compteur incrémenté');
select is((select count(*)::int from private.journal_visites where user_id = 'e0000000-0000-0000-0000-0000000000b1'), 1, 'chemin invalide non enregistré');
select is((select count(*)::int from private.journal_visites where user_id = 'e0000000-0000-0000-0000-0000000000b2'), 0, 'compte en attente : aucune page notée');

-- Administrateur : indicateurs.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-0000000000b3","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-0000000000b3', true);
select ok((select (admin_statistiques(7)->>'connexions')::int >= 1), 'administrateur : connexions comptées');
select is((select c->>'vues' from jsonb_array_elements(admin_statistiques(7)->'comptes') c where c->>'id' = 'e0000000-0000-0000-0000-0000000000b1'), '2',
  'administrateur : pages vues par compte');

select * from finish();
rollback;
