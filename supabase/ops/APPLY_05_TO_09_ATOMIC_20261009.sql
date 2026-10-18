-- PRODUCTION CHANGE CONTROL — ONLY after verifying the target project and row counts.
-- This is ONE PostgreSQL transaction. Any SQL error rolls back ALL migrations.
-- No hard reset, drop table or hard deletion of submitted evidence.
-- Supabase Free plan has NO automatic backup: this is NOT a full backup.
-- Only proceed when there are ZERO applications, evidences and review history.
begin;
set local lock_timeout = '15s';
set local statement_timeout = '120s';
select pg_advisory_xact_lock(hashtextextended('cntt-award-schema-upgrade-05-to-09', 0));

do $preflight$
begin
  if (select count(*) from public.applications) <> 0
     or (select count(*) from public.evidences) <> 0
     or (select count(*) from public.review_history) <> 0
     or (select count(*) from public.application_criteria) <> 0 then
    raise exception 'STOP: current dossier or adjudication data requires full verified external backup';
  end if;
  if exists (select 1 from supabase_migrations.schema_migrations
      where version in ('20261008160000','20261008170000','20261009100000','20261009110000','20261009120000')) then
    raise exception 'STOP: one or more migrations already recorded';
  end if;
  if to_regclass('public.evidence_entries') is not null
     or to_regclass('public.storage_cleanup_queue') is not null
     or exists (select 1 from information_schema.columns
       where table_schema='public' and table_name='evidences'
         and column_name in ('evidence_entry_id','content_sha256')) then
    raise exception 'STOP: partial schema already installed, reconcile manually';
  end if;
end
$preflight$;

-- ===== BEGIN 20261008160000 criterion_evidence_binary =====
-- Evidence-only awards: C1-C6 multi-file, C7-C9 single-file; binary review.
-- Apply AFTER 20261008140004_award_scoring.sql.
alter table public.evidences drop constraint if exists evidence_category_matches_parent;
alter table public.evidences add constraint evidence_category_matches_parent check (
  (parent_type='application' and (category in ('portrait','main') or category ~ '^criterion_c[1-9]$'))
  or (parent_type='activity' and category in ('faculty','university'))
  or (parent_type='award' and category='award')
);
alter table public.evidences drop constraint if exists evidences_mime_type_check;
alter table public.evidences add constraint evidences_mime_type_check check (
  mime_type in ('image/jpeg','image/png','image/webp')
  or (parent_type='application' and category ~ '^criterion_c[1-9]$' and mime_type='application/pdf')
);

-- Database-level race protection for the 3 single-evidence criteria.
create unique index if not exists evidences_one_file_per_single_criterion
  on public.evidences (application_id, category)
  where parent_type='application' and category in ('criterion_c7','criterion_c8','criterion_c9');

create or replace function public.guard_criterion_file_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_limit integer; v_count integer;
begin
  if new.parent_type='application' and new.category ~ '^criterion_c[1-9]$' then
    perform pg_advisory_xact_lock(hashtextextended(new.application_id::text || ':' || new.category, 0));
    v_limit := case when new.category in ('criterion_c7','criterion_c8','criterion_c9') then 1 else 20 end;
    select count(*) into v_count from public.evidences e
      where e.application_id=new.application_id and e.category=new.category
      and (tg_op='INSERT' or e.id<>new.id);
    if v_count >= v_limit then raise exception 'CRITERION_EVIDENCE_LIMIT'; end if;
  end if;
  return new;
end; $$;
drop trigger if exists evidences_criterion_limit on public.evidences;
create trigger evidences_criterion_limit before insert or update of category,application_id on public.evidences
  for each row execute function public.guard_criterion_file_limit();

-- New submissions must contain real uploaded evidence for every applicable criterion.
-- Existing already-submitted historical dossiers are not retroactively rejected.
create or replace function public.guard_criterion_evidence_submission()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_code text; v_count integer; v_expected integer;
begin
  if new.status='submitted' and old.status is distinct from new.status then
    v_expected := case when new.application_type='individual' then 9 else 6 end;
    for i in 1..v_expected loop
      v_code := 'criterion_c' || i;
      select count(*) into v_count from public.evidences
        where application_id=new.id and parent_type='application' and category=v_code;
      if v_count=0 then raise exception 'CRITERION_EVIDENCE_MISSING: %', upper('C'||i); end if;
      if i >= 7 and v_count<>1 then raise exception 'CRITERION_EVIDENCE_LIMIT'; end if;
    end loop;
  end if;
  return new;
