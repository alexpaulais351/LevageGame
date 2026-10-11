-- =====================================================================
-- LevageGame — buckets Storage et politiques storage.objects
--  - chart-sources : PDF constructeur, lecture publique, écriture service_role
--  - user-files    : privé, chemin <auth.uid()>/… (logos, PDF perso)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('chart-sources', 'chart-sources', true, 52428800, array['application/pdf']),
  ('user-files', 'user-files', false, 20971520,
   array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/csv'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- chart-sources : lecture par tous ; aucune politique d'écriture
-- (seul service_role, qui contourne la RLS, peut déposer).
create policy chart_sources_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'chart-sources');

-- user-files : le premier segment du chemin doit être l'uid de l'utilisateur.
create policy user_files_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy user_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy user_files_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy user_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
