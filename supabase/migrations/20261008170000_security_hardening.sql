-- Security hardening: atomic API throttling, bounded dossier storage, durable Drive cleanup.
-- Apply after 20261008160000_criterion_evidence_binary.sql.
begin;

create table if not exists public.security_rate_limits (
  bucket_key text primary key check (bucket_key ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  hits integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.security_rate_limits enable row level security;
revoke all on public.security_rate_limits from public, anon, authenticated;
grant all on public.security_rate_limits to service_role;
create index if not exists security_rate_limits_updated_idx
  on public.security_rate_limits (updated_at);

create or replace function public.consume_security_rate_limit(
  p_bucket text, p_max_hits integer, p_window_seconds integer
) returns table (allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path=public as $$
declare v_hits integer; v_start timestamptz; v_now timestamptz := clock_timestamp();
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_bucket !~ '^[a-f0-9]{64}$'
    or p_max_hits not between 1 and 10000
    or p_window_seconds not between 1 and 86400 then
    raise exception 'INVALID_RATE_LIMIT';
  end if;

  insert into public.security_rate_limits (bucket_key,window_started_at,hits,updated_at)
    values (p_bucket,v_now,1,v_now)
  on conflict (bucket_key) do update
    set hits=case
          when public.security_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
            then 1 else public.security_rate_limits.hits+1 end,
        window_started_at=case
          when public.security_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
            then v_now else public.security_rate_limits.window_started_at end,
        updated_at=v_now
  returning hits,window_started_at into v_hits,v_start;

  return query select v_hits <= p_max_hits,
    case when v_hits <= p_max_hits then 0
         else greatest(1,ceil(extract(epoch from v_start + make_interval(secs => p_window_seconds) - v_now))::integer) end;
end; $$;
revoke all on function public.consume_security_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_security_rate_limit(text,integer,integer) to service_role;

-- Durable outbox for Drive cleanup (never accessible from the browser).
create table if not exists public.storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  drive_file_id text not null unique,
  queued_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  attempts integer not null default 0,
  last_error text
);
alter table public.storage_cleanup_queue enable row level security;
revoke all on public.storage_cleanup_queue from public, anon, authenticated;
grant all on public.storage_cleanup_queue to service_role;
create index if not exists storage_cleanup_queue_due_idx
  on public.storage_cleanup_queue (next_attempt_at);

-- Remove metadata and enqueue its Drive file in the SAME database transaction.
create or replace function public.delete_owned_evidence(p_evidence_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare v_row public.evidences%rowtype;
begin
  if auth.uid() is null or public.current_role() <> 'submitter' then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select * into v_row from public.evidences where id=p_evidence_id for update;
  if not found or v_row.category not in ('portrait',
      'criterion_c1','criterion_c2','criterion_c3','criterion_c4','criterion_c5',
      'criterion_c6','criterion_c7','criterion_c8','criterion_c9')
      or not public.can_edit_owned_application(v_row.application_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  delete from public.evidences where id=v_row.id;
  insert into public.storage_cleanup_queue(drive_file_id)
    values(v_row.drive_file_id)
    on conflict(drive_file_id) do update set next_attempt_at=now();
  return v_row.drive_file_id;
end; $$;
revoke all on function public.delete_owned_evidence(uuid) from public,anon,authenticated;
grant execute on function public.delete_owned_evidence(uuid) to authenticated;

-- Enforce the total quota under a transaction-wide application lock, across criteria.
create or replace function public.guard_dossier_storage_quota()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_count bigint; v_total bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('dossier-quota:'||new.application_id::text,0));
  select count(*),coalesce(sum(size_bytes),0) into v_count,v_total
    from public.evidences where application_id=new.application_id
      and (tg_op='INSERT' or id<>new.id);
  if v_count >= 40 then raise exception 'DOSSIER_FILE_QUOTA_EXCEEDED'; end if;
  if v_total + new.size_bytes > 62914560 then raise exception 'DOSSIER_SIZE_QUOTA_EXCEEDED'; end if;
  return new;
end; $$;
drop trigger if exists evidences_dossier_quota on public.evidences;
create trigger evidences_dossier_quota
  before insert or update of application_id,size_bytes on public.evidences
  for each row execute function public.guard_dossier_storage_quota();

-- Retire old public bearer links from the database as defense in depth.
update public.evidences set public_view_enabled=false where public_view_enabled=true;
alter table public.evidences alter column public_view_enabled set default false;
revoke all on function public.verify_application_criterion(uuid,text,public.criterion_status,text)
  from public,anon,authenticated;
-- Reviewers must go through review_assigned_criterion(), which enforces assignment.

-- Only the applicant, assigned reviewer and admin can read evidence rows.
drop policy if exists evidences_select_visible on public.evidences;
create policy evidences_select_visible on public.evidences
  for select to authenticated using (
    public.current_role() = 'admin'
    or exists (
      select 1 from public.applications application
      where application.id = application_id and (
        application.created_by = auth.uid()
        or (public.current_role() = 'reviewer' and application.reviewer_id = auth.uid())
      )
    )
  );

-- Even clients writing directly to Supabase cannot add C7-C9 to collective dossiers.
create or replace function public.guard_individual_criterion_evidence()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.category in ('criterion_c7','criterion_c8','criterion_c9')
    and exists(select 1 from public.applications
      where id=new.application_id and application_type<>'individual') then
    raise exception 'INDIVIDUAL_CRITERION_ONLY';
  end if;
  return new;
end; $$;
drop trigger if exists evidences_individual_criterion on public.evidences;
create trigger evidences_individual_criterion before insert or update of category,application_id
  on public.evidences for each row execute function public.guard_individual_criterion_evidence();

commit;