end; $$;
drop trigger if exists c_guard_criterion_evidence_submission on public.applications;
create trigger c_guard_criterion_evidence_submission
  before update of status on public.applications
  for each row execute function public.guard_criterion_evidence_submission();

-- Binary evidence verification; no manual score, GPA or conduct numeric inputs.
create or replace function public.verify_application_criterion(
  p_application_id uuid, p_code text, p_status public.criterion_status,
  p_reviewer_note text default null
)
returns public.application_criteria
language plpgsql security definer set search_path=public as $$
declare v_row public.application_criteria; v_app public.applications%rowtype;
begin
  if auth.uid() is null or public.current_role() not in ('admin','reviewer') then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_status not in ('pending','verified','rejected') then
    raise exception 'BINARY_REVIEW_ONLY';
  end if;
  select * into v_app from public.applications where id=p_application_id for update;
  if not found or v_app.status not in ('submitted','review') then
    raise exception 'APPLICATION_NOT_REVIEWABLE';
  end if;
  select * into v_row from public.application_criteria
    where application_id=p_application_id and code=p_code for update;
  if not found then raise exception 'CRITERION_NOT_FOUND'; end if;
  if p_status='verified' then
    if not exists (select 1 from public.evidences
       where application_id=p_application_id and parent_type='application'
       and category='criterion_'||lower(p_code)) then
      raise exception 'CRITERION_EVIDENCE_MISSING';
    end if;
  end if;
  update public.application_criteria set status=p_status,
    reviewer_note=nullif(btrim(coalesce(p_reviewer_note,'')),''),
    verified_by=case when p_status='verified' then auth.uid() else null end,
    verified_at=case when p_status='verified' then now() else null end
  where id=v_row.id returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.verify_application_criterion(uuid,text,public.criterion_status,text)
  from public,anon,authenticated;

-- A pass requires every applicable criterion to be marked "Đạt".
create or replace function public.guard_passed_application_criteria()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_expected integer;
begin
  if new.status='passed' and old.status is distinct from 'passed' then
    v_expected := case when new.application_type='individual' then 9 else 6 end;
    if (select count(*) from public.application_criteria where application_id=new.id)<>9 then
      raise exception 'CRITERIA_INCOMPLETE';
    end if;
    if exists (select 1 from public.application_criteria c
      where c.application_id=new.id
      and (c.code in ('C1','C2','C3','C4','C5','C6')
        or (v_expected=9 and c.code in ('C7','C8','C9')))
      and c.status<>'verified') then
      raise exception 'CRITERIA_UNVERIFIED';
    end if;
  end if;
  return new;
end; $$;

-- Disable new numeric score writes but keep historic score records for audit.
revoke execute on function public.score_award_criterion(uuid,text,numeric,text)
  from public,anon,authenticated;

-- Retire numeric score gating without changing historic scores/decision records.
create or replace function public.guard_award_score_decision()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  return new;
end; $$;
drop trigger if exists a_snapshot_award_score_decision on public.review_history;

create or replace function public.record_application_decision(
  p_application_id uuid, p_decision public.review_decision, p_comment text default ''
)
returns public.applications
language plpgsql security definer set search_path=public as $$
declare
  v_app public.applications%rowtype;
  v_actor uuid := auth.uid();
  v_role public.user_role := public.current_role();
  v_comment text := btrim(coalesce(p_comment,''));
  v_snapshot jsonb;
