alter table public.evidences
  add column if not exists upload_key text;

update public.evidences
set upload_key = 'legacy:' || id::text
where upload_key is null;

alter table public.evidences
  alter column upload_key set not null;

create unique index if not exists evidences_upload_key_unique
  on public.evidences (upload_key);

create index if not exists evidences_parent_lookup
  on public.evidences (application_id, parent_type, parent_id, category);
