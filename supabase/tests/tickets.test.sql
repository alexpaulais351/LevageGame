-- Tickets : demandes des utilisateurs à l'administrateur (migration 20261120090000, D54).
-- X, Y : approuvés · P : en attente · ADM : administrateur.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(24);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('f0000000-0000-0000-0000-0000000000c1', 'x@tickets.local', 'authenticated', 'authenticated', '{"full_name":"Xavier"}'),
  ('f0000000-0000-0000-0000-0000000000c2', 'y@tickets.local', 'authenticated', 'authenticated', '{"full_name":"Yves"}'),
  ('f0000000-0000-0000-0000-0000000000c3', 'p@tickets.local', 'authenticated', 'authenticated', '{"full_name":"Paul"}'),
  ('f0000000-0000-0000-0000-0000000000c4', 'adm@tickets.local', 'authenticated', 'authenticated', '{"full_name":"Admin"}');
insert into private.exemples_servis (user_id)
select id from auth.users where id::text like 'f0000000-0000-0000-0000-0000000000c_';
update profiles set statut = 'approuve'
 where id in ('f0000000-0000-0000-0000-0000000000c1', 'f0000000-0000-0000-0000-0000000000c2');
select private.designer_admin('adm@tickets.local');

-- ---------------------------------------------------------------------
-- X (approuvé) : crée, lit les siens, ne traite pas
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-0000000000c1', true);

select lives_ok($$insert into tickets (id, titre, description, categorie, priorite)
  values ('a1000000-0000-0000-0000-000000000001', 'Export PDF', 'Ajouter le logo client', 'export', 'haute')$$,
  'X : création d''un ticket');
select lives_ok($$insert into tickets (id, titre, description) values ('a1000000-0000-0000-0000-000000000002', 'Abaque', 'Intégrer un abaque')$$,
  'X : second ticket');
select is((select auteur_id::text from tickets where id = 'a1000000-0000-0000-0000-000000000001'),
  'f0000000-0000-0000-0000-0000000000c1', 'auteur = compte courant par défaut');
select throws_ok($$insert into tickets (titre, description, statut) values ('Statut forcé', 'Tentative', 'resolu')$$,
  '42501', null, 'X : statut imposé à la création refusé');
select throws_ok($$insert into tickets (titre, description, reponse) values ('Réponse forcée', 'Tentative', 'ok')$$,
  '42501', null, 'X : réponse imposée à la création refusée');
select throws_ok($$insert into tickets (titre, description, auteur_id) values ('Pour Y', 'Usurpation', 'f0000000-0000-0000-0000-0000000000c2')$$,
  '42501', null, 'X : ticket au nom d''un autre refusé');
select throws_ok($$insert into tickets (titre, description, categorie) values ('Catégorie', 'Inconnue', 'piratage')$$,
  '23514', null, 'catégorie hors liste refusée');
select throws_ok($$update tickets set titre = 'Modifié' where id = 'a1000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'X : titre non modifiable');
update tickets set statut = 'resolu' where id = 'a1000000-0000-0000-0000-000000000001';
select is((select statut from tickets where id = 'a1000000-0000-0000-0000-000000000001'), 'nouveau',
  'X : ne peut pas traiter son propre ticket');
select is((select count(*)::int from lister_tickets()), 2, 'X : lister_tickets renvoie ses deux tickets');
select is((select auteur_nom from lister_tickets() where id = 'a1000000-0000-0000-0000-000000000001'), 'Xavier',
  'lister_tickets : nom de l''auteur');
reset role;

-- ---------------------------------------------------------------------
-- Y (approuvé) : ne voit ni ne supprime les tickets de X
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-0000000000c2', true);
select is((select count(*)::int from tickets), 0, 'Y : aucun ticket de X visible');
select is((select count(*)::int from lister_tickets()), 0, 'Y : lister_tickets vide');
delete from tickets where id = 'a1000000-0000-0000-0000-000000000002';
reset role;
select is((select count(*)::int from tickets where id = 'a1000000-0000-0000-0000-000000000002'), 1,
  'Y : suppression du ticket de X sans effet');

-- ---------------------------------------------------------------------
-- P (en attente) : aucun accès
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-0000000000c3', true);
select throws_ok($$insert into tickets (titre, description) values ('En attente', 'Tentative')$$,
  '42501', null, 'P : création refusée (compte non approuvé)');
select throws_ok($$select * from lister_tickets()$$, '42501', null, 'P : lister_tickets refusé');
reset role;

-- ---------------------------------------------------------------------
-- ADM : voit tout, traite, supprime
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-0000000000c4","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-0000000000c4', true);
select is((select count(*)::int from tickets), 2, 'ADM : voit tous les tickets');
select is((select auteur_email from lister_tickets() where id = 'a1000000-0000-0000-0000-000000000001'), 'x@tickets.local',
  'ADM : e-mail de l''auteur');
select lives_ok($$update tickets set statut = 'en_cours', priorite = 'normale', reponse = 'Pris en charge'
  where id = 'a1000000-0000-0000-0000-000000000001'$$, 'ADM : traitement du ticket');
select results_eq($$select statut, reponse from tickets where id = 'a1000000-0000-0000-0000-000000000001'$$,
  $$values ('en_cours'::text, 'Pris en charge'::text)$$, 'ADM : statut et réponse enregistrés');
select throws_ok($$update tickets set description = 'Réécrite' where id = 'a1000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'ADM : description non modifiable');
reset role;

-- X ne peut plus supprimer un ticket pris en charge, mais supprime un ticket « nouveau ».
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-0000000000c1', true);
delete from tickets where id = 'a1000000-0000-0000-0000-000000000001';
delete from tickets where id = 'a1000000-0000-0000-0000-000000000002';
reset role;
select is((select count(*)::int from tickets where id = 'a1000000-0000-0000-0000-000000000001'), 1,
  'X : ticket pris en charge non supprimable');
select is((select count(*)::int from tickets where id = 'a1000000-0000-0000-0000-000000000002'), 0,
  'X : ticket « nouveau » supprimé');

-- Anonyme : aucun accès
set local role anon;
select throws_ok($$select count(*) from tickets$$, '42501', null, 'anon : tickets inaccessibles');
reset role;

select * from finish();
rollback;