begin
  if v_actor is null or v_role not in ('admin','reviewer') then raise exception 'NOT_AUTHORIZED'; end if;
  select * into v_app from public.applications where id=p_application_id for update;
  if not found or v_app.status not in ('submitted','review') then raise exception 'APPLICATION_NOT_REVIEWABLE'; end if;
  if v_role='reviewer' and v_app.reviewer_id is distinct from v_actor then raise exception 'APPLICATION_NOT_ASSIGNED'; end if;
  if length(v_comment)>5000 then raise exception 'REVIEW_COMMENT_TOO_LONG'; end if;
  if p_decision in ('failed','revision') and length(v_comment)<5 then raise exception 'REVIEW_REASON_REQUIRED'; end if;
  if p_decision='passed' then
    if (select count(*) from public.application_criteria where application_id=p_application_id)<>9 then
      raise exception 'CRITERIA_INCOMPLETE';
    end if;
    if exists (select 1 from public.application_criteria c where c.application_id=p_application_id
      and (c.code in ('C1','C2','C3','C4','C5','C6')
        or (v_app.application_type='individual' and c.code in ('C7','C8','C9')))
      and c.status<>'verified') then
      raise exception 'CRITERIA_UNVERIFIED';
    end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'code',code,'title',title,'status',status,'reviewer_note',reviewer_note,
    'verified_by',verified_by,'verified_at',verified_at) order by code),'[]'::jsonb)
    into v_snapshot from public.application_criteria where application_id=p_application_id;

  insert into public.review_action_permits(application_id,actor_id,transaction_id)
    values (p_application_id,v_actor,txid_current()) on conflict do nothing;
  update public.applications
    set status=p_decision::text::public.application_status,
      reviewer_id=v_actor, review_comment=nullif(v_comment,''), decided_at=now()
  where id=p_application_id returning * into v_app;
  delete from public.review_action_permits
    where application_id=p_application_id and actor_id=v_actor and transaction_id=txid_current();
  insert into public.review_history(application_id,reviewer_id,decision,comment,criteria_snapshot)
    values(p_application_id,v_actor,p_decision,nullif(v_comment,''),v_snapshot);
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(v_actor,'application.decision','application',p_application_id,
      jsonb_build_object('decision',p_decision,'criteria_count',jsonb_array_length(v_snapshot)));
  return v_app;
end; $$;
revoke all on function public.record_application_decision(uuid,public.review_decision,text)
  from public,anon,authenticated;
grant execute on function public.record_application_decision(uuid,public.review_decision,text)
  to authenticated;
-- ===== END 20261008160000 criterion_evidence_binary =====

-- ===== BEGIN 20261008170000 security_hardening =====
-- Security hardening: atomic API throttling, bounded dossier storage, durable Drive cleanup.
-- Apply after 20261008160000_criterion_evidence_binary.sql.
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
-- ===== END 20261008170000 security_hardening =====

