-- Security remediation migration: evidence privacy and share lifecycle.
-- Review and run staging first. Existing active links are not revoked.
begin;
alter table public.evidences
  add column if not exists public_token_hash text,
  add column if not exists public_share_created_at timestamptz,
  add column if not exists public_share_expires_at timestamptz,
  add column if not exists public_share_revoked_at timestamptz;
alter table public.evidences alter column public_view_enabled set default false;
create index if not exists evidences_public_share_lookup_idx on public.evidences (public_token_hash) where public_token_hash is not null;
create index if not exists evidences_public_share_expiry_idx on public.evidences (public_share_expires_at) where public_share_expires_at is not null;
comment on column public.evidences.public_token is 'Legacy plaintext token. Do not expose in ordinary DTOs; migrate to public_token_hash before enabling rotation.';
comment on column public.evidences.public_token_hash is 'Hash of CSPRNG public share token.';
commit;

-- Rollback (review before use):
-- drop index if exists evidences_public_share_lookup_idx;
-- drop index if exists evidences_public_share_expiry_idx;
-- alter table public.evidences drop column if exists public_token_hash;
-- alter table public.evidences drop column if exists public_share_created_at;
-- alter table public.evidences drop column if exists public_share_expires_at;
-- alter table public.evidences drop column if exists public_share_revoked_at;
