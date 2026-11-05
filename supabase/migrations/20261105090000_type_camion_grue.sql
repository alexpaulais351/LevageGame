-- D52 : le type « Grue auxiliaire (camion-bras) » s'affiche « Camion grue » (pastille du choix de type).
update public.machine_types set label = 'Camion grue' where code = 'grue_auxiliaire';