-- ===== BEGIN 20261009100000 evidence_entries =====
-- Evidence statement groups: one declared achievement/activity can contain several attachments.
create table if not exists public.evidence_entries (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  criterion_code text not null check (criterion_code in ('C1','C2','C3','C4','C5','C6','C7','C8','C9')),
  title text not null check (length(btrim(title)) between 3 and 240),
  description text not null default '' check (length(description) <= 2000),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evidence_entries_application_idx
  on public.evidence_entries(application_id, criterion_code, created_at);

-- Only a single statement/document is allowed for each mandatory individual criterion.
create unique index if not exists evidence_entries_single_criterion_idx
  on public.evidence_entries(application_id, criterion_code)
  where criterion_code in ('C7','C8','C9');

alter table public.evidence_entries enable row level security;
revoke all on public.evidence_entries from public,anon;
grant select,insert,update,delete on public.evidence_entries to authenticated;
create policy evidence_entries_select on public.evidence_entries
  for select to authenticated using (
    public.current_role() = 'admin'
    or exists (
      select 1 from public.applications a where a.id = application_id and
      (a.created_by = auth.uid() or
       (public.current_role() = 'reviewer' and a.reviewer_id = auth.uid()))
    )
  );
create policy evidence_entries_insert on public.evidence_entries
  for insert to authenticated with check (
    created_by = auth.uid() and public.can_edit_owned_application(application_id)
  );
create policy evidence_entries_update on public.evidence_entries
  for update to authenticated using (public.can_edit_owned_application(application_id))
  with check (created_by = auth.uid() and public.can_edit_owned_application(application_id));
create policy evidence_entries_delete on public.evidence_entries
  for delete to authenticated using (public.can_edit_owned_application(application_id));

create or replace function public.guard_evidence_entry()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_kind text;
begin
  select application_type into v_kind from public.applications where id = new.application_id;
  if new.criterion_code in ('C7','C8','C9') and v_kind is distinct from 'individual' then
    raise exception 'MANDATORY_CRITERIA_INDIVIDUAL_ONLY';
  end if;
  if tg_op = 'UPDATE' then
    if old.id is distinct from new.id
      or old.application_id is distinct from new.application_id
      or old.criterion_code is distinct from new.criterion_code
      or old.created_by is distinct from new.created_by then
      raise exception 'EVIDENCE_ENTRY_IDENTITY_IMMUTABLE';
    end if;
  end if;
  new.updated_at = now();
  return new;
end; $$;

create trigger evidence_entry_guard before insert or update on public.evidence_entries
  for each row execute function public.guard_evidence_entry();

alter table public.evidences
  add column if not exists evidence_entry_id uuid references public.evidence_entries(id) on delete no action deferrable initially deferred;
create index if not exists evidences_entry_idx on public.evidences(evidence_entry_id);

create or replace function public.guard_evidence_file_entry()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_application_id uuid;
declare v_code text;
begin
  if new.evidence_entry_id is not null then
    select application_id, criterion_code into v_application_id, v_code
      from public.evidence_entries where id = new.evidence_entry_id;
    if v_application_id is null
      or v_application_id <> new.application_id
      or new.parent_type <> 'application'
      or new.parent_id <> new.application_id
      or new.category <> ('criterion_' || lower(v_code)) then
      raise exception 'INVALID_EVIDENCE_ENTRY_LINK';
    end if;
  end if;
  return new;
end; $$;

create trigger evidence_file_entry_guard before insert or update of
  evidence_entry_id,application_id,category,parent_type,parent_id on public.evidences
  for each row execute function public.guard_evidence_file_entry();
-- ===== END 20261009100000 evidence_entries =====

-- ===== BEGIN 20261009110000 collective_criteria_t_codes =====
-- Separate physical T1–T6 collective criteria from C1–C9 individual criteria.
-- ADDITIVE: all historical C-coded collective records, decisions, and evidence remain unchanged.
-- Deploy after 20261009100000_evidence_entries.sql. Back up DB; test on staging first.
alter table public.application_criteria drop constraint if exists application_criteria_code_check;
alter table public.application_criteria
  add constraint application_criteria_code_check
  check (code in ('C1','C2','C3','C4','C5','C6','C7','C8','C9','T1','T2','T3','T4','T5','T6'));

alter table public.evidence_entries drop constraint if exists evidence_entries_criterion_code_check;
alter table public.evidence_entries
  add constraint evidence_entries_criterion_code_check
  check (criterion_code in ('C1','C2','C3','C4','C5','C6','C7','C8','C9','T1','T2','T3','T4','T5','T6'));

alter table public.evidences drop constraint if exists evidence_category_matches_parent;
alter table public.evidences add constraint evidence_category_matches_parent check (
  (parent_type='application' and
    (category in ('portrait','main') or category ~ '^criterion_(c[1-9]|t[1-6])$'))
  or (parent_type='activity' and category in ('faculty','university'))
  or (parent_type='award' and category='award')
);
alter table public.evidences drop constraint if exists evidences_mime_type_check;
alter table public.evidences add constraint evidences_mime_type_check check (
  mime_type in ('image/jpeg','image/png','image/webp')
  or (parent_type='application' and category ~ '^criterion_(c[1-9]|t[1-6])$'
    and mime_type='application/pdf')
);

-- Scheme derives from persisted rows, not a UI flag. No re-labelling old dossiers.
create or replace function public.award_applicable_codes(p_id uuid)
returns text[] language plpgsql security definer set search_path=public as $$
declare v_type text; v_new boolean;
begin
  select application_type::text into v_type from public.applications where id=p_id;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
  if v_type='individual' then return array['C1','C2','C3','C4','C5','C6','C7','C8','C9']; end if;
  select exists (select 1 from public.application_criteria where application_id=p_id and code like 'T%') into v_new;
  if v_new then return array['T1','T2','T3','T4','T5','T6']; end if;
  return array['C1','C2','C3','C4','C5','C6'];
end; $$;
revoke all on function public.award_applicable_codes(uuid) from public,anon,authenticated;
grant execute on function public.award_applicable_codes(uuid) to service_role;

-- Reject mixed categories, invalid individual T-codes, and uninitialized categories.
create or replace function public.guard_award_code_scope()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_type text; v_has_c boolean; v_has_t boolean;
begin
  select application_type::text into v_type from public.applications where id=new.application_id;
  if v_type='individual' and new.code !~ '^C[1-9]$' then raise exception 'CRITERION_NOT_APPLICABLE'; end if;
  if v_type='collective' then
    if new.code !~ '^(C[1-9]|T[1-6])$' then raise exception 'CRITERION_NOT_APPLICABLE'; end if;
    select exists(select 1 from public.application_criteria where application_id=new.application_id and code like 'T%'),
           exists(select 1 from public.application_criteria where application_id=new.application_id and code like 'C%')
      into v_has_t,v_has_c;
    if (new.code like 'T%' and v_has_c) or (new.code like 'C%' and v_has_t)
      then raise exception 'MIXED_CRITERION_SCHEMES'; end if;
    if new.code like 'T%' and new.code not in ('T1','T2','T3','T4','T5','T6')
      then raise exception 'CRITERION_NOT_APPLICABLE'; end if;
  end if;
  return new;
end; $$;
drop trigger if exists application_criteria_award_scope on public.application_criteria;
create trigger application_criteria_award_scope before insert on public.application_criteria
  for each row execute function public.guard_award_code_scope();

create or replace function public.guard_evidence_entry()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_kind text; v_found boolean;
begin
  select application_type::text into v_kind from public.applications where id=new.application_id;
  if new.criterion_code in ('C7','C8','C9') and v_kind is distinct from 'individual'
    then raise exception 'MANDATORY_CRITERIA_INDIVIDUAL_ONLY'; end if;
  if new.criterion_code like 'T%' and v_kind is distinct from 'collective'
    then raise exception 'COLLECTIVE_CRITERION_ONLY'; end if;
  select exists (select 1 from public.application_criteria
    where application_id=new.application_id and code=new.criterion_code) into v_found;
  if not v_found then raise exception 'CRITERION_NOT_APPLICABLE'; end if;
  if tg_op='UPDATE' then
    if old.id is distinct from new.id or old.application_id is distinct from new.application_id
       or old.criterion_code is distinct from new.criterion_code
       or old.created_by is distinct from new.created_by
       then raise exception 'EVIDENCE_ENTRY_IDENTITY_IMMUTABLE'; end if;
  end if;
  new.updated_at=now();
  return new;
end; $$;

create or replace function public.guard_individual_criterion_evidence()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_kind text; v_code text;
begin
  if new.parent_type='application' and new.category ~ '^criterion_(c[1-9]|t[1-6])$' then
    v_code:=upper(substr(new.category,11));
    select application_type::text into v_kind from public.applications where id=new.application_id;
    if v_kind='individual' and v_code like 'T%' then raise exception 'COLLECTIVE_CRITERION_ONLY'; end if;
    if v_kind='collective' and v_code in ('C7','C8','C9') then raise exception 'INDIVIDUAL_CRITERION_ONLY'; end if;
    if not exists (select 1 from public.application_criteria
      where application_id=new.application_id and code=v_code) then
      raise exception 'CRITERION_NOT_APPLICABLE'; end if;
  end if;
  return new;
end; $$;

create or replace function public.guard_criterion_file_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_limit integer; v_count integer;
begin
  if new.parent_type='application' and new.category ~ '^criterion_(c[1-9]|t[1-6])$' then
    perform pg_advisory_xact_lock(hashtextextended(new.application_id::text||':'||new.category,0));
    v_limit:=case when new.category in ('criterion_c7','criterion_c8','criterion_c9') then 1 else 20 end;
    select count(*) into v_count from public.evidences e
      where e.application_id=new.application_id and e.category=new.category
        and (tg_op='INSERT' or e.id<>new.id);
    if v_count>=v_limit then raise exception 'CRITERION_EVIDENCE_LIMIT'; end if;
  end if;
  return new;
end; $$;

-- Keep the Drive cleanup transactional, including T1–T6 evidence.
create or replace function public.delete_owned_evidence(p_evidence_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare v_row public.evidences%rowtype;
begin
  if auth.uid() is null or public.current_role()<>'submitter' then raise exception 'NOT_AUTHORIZED'; end if;
  select * into v_row from public.evidences where id=p_evidence_id for update;
  if not found or (v_row.category<>'portrait' and v_row.category !~ '^criterion_(c[1-9]|t[1-6])$')
    or not public.can_edit_owned_application(v_row.application_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  delete from public.evidences where id=v_row.id;
  insert into public.storage_cleanup_queue(drive_file_id)
    values(v_row.drive_file_id) on conflict(drive_file_id) do update set next_attempt_at=now();
  return v_row.drive_file_id;
end; $$;
revoke all on function public.delete_owned_evidence(uuid) from public,anon,authenticated;
grant execute on function public.delete_owned_evidence(uuid) to authenticated;

-- Used by the passed-status guard and the reviewer decision RPC.
create or replace function public.assert_award_criteria_complete(p_id uuid,p_require_verified boolean)
returns void language plpgsql security definer set search_path=public as $$
declare v_type text; v_new boolean; v_all text[]; v_needed text[];
begin
  select application_type::text into v_type from public.applications where id=p_id;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
  v_needed:=public.award_applicable_codes(p_id);
  select exists (select 1 from public.application_criteria where application_id=p_id and code like 'T%') into v_new;
  v_all:=case when v_type='individual' or (v_type='collective' and not v_new)
     then array['C1','C2','C3','C4','C5','C6','C7','C8','C9'] else v_needed end;
  if (select count(*) from public.application_criteria where application_id=p_id) <> array_length(v_all,1)
    or exists (select 1 from unnest(v_all) c
       where not exists(select 1 from public.application_criteria where application_id=p_id and code=c))
    then raise exception 'CRITERIA_INCOMPLETE'; end if;
  if p_require_verified and exists (
      select 1 from public.application_criteria
      where application_id=p_id and code=any(v_needed) and status<>'verified'
    ) then raise exception 'CRITERIA_UNVERIFIED'; end if;
end; $$;
revoke all on function public.assert_award_criteria_complete(uuid,boolean) from public,anon,authenticated;
grant execute on function public.assert_award_criteria_complete(uuid,boolean) to service_role;

create or replace function public.guard_criterion_evidence_submission()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_code text; v_count integer; v_needed text[];
begin
  if new.status='submitted' and old.status is distinct from new.status then
    perform public.assert_award_criteria_complete(new.id,false);
    v_needed:=public.award_applicable_codes(new.id);
    foreach v_code in array v_needed loop
      select count(*) into v_count from public.evidences
        where application_id=new.id and parent_type='application'
        and category='criterion_'||lower(v_code);
      if v_count=0 then raise exception 'CRITERION_EVIDENCE_MISSING: %',v_code; end if;
      if v_code in ('C7','C8','C9') and v_count<>1 then raise exception 'CRITERION_EVIDENCE_LIMIT'; end if;
    end loop;
  end if;
  return new;
end; $$;

create or replace function public.guard_passed_application_criteria()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='passed' and old.status is distinct from 'passed' then
    perform public.assert_award_criteria_complete(new.id,true);
  end if;
  return new;
end; $$;

-- The assigned-reviewer wrapper still enforces assignment and notes.
create or replace function public.verify_application_criterion(
  p_application_id uuid,p_code text,p_status public.criterion_status,
  p_reviewer_note text default null
) returns public.application_criteria language plpgsql security definer set search_path=public as $$
declare v_row public.application_criteria; v_app public.applications%rowtype;
begin
  if auth.uid() is null or public.current_role() not in ('admin','reviewer')
    then raise exception 'NOT_AUTHORIZED'; end if;
  if p_status not in ('pending','verified','rejected') then raise exception 'BINARY_REVIEW_ONLY'; end if;
  select * into v_app from public.applications where id=p_application_id for update;
  if not found or v_app.status not in ('submitted','review') then raise exception 'APPLICATION_NOT_REVIEWABLE'; end if;
  if p_code <> all(public.award_applicable_codes(p_application_id))
    then raise exception 'CRITERION_NOT_APPLICABLE'; end if;
  if length(coalesce(p_reviewer_note,''))>3000 then raise exception 'REVIEW_NOTE_TOO_LONG'; end if;
  select * into v_row from public.application_criteria
    where application_id=p_application_id and code=p_code for update;
  if not found then raise exception 'CRITERION_NOT_FOUND'; end if;
  if p_status='verified' and not exists (select 1 from public.evidences
      where application_id=p_application_id and parent_type='application'
        and category='criterion_'||lower(p_code)) then
    raise exception 'CRITERION_EVIDENCE_MISSING';
  end if;
  update public.application_criteria set status=p_status,
    reviewer_note=nullif(btrim(coalesce(p_reviewer_note,'')),''),
    verified_by=case when p_status='verified' then auth.uid() else null end,
    verified_at=case when p_status='verified' then now() else null end
  where id=v_row.id returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.verify_application_criterion(uuid,text,public.criterion_status,text)
  from public,anon,authenticated;

create or replace function public.record_application_decision(
  p_application_id uuid,p_decision public.review_decision,p_comment text default ''
) returns public.applications language plpgsql security definer set search_path=public as $$
declare
  v_app public.applications%rowtype;
  v_actor uuid:=auth.uid();
  v_role public.user_role:=public.current_role();
  v_comment text:=btrim(coalesce(p_comment,''));
  v_snapshot jsonb;
begin
  if v_actor is null or v_role not in ('admin','reviewer') then raise exception 'NOT_AUTHORIZED'; end if;
  select * into v_app from public.applications where id=p_application_id for update;
  if not found or v_app.status not in ('submitted','review') then raise exception 'APPLICATION_NOT_REVIEWABLE'; end if;
  if v_role='reviewer' and v_app.reviewer_id is distinct from v_actor then raise exception 'APPLICATION_NOT_ASSIGNED'; end if;
  if length(v_comment)>5000 then raise exception 'REVIEW_COMMENT_TOO_LONG'; end if;
  if p_decision in ('failed','revision') and length(v_comment)<5 then raise exception 'REVIEW_REASON_REQUIRED'; end if;
  if p_decision='passed' then
    perform public.assert_award_criteria_complete(p_application_id,true);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
     'code',code,'title',title,'status',status,'reviewer_note',reviewer_note,
     'verified_by',verified_by,'verified_at',verified_at) order by code),'[]'::jsonb)
    into v_snapshot from public.application_criteria where application_id=p_application_id;
  insert into public.review_action_permits(application_id,actor_id,transaction_id)
    values(p_application_id,v_actor,txid_current()) on conflict do nothing;
  update public.applications
    set status=p_decision::text::public.application_status,reviewer_id=v_actor,
        review_comment=nullif(v_comment,''),decided_at=now()
    where id=p_application_id returning * into v_app;
  delete from public.review_action_permits
    where application_id=p_application_id and actor_id=v_actor and transaction_id=txid_current();
  insert into public.review_history(application_id,reviewer_id,decision,comment,criteria_snapshot)
    values(p_application_id,v_actor,p_decision,nullif(v_comment,''),v_snapshot);
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(v_actor,'application.decision','application',p_application_id,
      jsonb_build_object('decision',p_decision,'criteria_count',jsonb_array_length(v_snapshot)));
  return v_app;
