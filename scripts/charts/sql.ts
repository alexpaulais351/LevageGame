import type { MachineReport } from "./load";

const q = (s: string | null | undefined): string => (s === null || s === undefined ? "null" : `'${s.replace(/'/g, "''")}'`);
const j = (o: unknown): string => `${q(JSON.stringify(o))}::jsonb`;

export const HEADER = `-- GÉNÉRÉ par \`npm run charts:sql\` à partir de data/charts — NE PAS ÉDITER.
-- Idempotent. Tous les abaques arrivent en 'a_verifier', owner_id NULL (catalogue public).
-- Les cellules vides du CSV ne sont pas insérées (capacity_kg NOT NULL) : absence de nœud = hors abaque.
`;

export function machineSql(r: MachineReport): string {
  const m = r.machine!;
  const s = m.source;
  const out: string[] = [];
  out.push(`-- ${r.dir}`, "do $charts$", "declare v_type uuid; v_manu uuid; v_machine uuid; v_cfg uuid; v_src uuid; v_chart uuid;", "begin");
  out.push(`  select id into v_type from public.machine_types where code = ${q(m.type_code)};`);
  out.push(`  if v_type is null then raise exception 'type_code inconnu : ${m.type_code}'; end if;`);
  out.push(`  select id into v_manu from public.manufacturers where lower(name) = lower(${q(m.manufacturer)});`);
  out.push(`  if v_manu is null then raise exception 'constructeur inconnu : ${m.manufacturer.replace(/'/g, "''")}'; end if;`);
  out.push(
    `  select id into v_src from public.chart_sources where owner_id is null and document_title = ${q(s.document_title)}`,
    `    and reference is not distinct from ${q(s.reference)} and edition is not distinct from ${q(s.edition)};`,
    `  if v_src is null then`,
    `    insert into public.chart_sources (owner_id, document_title, reference, edition, url, publisher)`,
    `    values (null, ${q(s.document_title)}, ${q(s.reference)}, ${q(s.edition)}, ${q(s.url)}, ${q(s.publisher)}) returning id into v_src;`,
    `  else update public.chart_sources set url = ${q(s.url)}, publisher = ${q(s.publisher)}, updated_at = now() where id = v_src;`,
    `  end if;`,
  );
  out.push(
    `  select id into v_machine from public.machines where owner_id is null and manufacturer_id = v_manu and lower(model) = lower(${q(m.model)});`,
    `  if v_machine is null then`,
    `    insert into public.machines (type_id, manufacturer_id, model, owner_id, specs)`,
    `    values (v_type, v_manu, ${q(m.model)}, null, ${j(m.specs)}) returning id into v_machine;`,
    `  else update public.machines set type_id = v_type, specs = ${j(m.specs)}, updated_at = now() where id = v_machine;`,
    `  end if;`,
  );
  for (const c of r.configs) {
    const cfg = c.config!;
    const ch = cfg.chart;
    const notes = [ch.notes, s.page_refs ? `Pages : ${s.page_refs}` : null].filter(Boolean).join(" | ") || null;
    const params = { ...cfg.params, slug: cfg.slug };
    const hook = cfg.hook_block_mass_kg === null ? "null" : String(cfg.hook_block_mass_kg);
    out.push(
      `  -- configuration ${cfg.slug}`,
      `  select id into v_cfg from public.machine_configurations where machine_id = v_machine and params->>'slug' = ${q(cfg.slug)};`,
      `  if v_cfg is null then`,
      `    insert into public.machine_configurations (machine_id, label, params, hook_block_mass_kg, notes)`,
      `    values (v_machine, ${q(cfg.label)}, ${j(params)}, ${hook}, ${q(notes)}) returning id into v_cfg;`,
      `  else update public.machine_configurations set label = ${q(cfg.label)}, params = ${j(params)}, hook_block_mass_kg = ${hook}, notes = ${q(notes)}, updated_at = now() where id = v_cfg;`,
      `  end if;`,
      `  select id into v_chart from public.load_charts where configuration_id = v_cfg order by created_at limit 1;`,
      `  if v_chart is null then`,
      `    insert into public.load_charts (configuration_id, axis_x, axis_y, unit, standard, deductions_included, interpolation_allowed, status, source_id, entered_by, entered_at)`,
      `    values (v_cfg, 'radius_m', ${q(ch.axis_y)}, 'kg', ${q(ch.standard)}, ${ch.deductions_included}, ${ch.interpolation_allowed}, 'a_verifier', v_src, null, ${q(m.entered_at)}::timestamptz) returning id into v_chart;`,
      `  else update public.load_charts set axis_y = ${q(ch.axis_y)}, standard = ${q(ch.standard)}, deductions_included = ${ch.deductions_included}, interpolation_allowed = ${ch.interpolation_allowed},`,
      `    status = 'a_verifier', source_id = v_src, entered_by = null, entered_at = ${q(m.entered_at)}::timestamptz, verified_by = null, verified_at = null, updated_at = now() where id = v_chart;`,
      `  end if;`,
      `  delete from public.load_chart_points where chart_id = v_chart;`,
    );
    const rows = c.chart!.points
      .filter((p) => p.capacityKg !== null)
      .map((p) => `(v_chart, ${p.x}, ${p.y ?? 0}, ${p.capacityKg})`);
    if (rows.length) out.push(`  insert into public.load_chart_points (chart_id, x, y, capacity_kg) values`, `    ${rows.join(",\n    ")};`);
  }
  out.push("end $charts$;", "");
  return out.join("\n");
}

/** Dossiers `_*` ignorés. */
export function generateSql(reports: MachineReport[]): { sql: string; machines: number } {
  const sel = reports.filter((r) => !r.dir.startsWith("_"));
  return { sql: HEADER + "\n" + sel.map(machineSql).join("\n"), machines: sel.length };
}
