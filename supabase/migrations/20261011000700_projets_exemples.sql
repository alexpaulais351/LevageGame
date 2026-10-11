-- =====================================================================
-- LevageGame — projets d'exemple offerts à chaque compte au moment de sa validation (D30).
--
-- Principe :
--  - les modèles (projet + études : data / result calculés par le moteur, marqueurs @@...@@ pour les
--    identifiants du catalogue et le nom du rédacteur) sont stockés dans private.modeles_exemples,
--    table non exposée, remplie par une migration GÉNÉRÉE (`npm run exemples:sql`, scripts/exemples) ;
--  - quand un compte passe à `approuve` (admin_definir_statut, designer_admin ou toute autre mise à jour
--    du statut), le trigger profiles_exemples_validation appelle private.creer_exemples(id) ;
--  - les exemples ne sont créés qu'UNE fois par compte (private.exemples_servis) : une re-validation
--    (suspendu → approuve) ne crée pas de doublon, même si l'utilisateur a supprimé ses exemples ;
--  - chaque modèle est créé tout entier ou sauté : configuration absente du catalogue public ou abaque
--    dont l'empreinte md5 diffère de celle des modèles (abaque modifié depuis la génération) ⇒ modèle sauté
--    (notice). Toute erreur est capturée : la validation d'un compte n'échoue JAMAIS à cause des exemples ;
--  - les projets créés appartiennent à l'utilisateur, sans aucune protection : modifiables et supprimables.
--
-- REPRISE DE L'EXISTANT : les comptes DÉJÀ approuvés au moment de la migration sont marqués « servis »
-- et ne reçoivent rien (l'administrateur dispose déjà de ses projets [EXEMPLE] créés à la main).
-- Pour en offrir à un compte existant (SQL, postgres / service_role) :
--   delete from private.exemples_servis where user_id = '<uuid>'; select private.creer_exemples('<uuid>');
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables (schéma private : aucun accès API)
-- ---------------------------------------------------------------------
create table private.modeles_exemples (
  ordre    integer primary key,
  nom      text not null check (length(btrim(nom)) > 0),
  adresse  text,
  client   text,
  -- [{ reference, titre, model, slug, md5, data, result: { a_verifier, verifie } }]
  etudes   jsonb not null check (jsonb_typeof(etudes) = 'array' and jsonb_array_length(etudes) > 0)
);

create table private.exemples_servis (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  crees_le  timestamptz not null default now()
);

revoke all on table private.modeles_exemples from public, anon, authenticated;
revoke all on table private.exemples_servis from public, anon, authenticated;

-- Comptes déjà approuvés : servis (cf. en-tête).
insert into private.exemples_servis (user_id)
select p.id from public.profiles p where p.statut = 'approuve'
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Empreinte d'un abaque (même formule que empreinteAbaque, scripts/exemples/modeles.ts)
-- ---------------------------------------------------------------------
create or replace function private.empreinte_abaque(chart_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select md5(
    concat_ws('|', coalesce(lc.standard, ''), coalesce(s.document_title, ''), coalesce(s.reference, ''),
              coalesce(s.edition, ''), coalesce(s.url, ''), lc.axis_y::text,
              lc.interpolation_allowed::text, lc.deductions_included::text)
    || '#' ||
    coalesce((select string_agg(round(p.x * 100)::bigint || ',' || round(p.y * 100)::bigint || ',' || round(p.capacity_kg * 10)::bigint,
                                ';' order by p.x, p.y)
              from public.load_chart_points p where p.chart_id = lc.id), ''))
  from public.load_charts lc
  left join public.chart_sources s on s.id = lc.source_id
  where lc.id = empreinte_abaque.chart_id;
$$;
revoke all on function private.empreinte_abaque(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Substitution des marqueurs dans un texte JSON
--    *_ID (uuid) : partout ; autres marqueurs : chaîne JSON entière, valeur échappée en JSON.
-- ---------------------------------------------------------------------
create or replace function private.exemples_substituer(texte text, valeurs jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  k text;
  t text := texte;
begin
  for k in select jsonb_object_keys(valeurs) loop
    if k like '%\_ID' then
      t := replace(t, '@@' || k || '@@', valeurs ->> k);
    else
      t := replace(t, '"@@' || k || '@@"', (valeurs -> k)::text);
    end if;
  end loop;
  if t ~ '@@[A-Z_]+@@' then
    raise exception 'marqueur non substitué : %', substring(t from '@@[A-Z_]+@@');
  end if;
  return t;
end;
$$;
revoke all on function private.exemples_substituer(text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Création des exemples d'un compte (une seule fois)
-- ---------------------------------------------------------------------
create or replace function private.creer_exemples(user_id uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_redacteur text;
  v_crees integer := 0;
  v_modele private.modeles_exemples%rowtype;
  v_etude jsonb;
  v_valeurs jsonb;
  v_resolus jsonb;
  v_complet boolean;
  v_result jsonb;
  v_projet uuid;
  v_study uuid;
  v_version uuid;
  r record;
  i integer;
begin
  begin
    if creer_exemples.user_id is null then
      return 0;
    end if;
    select coalesce(nullif(btrim(p.full_name), ''), 'Rédacteur')
      into v_redacteur
      from public.profiles p where p.id = creer_exemples.user_id;
    if not found then
      raise notice 'exemples : profil % introuvable', creer_exemples.user_id;
      return 0;
    end if;

    -- Une seule fois par compte (verrou implicite sur la clé en cas d'appels concurrents).
    insert into private.exemples_servis (user_id) values (creer_exemples.user_id)
    on conflict on constraint exemples_servis_pkey do nothing;
    if not found then
      return 0;
    end if;

    for v_modele in select * from private.modeles_exemples m order by m.ordre loop
      begin
        -- Résolution de toutes les études du modèle avant toute écriture.
        v_resolus := '[]'::jsonb;
        v_complet := true;
        for v_etude in select e.value from jsonb_array_elements(v_modele.etudes) e loop
          select jsonb_build_object(
                   'TYPE_ID', t.id, 'TYPE_LABEL', t.label,
                   'FABRICANT_ID', f.id, 'FABRICANT_NOM', f.name,
                   'MACHINE_ID', mc.id, 'MODELE', mc.model,
                   'CONFIG_ID', c.id, 'CONFIG_LABEL', c.label,
                   'ABAQUE_ID', lc.id, 'ABAQUE_STATUT', lc.status::text,
                   'REDACTEUR', v_redacteur) as valeurs,
                 private.empreinte_abaque(lc.id) as md5
            into r
            from public.machines mc
            join public.machine_types t on t.id = mc.type_id
            join public.manufacturers f on f.id = mc.manufacturer_id
            join public.machine_configurations c
              on c.machine_id = mc.id and c.params ->> 'slug' = v_etude ->> 'slug'
            -- même choix d'abaque que l'application (getChart : status desc, limit 1)
            join lateral (
              select l.id, l.status from public.load_charts l
              where l.configuration_id = c.id
              order by l.status desc, l.created_at
              limit 1
            ) lc on true
           where mc.owner_id is null
             and lower(mc.model) = lower(v_etude ->> 'model')
           order by mc.created_at
           limit 1;
          if not found then
            raise notice 'exemple « % » sauté : configuration % / % absente du catalogue public',
              v_modele.nom, v_etude ->> 'model', v_etude ->> 'slug';
            v_complet := false;
            exit;
          end if;
          if r.md5 is distinct from v_etude ->> 'md5' then
            raise notice 'exemple « % » sauté : abaque % / % modifié depuis la génération des modèles (npm run exemples:sql)',
              v_modele.nom, v_etude ->> 'model', v_etude ->> 'slug';
            v_complet := false;
            exit;
          end if;
          v_resolus := v_resolus || jsonb_build_array(r.valeurs);
        end loop;
        continue when not v_complet;

        insert into public.projects (owner_id, name, site_address, client, created_at, updated_at)
        values (creer_exemples.user_id, v_modele.nom, v_modele.adresse, v_modele.client, clock_timestamp(), clock_timestamp())
        returning id into v_projet;

        for i in 0 .. jsonb_array_length(v_modele.etudes) - 1 loop
          v_etude := v_modele.etudes -> i;
          v_valeurs := v_resolus -> i;
          v_result := v_etude -> 'result' -> (v_valeurs ->> 'ABAQUE_STATUT');
          if v_result is null then
            raise exception 'résultat absent pour le statut d''abaque %', v_valeurs ->> 'ABAQUE_STATUT';
          end if;

          insert into public.lifting_studies (project_id, reference, title, created_at, updated_at)
          values (v_projet, v_etude ->> 'reference', v_etude ->> 'titre', clock_timestamp(), clock_timestamp())
          returning id into v_study;

          insert into public.study_versions (study_id, index, data, result, author_id)
          values (
            v_study, 1,
            private.exemples_substituer((v_etude -> 'data')::text, v_valeurs)::jsonb,
            private.exemples_substituer(v_result::text, v_valeurs)::jsonb,
            creer_exemples.user_id)
          returning id into v_version;

          update public.lifting_studies set current_version_id = v_version where id = v_study;
        end loop;

        v_crees := v_crees + 1;
      exception when others then
        -- Le sous-bloc est annulé (projet partiel compris) ; on passe au modèle suivant.
        raise warning 'exemple « % » non créé : % (%)', v_modele.nom, sqlerrm, sqlstate;
      end;
    end loop;
    return v_crees;
  exception when others then
    raise warning 'exemples non créés pour % : % (%)', creer_exemples.user_id, sqlerrm, sqlstate;
    return 0;
  end;
end;
$$;
revoke all on function private.creer_exemples(uuid) from public, anon, authenticated;
grant execute on function private.creer_exemples(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 5. Déclenchement à la validation du compte
-- ---------------------------------------------------------------------
create or replace function private.profiles_exemples_validation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform private.creer_exemples(new.id);
  exception when others then
    raise warning 'exemples non créés pour % : %', new.id, sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.profiles_exemples_validation() from public, anon, authenticated;

create trigger profiles_exemples_validation
  after update of statut on public.profiles
  for each row
  when (old.statut is distinct from 'approuve' and new.statut = 'approuve')
  execute function private.profiles_exemples_validation();