end; $$;
revoke all on function public.record_application_decision(uuid,public.review_decision,text)
  from public,anon,authenticated;
grant execute on function public.record_application_decision(uuid,public.review_decision,text)
  to authenticated;
-- ===== END 20261009110000 collective_criteria_t_codes =====

-- ===== BEGIN 20261009120000 evidence_content_integrity =====
-- Persist an independent SHA-256 evidence checksum in Supabase.
-- Apply AFTER 20261009110000_collective_criteria_t_codes.sql.
-- ADDITIVE: existing evidence remains readable; legacy checksums are NULL.
-- Do not populate a checksum from client input without validating bytes server-side.
alter table public.evidences
  add column if not exists content_sha256 text;

alter table public.evidences
  drop constraint if exists evidences_content_sha256_check;

alter table public.evidences
  add constraint evidences_content_sha256_check
  check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$');

comment on column public.evidences.content_sha256 is
  'SHA-256 of verified original uploaded bytes, computed by trusted Next.js API. NULL for legacy files.';
-- ===== END 20261009120000 evidence_content_integrity =====

insert into supabase_migrations.schema_migrations(version,name)
values
('20261008160000','criterion_evidence_binary'),
('20261008170000','security_hardening'),
('20261009100000','evidence_entries'),
('20261009110000','collective_criteria_t_codes'),
('20261009120000','evidence_content_integrity');

-- Must be true before COMMIT, otherwise the transaction aborts.
do $postflight$
begin
  if to_regclass('public.evidence_entries') is null
     or to_regclass('public.storage_cleanup_queue') is null
     or not exists (select 1 from information_schema.columns
       where table_schema='public' and table_name='evidences'
         and column_name='content_sha256')
     or not exists (select 1 from information_schema.columns
       where table_schema='public' and table_name='evidences'
         and column_name='evidence_entry_id') then
    raise exception 'POSTFLIGHT FAILED: required schema objects missing';
  end if;
end
$postflight$;
commit;
