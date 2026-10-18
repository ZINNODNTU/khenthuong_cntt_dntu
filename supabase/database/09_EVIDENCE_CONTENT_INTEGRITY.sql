-- Persist an independent SHA-256 evidence checksum in Supabase.
-- Apply AFTER 20261009110000_collective_criteria_t_codes.sql.
-- ADDITIVE: existing evidence remains readable; legacy checksums are NULL.
-- Do not populate a checksum from client input without validating bytes server-side.
begin;

alter table public.evidences
  add column if not exists content_sha256 text;

alter table public.evidences
  drop constraint if exists evidences_content_sha256_check;

alter table public.evidences
  add constraint evidences_content_sha256_check
  check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$');

comment on column public.evidences.content_sha256 is
  'SHA-256 of verified original uploaded bytes, computed by trusted Next.js API. NULL for legacy files.';

commit;
