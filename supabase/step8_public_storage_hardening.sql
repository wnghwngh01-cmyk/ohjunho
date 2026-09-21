begin;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'lab-public',
  'lab-public',
  true,
  20971520,
  array[
    'image/jpeg','image/png','image/webp','application/pdf','text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/x-hwp','application/hwp','application/haansofthwp',
    'application/vnd.hancom.hwp','application/vnd.hancom.hwpx',
    'application/zip','application/octet-stream'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists lab_public_read on storage.objects;
drop policy if exists lab_public_insert_owner on storage.objects;
drop policy if exists lab_public_update_owner on storage.objects;
drop policy if exists lab_public_delete_owner on storage.objects;

create policy lab_public_read on storage.objects
  for select to public
  using (bucket_id = 'lab-public');

create policy lab_public_insert_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lab-public'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy lab_public_update_owner on storage.objects
  for update to authenticated
  using (
    bucket_id = 'lab-public'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'lab-public'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy lab_public_delete_owner on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lab-public'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- The legacy public bucket keeps its existing public-read policy, but its write
-- policies must also be owner-scoped because existing object paths start with
-- the owner's UUID.
drop policy if exists "Authenticated can upload portfolio files" on storage.objects;
drop policy if exists "Authenticated can update portfolio files" on storage.objects;
drop policy if exists "Authenticated can delete portfolio files" on storage.objects;

create policy "Authenticated can upload own portfolio files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'portfolio-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Authenticated can update own portfolio files" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'portfolio-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'portfolio-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Authenticated can delete own portfolio files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'portfolio-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
