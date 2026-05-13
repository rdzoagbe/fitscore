-- CV file storage bucket for Phase 2 upload/parsing flow.
-- Run after 0001_phase1_schema.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-files',
  'cv-files',
  false,
  8388608,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy cv_files_select_own on storage.objects
  for select using (
    bucket_id = 'cv-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy cv_files_insert_own on storage.objects
  for insert with check (
    bucket_id = 'cv-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy cv_files_update_own on storage.objects
  for update using (
    bucket_id = 'cv-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'cv-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy cv_files_delete_own on storage.objects
  for delete using (
    bucket_id = 'cv-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
