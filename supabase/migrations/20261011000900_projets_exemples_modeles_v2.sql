-- =====================================================================
-- LevageGame — modèles des projets d'exemple : table v2 (D30).
--
-- Le contenu de private.modeles_exemples en PRODUCTION a été corrompu (recopie manuelle de la
-- migration 0800). Les suppressions de données n'étant pas applicables en production par l'outillage
-- disponible, la table est REMPLACÉE :
--  - private.modeles_exemples_v2 : mêmes colonnes, contraintes et droits ; seule table lue désormais
--    par private.creer_exemples (redéfinie à l'identique, hormis la table lue) ;
--  - private.modeles_import : morceaux (≤ 3 Ko) des lignes sérialisées en JSON, chargés en production
--    avec contrôle md5 par morceau (tentatives successives, jamais d'écrasement), puis assemblés dans
--    la v2 sous contrôle md5 global (transaction annulée si l'empreinte diffère) ;
--  - private.modeles_exemples (v1) n'est plus lue ; conservée (aucune suppression de données).
-- Tant que la v2 est vide, aucun exemple n'est créé (sûr).
-- Les migrations de modèles générées (`npm run exemples:sql`) ciblent désormais la v2.
-- En local / CI, la v2 est remplie par copie de la v1 (contenu de la migration 0800, correct).
-- =====================================================================

create table private.modeles_exemples_v2 (
  ordre    integer primary key,
  nom      text not null check (length(btrim(nom)) > 0),
  adresse  text,
  client   text,
  -- [{ reference, titre, model, slug, md5, data, result: { a_verifier, verifie } }]
  etudes   jsonb not null check (jsonb_typeof(etudes) = 'array' and jsonb_array_length(etudes) > 0)
);
revoke all on table private.modeles_exemples_v2 from public, anon, authenticated;

create table private.modeles_import (
  ordre      integer not null,
  partie     integer not null,
  tentative  integer not null,
  contenu    text not null,
  primary key (ordre, partie, tentative)
);
revoke all on table private.modeles_import from public, anon, authenticated;

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
  v_modele private.modeles_exemples_v2%rowtype;
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

    for v_modele in select * from private.modeles_exemples_v2 m order by m.ordre loop
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

-- Copie (local / CI : la v1 provient de la migration 0800 et est correcte ; en production, cette
-- ligne N'A PAS été appliquée : la v2 y est chargée depuis private.modeles_import, sous contrôle md5).
insert into private.modeles_exemples_v2 select * from private.modeles_exemples;
