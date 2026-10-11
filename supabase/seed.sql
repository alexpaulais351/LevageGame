-- =====================================================================
-- LevageGame — données de référence (exécuté par `supabase db reset`)
-- Types de machines et constructeurs uniquement.
-- AUCUNE machine ni valeur d'abaque : celles-ci proviennent exclusivement
-- de la documentation constructeur, via scripts/import-chart.ts.
-- =====================================================================

-- params_schema : JSON Schema des paramètres de configuration attendus
-- (machine_configurations.params) ; volontairement minimal, enrichi plus tard.
insert into public.machine_types (code, label, family, params_schema) values
  ('grue_mobile', 'Grue mobile sur pneus', 'grue', '{
     "type": "object",
     "properties": {
       "longueur_fleche_m": {"type": "number", "minimum": 0},
       "contrepoids_kg": {"type": "number", "minimum": 0},
       "calage_pct": {"type": "number", "minimum": 0, "maximum": 100},
       "zone": {"enum": ["360", "arriere", "avant", "laterale"]},
       "flechette": {"type": "string"},
       "nb_brins": {"type": "integer", "minimum": 1}
     }
   }'),
  ('grue_mobile_chenilles', 'Grue mobile sur chenilles', 'grue', '{
     "type": "object",
     "properties": {
       "longueur_fleche_m": {"type": "number", "minimum": 0},
       "contrepoids_kg": {"type": "number", "minimum": 0},
       "ecartement_chenilles_m": {"type": "number", "minimum": 0},
       "flechette": {"type": "string"},
       "nb_brins": {"type": "integer", "minimum": 1}
     }
   }'),
  ('grue_tour', 'Grue à tour', 'grue', '{
     "type": "object",
     "properties": {
       "longueur_fleche_m": {"type": "number", "minimum": 0},
       "hauteur_sous_crochet_m": {"type": "number", "minimum": 0},
       "mouflage": {"enum": ["2_brins", "4_brins"]}
     }
   }'),
  ('grue_auxiliaire', 'Grue auxiliaire (camion-bras)', 'grue', '{
     "type": "object",
     "properties": {
       "extensions_hydrauliques": {"type": "integer", "minimum": 0},
       "jib": {"type": "string"},
       "calage_pct": {"type": "number", "minimum": 0, "maximum": 100}
     }
   }'),
  ('telescopique_fixe', 'Chariot télescopique fixe', 'telescopique', '{
     "type": "object",
     "properties": {
       "accessoire": {"type": "string"},
       "stabilisateurs": {"type": "boolean"}
     }
   }'),
  ('telescopique_rotatif', 'Chariot télescopique rotatif', 'telescopique', '{
     "type": "object",
     "properties": {
       "accessoire": {"type": "string"},
       "stabilisateurs": {"type": "boolean"},
       "zone": {"enum": ["360", "avant"]}
     }
   }'),
  ('pelle_pneus', 'Pelle sur pneus', 'pelle', '{
     "type": "object",
     "properties": {
       "balancier_m": {"type": "number", "minimum": 0},
       "orientation": {"enum": ["axial", "transversal"]},
       "stabilisateurs": {"type": "boolean"},
       "clapets_securite": {"type": "boolean"}
     }
   }'),
  ('pelle_chenilles', 'Pelle sur chenilles', 'pelle', '{
     "type": "object",
     "properties": {
       "balancier_m": {"type": "number", "minimum": 0},
       "orientation": {"enum": ["axial", "transversal"]},
       "patins_mm": {"type": "number", "minimum": 0},
       "clapets_securite": {"type": "boolean"}
     }
   }'),
  ('pelle_rail_route', 'Pelle rail-route', 'pelle', '{
     "type": "object",
     "properties": {
       "balancier_m": {"type": "number", "minimum": 0},
       "orientation": {"enum": ["axial", "transversal"]},
       "devers_mm": {"type": "number"},
       "clapets_securite": {"type": "boolean"}
     }
   }'),
  ('chariot_elevateur', 'Chariot élévateur', 'chariot', '{
     "type": "object",
     "properties": {
       "centre_gravite_mm": {"type": "number", "minimum": 0},
       "hauteur_levee_m": {"type": "number", "minimum": 0}
     }
   }')
on conflict (code) do update
  set label = excluded.label,
      family = excluded.family,
      params_schema = excluded.params_schema;

insert into public.manufacturers (name)
select n from unnest(array[
  'Liebherr', 'Tadano', 'Demag', 'Grove', 'Potain', 'Manitou', 'Merlo',
  'JCB', 'Caterpillar', 'Komatsu', 'Volvo', 'Palfinger', 'Fassi', 'Hiab',
  'Shuttlelift', 'Galizia', 'JMG', 'Terex'
]) as t(n)
on conflict (lower(name)) do nothing;
