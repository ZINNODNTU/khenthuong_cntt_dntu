-- =====================================================================
-- CNTT AWARD REVIEW SYSTEM
-- DATABASE SETUP FROM SCRATCH - VERSION 1.0.0
--
-- File duy nhat dung de khoi tao database sau khi da chay:
--   00_RESET_DATABASE.sql
--
-- Noi dung:
--   - 19 Chi doan mac dinh
--   - Quan ly CLB
--   - Quan ly dot xet thanh tich
--   - Ho so ca nhan / tap the Chi doan / tap the CLB
--   - Chi duoc tao 01 ho so cho moi doi tuong trong moi dot
--   - Anh chan dung va minh chung
--   - Phan quyen admin / reviewer / submitter
--   - RLS, trigger, audit log va lich su xet duyet
-- =====================================================================

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type public.user_role as enum (
  'admin',
  'reviewer',
  'submitter'
);

create type public.submission_scope as enum (
  'individual',
  'branch',
  'club'
);

create type public.application_status as enum (
  'draft',
  'submitted',
  'review',
  'revision',
  'passed',
  'failed'
);

create type public.application_type as enum (
  'individual',
  'collective'
);

create type public.collective_type as enum (
  'branch',
  'club'
);

create type public.activity_level as enum (
  'faculty',
  'university'
);

create type public.award_type as enum (
  'certificate',
  'commendation'
);

create type public.review_decision as enum (
  'passed',
  'failed',
  'revision'
);

create type public.period_status as enum (
  'draft',
  'open',
  'closed'
);

-- ---------------------------------------------------------------------
-- MASTER DATA
-- ---------------------------------------------------------------------
create table public.branches (
  code text primary key,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branches_code_format
    check (code ~ '^[A-Z0-9_-]+$')
);

insert into public.branches (code, name)
values
  ('22DTH1', '22DTH1'),
  ('22DTH2', '22DTH2'),
  ('22DTH3', '22DTH3'),
  ('22DTH4', '22DTH4'),
  ('22DTH5', '22DTH5'),
  ('22DTH6', '22DTH6'),
  ('22DTH7', '22DTH7'),
  ('23DTH1', '23DTH1'),
  ('23DTH2', '23DTH2'),
  ('23DTH3', '23DTH3'),
  ('23DTH4', '23DTH4'),
  ('23DTH5', '23DTH5'),
  ('24DTH1', '24DTH1'),
  ('24DTH2', '24DTH2'),
  ('24DTH3', '24DTH3'),
  ('24DPM1', '24DPM1'),
  ('25DTH', '25DTH'),
  ('25DPM', '25DPM'),
  ('25DTN', '25DTN');

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clubs_code_format
    check (code ~ '^[A-Z0-9_-]+$')
);

-- ---------------------------------------------------------------------
-- USERS AND AUTHORIZATION
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role public.user_role not null default 'submitter',
  submission_scope public.submission_scope not null default 'individual',
  branch_code text references public.branches(code),
  club_id uuid references public.clubs(id),
  is_active boolean not null default false,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint account_email_policy check (
    lower(email) ~ '^[a-z0-9._-]+@dntu\.edu\.vn$'
    and (
      role <> 'submitter'
      or submission_scope <> 'individual'
      or is_active = false
      or lower(email) ~ '^[0-9]+@dntu\.edu\.vn$'
    )
  ),

  constraint profile_scope_consistency check (
    (
      role in ('admin', 'reviewer')
      and submission_scope = 'individual'
      and branch_code is null
      and club_id is null
    )
    or
    (
      role = 'submitter'
      and submission_scope = 'individual'
      and club_id is null
      and (
        branch_code is not null
        or is_active = false
      )
    )
    or
    (
      role = 'submitter'
      and submission_scope = 'branch'
      and branch_code is not null
      and club_id is null
    )
    or
    (
      role = 'submitter'
      and submission_scope = 'club'
      and branch_code is null
      and club_id is not null
    )
  )
);

-- Email is normalized by application code and auth triggers. This index
-- also blocks case-only duplicates at database level.
create unique index profiles_email_lower_unique
  on public.profiles (lower(email));

-- Public registration first reserves the MSSV in this server-only table.
-- The primary key and lower-email index make concurrent duplicate requests
-- impossible even before Supabase Auth finishes creating the user.
create table public.student_account_registry (
  student_id text primary key,
  email text not null,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint student_account_registry_id_format
    check (student_id ~ '^[0-9]+$'),

  constraint student_account_registry_email_match
    check (lower(email) = lower(student_id || '@dntu.edu.vn')),

  constraint student_account_registry_status_check
    check (status in ('pending', 'created', 'confirmed', 'existing'))
);

create unique index student_account_registry_email_lower_unique
  on public.student_account_registry (lower(email));

alter table public.student_account_registry enable row level security;

-- ---------------------------------------------------------------------
-- EVALUATION PERIODS
-- ---------------------------------------------------------------------
create table public.evaluation_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  evidence_starts_on date not null,
  evidence_ends_on date not null,
  status public.period_status not null default 'draft',
  allow_individual boolean not null default true,
  allow_branch_collective boolean not null default true,
  allow_club_collective boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint evaluation_period_time_check
    check (ends_at > starts_at),
  constraint evaluation_period_evidence_time_check
    check (evidence_ends_on >= evidence_starts_on)
);

-- ---------------------------------------------------------------------
-- APPLICATIONS
-- ---------------------------------------------------------------------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  evaluation_period_id uuid not null
    references public.evaluation_periods(id),
  application_type public.application_type not null,
  collective_type public.collective_type,
  branch_code text references public.branches(code),
  club_id uuid references public.clubs(id),

  subject_name text not null,
  student_id text,
  birth_date date,
  position text,
  phone text,
  email text,

  achievements text not null default '',
  role_contribution text,
  targets_result text,
  initiatives text,
  impact text,
  summary text,

  status public.application_status not null default 'draft',
  review_comment text,

  created_by uuid not null references public.profiles(id),
  reviewer_id uuid references public.profiles(id),

  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint applications_subject_scope_check check (
    (
      application_type = 'individual'
      and collective_type is null
      and branch_code is not null
      and club_id is null
    )
    or
    (
      application_type = 'collective'
      and collective_type = 'branch'
      and branch_code is not null
      and club_id is null
    )
    or
    (
      application_type = 'collective'
      and collective_type = 'club'
      and branch_code is null
      and club_id is not null
    )
  ),

  constraint applications_individual_identity_check check (
    application_type = 'collective'
    or (
      student_id is not null
      and email is not null
      and student_id ~ '^[0-9]+$'
      and lower(email) = lower(student_id || '@dntu.edu.vn')
    )
  )
);

-- Moi ca nhan chi co mot ho so trong mot dot.
create unique index applications_one_individual_per_period
  on public.applications (evaluation_period_id, created_by)
  where application_type = 'individual';

-- Moi Chi doan chi co mot ho so tap the trong mot dot.
create unique index applications_one_branch_per_period
  on public.applications (evaluation_period_id, branch_code)
  where application_type = 'collective'
    and collective_type = 'branch';

-- Moi CLB chi co mot ho so tap the trong mot dot.
create unique index applications_one_club_per_period
  on public.applications (evaluation_period_id, club_id)
  where application_type = 'collective'
    and collective_type = 'club';

-- ---------------------------------------------------------------------
-- ACTIVITIES AND PRIOR AWARDS
-- ---------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.applications(id) on delete cascade,
  client_key text not null,
  level public.activity_level not null,
  name text not null,
  organizer text,
  activity_date date,
  role text,
  result text,
  contribution text,
  created_at timestamptz not null default now(),

  unique (application_id, client_key)
);

create table public.prior_awards (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.applications(id) on delete cascade,
  client_key text not null,
  award_type public.award_type not null,
  title text not null,
  decision_number text not null,
  issued_date date,
  issuer text not null,
  created_at timestamptz not null default now(),

  unique (application_id, client_key)
);

-- ---------------------------------------------------------------------
-- IMAGE EVIDENCE METADATA
-- ---------------------------------------------------------------------
create table public.evidences (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  parent_type text not null check (parent_type in ('application', 'activity', 'award')),
  parent_id uuid not null,
  category text not null,
  upload_key text not null unique,
  drive_file_id text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_by uuid not null references public.profiles(id),
  public_token uuid not null default gen_random_uuid() unique,
  public_view_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  constraint evidence_category_matches_parent check (
    (parent_type = 'application' and category in ('portrait', 'main'))
    or (parent_type = 'activity' and category in ('faculty', 'university'))
    or (parent_type = 'award' and category = 'award')
  )
);
create unique index evidences_one_portrait_per_application
  on public.evidences (application_id)
  where parent_type = 'application'
    and category = 'portrait';

create index evidences_parent_lookup
  on public.evidences (application_id, parent_type, parent_id, category);

-- ---------------------------------------------------------------------
-- REVIEW AND AUDIT
-- ---------------------------------------------------------------------
create table public.review_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.applications(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  decision public.review_decision not null,
  comment text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------
create index profiles_role_idx
  on public.profiles (role, is_active);

create index profiles_branch_idx
  on public.profiles (branch_code);

create index profiles_club_idx
  on public.profiles (club_id);

create index periods_status_time_idx
  on public.evaluation_periods (status, starts_at, ends_at);

create index applications_period_idx
  on public.applications (evaluation_period_id);

create index applications_status_idx
  on public.applications (status);

create index applications_branch_idx
  on public.applications (branch_code);

create index applications_club_idx
  on public.applications (club_id);

create index applications_created_by_idx
  on public.applications (created_by);

create index activities_application_idx
  on public.activities (application_id);

create index awards_application_idx
  on public.prior_awards (application_id);

create index evidences_application_idx
  on public.evidences (application_id);

create index evidences_parent_idx
  on public.evidences (parent_type, parent_id);

create index review_history_application_idx
  on public.review_history (application_id, created_at desc);

create index audit_logs_created_idx
  on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------
-- COMMON FUNCTIONS
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
    and must_change_password = false
$$;

create or replace function public.current_branch()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select branch_code
  from public.profiles
  where id = auth.uid()
    and is_active = true
    and must_change_password = false
$$;

create or replace function public.current_club()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select club_id
  from public.profiles
  where id = auth.uid()
    and is_active = true
    and must_change_password = false
$$;

create or replace function public.current_submission_scope()
returns public.submission_scope
language sql
stable
security definer
set search_path = public
as $$
  select submission_scope
  from public.profiles
  where id = auth.uid()
    and is_active = true
    and must_change_password = false
$$;

create or replace function public.application_scope_matches(
  p_application_type public.application_type,
  p_collective_type public.collective_type,
  p_branch_code text,
  p_club_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.current_submission_scope()
    when 'individual' then
      p_application_type = 'individual'
      and p_collective_type is null
      and p_branch_code = public.current_branch()
      and p_club_id is null

    when 'branch' then
      p_application_type = 'collective'
      and p_collective_type = 'branch'
      and p_branch_code = public.current_branch()
      and p_club_id is null

    when 'club' then
      p_application_type = 'collective'
      and p_collective_type = 'club'
      and p_branch_code is null
      and p_club_id = public.current_club()

    else false
  end
$$;

create or replace function public.can_view_application(
  p_application_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications application
    where application.id = p_application_id
      and (
        application.created_by = auth.uid()
        or public.current_role() in ('admin', 'reviewer')
      )
  )
$$;

create or replace function public.can_edit_owned_application(
  p_application_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications application
    where application.id = p_application_id
      and application.created_by = auth.uid()
      and application.status in ('draft', 'revision')
      and public.current_role() = 'submitter'
      and public.application_scope_matches(
        application.application_type,
        application.collective_type,
        application.branch_code,
        application.club_id
      )
  )
$$;

-- ---------------------------------------------------------------------
-- AUTH USER PROFILE TRIGGER
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_branch text;
  resolved_name text;
  branch_is_valid boolean;
  student_email_is_valid boolean;
  resolved_student_id text;
  registered_auth_user_id uuid;
begin
  requested_branch := nullif(
    upper(trim(coalesce(new.raw_user_meta_data ->> 'branch_code', ''))),
    ''
  );

  branch_is_valid := requested_branch is not null
    and exists (
      select 1
      from public.branches branch
      where branch.code = requested_branch
        and branch.is_active = true
    );

  student_email_is_valid :=
    lower(coalesce(new.email, '')) ~ '^[0-9]+@dntu\.edu\.vn$';

  if not branch_is_valid then
    requested_branch := null;
  end if;

  resolved_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    ''
  );

  if student_email_is_valid then
    resolved_student_id := split_part(lower(new.email), '@', 1);

    select registry.auth_user_id
    into registered_auth_user_id
    from public.student_account_registry registry
    where registry.student_id = resolved_student_id
       or lower(registry.email) = lower(new.email)
    limit 1
    for update;

    if registered_auth_user_id is not null
      and registered_auth_user_id <> new.id then
      raise exception 'STUDENT_ACCOUNT_ALREADY_EXISTS'
        using errcode = '23505';
    end if;

    insert into public.student_account_registry (
      student_id,
      email,
      auth_user_id,
      status
    )
    values (
      resolved_student_id,
      lower(new.email),
      new.id,
      case
        when new.email_confirmed_at is not null then 'confirmed'
        else 'created'
      end
    )
    on conflict (student_id) do update
    set
      email = excluded.email,
      auth_user_id = excluded.auth_user_id,
      status = excluded.status,
      updated_at = now();
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    submission_scope,
    branch_code,
    club_id,
    is_active,
    must_change_password
  )
  values (
    new.id,
    lower(coalesce(new.email, '')),
    resolved_name,
    'submitter',
    'individual',
    requested_branch,
    null,
    branch_is_valid and student_email_is_valid,
    false
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = case
      when public.profiles.full_name = '' then excluded.full_name
      else public.profiles.full_name
    end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.sync_student_account_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
    and old.email_confirmed_at is distinct from new.email_confirmed_at then
    update public.student_account_registry
    set
      status = 'confirmed',
      updated_at = now()
    where auth_user_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_student_registry_confirmed on auth.users;

create trigger on_auth_user_student_registry_confirmed
after update of email_confirmed_at on auth.users
for each row
execute function public.sync_student_account_confirmation();

-- ---------------------------------------------------------------------
-- APPLICATION VALIDATION TRIGGERS
-- ---------------------------------------------------------------------
create or replace function public.guard_application_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.user_role;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  actor_role := public.current_role();

  if actor_role = 'submitter' then
    if old.created_by is distinct from new.created_by
      or old.code is distinct from new.code
      or old.evaluation_period_id is distinct from new.evaluation_period_id
      or old.application_type is distinct from new.application_type
      or old.collective_type is distinct from new.collective_type
      or old.branch_code is distinct from new.branch_code
      or old.club_id is distinct from new.club_id
      or old.reviewer_id is distinct from new.reviewer_id
      or old.review_comment is distinct from new.review_comment
      or old.decided_at is distinct from new.decided_at
      or old.submitted_at is distinct from new.submitted_at
    then
      raise exception 'Nguoi nop ho so khong duoc thay doi thong tin he thong cua ho so.';
    end if;

    if old.status not in ('draft', 'revision') then
      raise exception 'Ho so khong con duoc phep chinh sua.';
    end if;

    return new;
  end if;

  if actor_role in ('admin', 'reviewer') then
    if old.code is distinct from new.code
      or old.evaluation_period_id is distinct from new.evaluation_period_id
      or old.application_type is distinct from new.application_type
      or old.collective_type is distinct from new.collective_type
      or old.branch_code is distinct from new.branch_code
      or old.club_id is distinct from new.club_id
      or old.subject_name is distinct from new.subject_name
      or old.student_id is distinct from new.student_id
      or old.birth_date is distinct from new.birth_date
      or old.position is distinct from new.position
      or old.phone is distinct from new.phone
      or old.email is distinct from new.email
      or old.achievements is distinct from new.achievements
      or old.role_contribution is distinct from new.role_contribution
      or old.targets_result is distinct from new.targets_result
      or old.initiatives is distinct from new.initiatives
      or old.impact is distinct from new.impact
      or old.summary is distinct from new.summary
      or old.created_by is distinct from new.created_by
      or old.submitted_at is distinct from new.submitted_at
    then
      raise exception 'Can bo xet duyet chi duoc cap nhat ket qua va nhan xet.';
    end if;

    return new;
  end if;

  raise exception 'Tai khoan khong co quyen cap nhat ho so.';
end;
$$;

create or replace function public.validate_application_status_transition()
returns trigger
language plpgsql
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status = 'draft'
    and new.status not in ('submitted')
  then
    raise exception 'Trang thai ho so khong hop le.';
  end if;

  if old.status = 'submitted'
    and new.status not in ('review', 'revision', 'passed', 'failed')
  then
    raise exception 'Trang thai ho so khong hop le.';
  end if;

  if old.status = 'review'
    and new.status not in ('revision', 'passed', 'failed')
  then
    raise exception 'Trang thai ho so khong hop le.';
  end if;

  if old.status = 'revision'
    and new.status not in ('submitted')
  then
    raise exception 'Trang thai ho so khong hop le.';
  end if;

  if old.status in ('passed', 'failed') then
    raise exception 'Ho so da co ket luan va khong the doi trang thai.';
  end if;

  return new;
end;
$$;

create or replace function public.validate_application_period_and_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  period_record public.evaluation_periods%rowtype;
  needs_period_validation boolean;
begin
  needs_period_validation :=
    tg_op = 'INSERT'
    or (
      tg_op = 'UPDATE'
      and new.status = 'submitted'
      and old.status is distinct from 'submitted'
    );

  if not needs_period_validation then
    return new;
  end if;

  select *
  into period_record
  from public.evaluation_periods
  where id = new.evaluation_period_id;

  if period_record.id is null then
    raise exception 'Dot xet khong ton tai.';
  end if;

  if period_record.status <> 'open'
    or now() < period_record.starts_at
    or now() > period_record.ends_at
  then
    raise exception 'Dot xet hien khong nhan ho so.';
  end if;

  if new.application_type = 'individual'
    and not period_record.allow_individual
  then
    raise exception 'Dot xet khong nhan ho so ca nhan.';
  end if;

  if new.application_type = 'collective'
    and new.collective_type = 'branch'
    and not period_record.allow_branch_collective
  then
    raise exception 'Dot xet khong nhan ho so tap the Chi doan.';
  end if;

  if new.application_type = 'collective'
    and new.collective_type = 'club'
    and not period_record.allow_club_collective
  then
    raise exception 'Dot xet khong nhan ho so tap the CLB.';
  end if;

  if tg_op = 'UPDATE' and new.status = 'submitted' then
    if not exists (
      select 1
      from public.evidences evidence
      where evidence.application_id = new.id
    ) then
      raise exception 'Ho so phai co it nhat 01 anh minh chung.';
    end if;

    if new.application_type = 'individual'
      and not exists (
        select 1
        from public.evidences evidence
        where evidence.application_id = new.id
          and evidence.parent_type = 'application'
          and evidence.category = 'portrait'
      )
    then
      raise exception 'Ho so ca nhan phai co anh chan dung.';
    end if;

    if exists (
      select 1
      from public.activities activity
      where activity.application_id = new.id
        and length(trim(activity.name)) < 3
    ) then
      raise exception 'Co hoat dong chua nhap ten hop le.';
    end if;

    if exists (
      select 1
      from public.prior_awards award
      where award.application_id = new.id
        and (
          length(trim(award.title)) < 3
          or length(trim(award.decision_number)) < 1
          or length(trim(award.issuer)) < 2
        )
    ) then
      raise exception 'Co thanh tich khen thuong chua du thong tin.';
    end if;

    if new.application_type = 'individual' then
      if new.birth_date is null then
        raise exception 'Ho so ca nhan phai co ngay sinh.';
      end if;
      if new.birth_date > (current_date - interval '18 years')::date then
        raise exception 'Nguoi nop ho so phai du 18 tuoi.';
      end if;
    end if;

    if exists (
      select 1 from public.activities activity
      where activity.application_id = new.id
        and (activity.activity_date is null
          or activity.activity_date < period_record.evidence_starts_on
          or activity.activity_date > period_record.evidence_ends_on)
    ) then
      raise exception 'Ngay hoat dong nam ngoai khoang minh chung hop le.';
    end if;

    if exists (
      select 1 from public.prior_awards award
      where award.application_id = new.id
        and (award.issued_date is null
          or award.issued_date < period_record.evidence_starts_on
          or award.issued_date > period_record.evidence_ends_on)
    ) then
      raise exception 'Ngay cap khen thuong nam ngoai khoang minh chung hop le.';
    end if;

    new.submitted_at := now();
    new.reviewer_id := null;
    new.decided_at := null;
  end if;

  return new;
end;
$$;

create or replace function public.validate_evidence_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_type = 'application' then
    if new.parent_id <> new.application_id then
      raise exception 'Anh cap ho so co parent_id khong hop le.';
    end if;

  elsif new.parent_type = 'activity' then
    if not exists (
      select 1
      from public.activities activity
      where activity.id = new.parent_id
        and activity.application_id = new.application_id
    ) then
      raise exception 'Hoat dong cua anh minh chung khong hop le.';
    end if;

  elsif new.parent_type = 'award' then
    if not exists (
      select 1
      from public.prior_awards award
      where award.id = new.parent_id
        and award.application_id = new.application_id
    ) then
      raise exception 'Thanh tich khen thuong cua anh khong hop le.';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------
create trigger branches_touch
before update on public.branches
for each row
execute function public.touch_updated_at();

create trigger clubs_touch
before update on public.clubs
for each row
execute function public.touch_updated_at();

create trigger profiles_touch
before update on public.profiles
for each row
execute function public.touch_updated_at();

create trigger periods_touch
before update on public.evaluation_periods
for each row
execute function public.touch_updated_at();

create trigger a_guard_application_update
before update on public.applications
for each row
execute function public.guard_application_update();

create trigger b_validate_application_status
before update of status on public.applications
for each row
execute function public.validate_application_status_transition();

create trigger c_validate_application_period
before insert or update of status
on public.applications
for each row
execute function public.validate_application_period_and_submission();

create trigger z_applications_touch
before update on public.applications
for each row
execute function public.touch_updated_at();

create trigger evidences_validate_parent
before insert or update
on public.evidences
for each row
execute function public.validate_evidence_parent();

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.branches enable row level security;
alter table public.clubs enable row level security;
alter table public.profiles enable row level security;
alter table public.evaluation_periods enable row level security;
alter table public.applications enable row level security;
alter table public.activities enable row level security;
alter table public.prior_awards enable row level security;
alter table public.evidences enable row level security;
alter table public.review_history enable row level security;
alter table public.audit_logs enable row level security;

-- Branches
create policy branches_select_authenticated
on public.branches
for select
to authenticated
using (true);

create policy branches_admin_insert
on public.branches
for insert
to authenticated
with check (public.current_role() = 'admin');

create policy branches_admin_update
on public.branches
for update
to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

-- Clubs
create policy clubs_select_authenticated
on public.clubs
for select
to authenticated
using (true);

create policy clubs_admin_insert
on public.clubs
for insert
to authenticated
with check (public.current_role() = 'admin');

create policy clubs_admin_update
on public.clubs
for update
to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

-- Profiles
create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.current_role() = 'admin'
);

-- Evaluation periods
create policy periods_select_authenticated
on public.evaluation_periods
for select
to authenticated
using (true);

create policy periods_admin_insert
on public.evaluation_periods
for insert
to authenticated
with check (public.current_role() = 'admin');

create policy periods_admin_update
on public.evaluation_periods
for update
to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy periods_admin_delete
  on public.evaluation_periods
  for delete
  to authenticated
  using (public.current_role() = 'admin');

-- Applications
create policy applications_select_visible
on public.applications
for select
to authenticated
using (
  created_by = auth.uid()
  or public.current_role() in ('admin', 'reviewer')
);

create policy applications_submitter_insert
on public.applications
for insert
to authenticated
with check (
  created_by = auth.uid()
  and status = 'draft'
  and public.current_role() = 'submitter'
  and public.application_scope_matches(
    application_type,
    collective_type,
    branch_code,
    club_id
  )
  and exists (
    select 1
    from public.evaluation_periods period
    where period.id = evaluation_period_id
      and period.status = 'open'
      and now() between period.starts_at and period.ends_at
  )
);

create policy applications_owner_or_reviewer_update
on public.applications
for update
to authenticated
using (
  public.can_edit_owned_application(id)
  or public.current_role() in ('admin', 'reviewer')
)
with check (
  (
    created_by = auth.uid()
    and public.current_role() = 'submitter'
    and public.application_scope_matches(
      application_type,
      collective_type,
      branch_code,
      club_id
    )
  )
  or public.current_role() in ('admin', 'reviewer')
);

-- Activities
create policy activities_select_visible
on public.activities
for select
to authenticated
using (public.can_view_application(application_id));

create policy activities_owner_insert
on public.activities
for insert
to authenticated
with check (public.can_edit_owned_application(application_id));

create policy activities_owner_update
on public.activities
for update
to authenticated
using (public.can_edit_owned_application(application_id))
with check (public.can_edit_owned_application(application_id));

create policy activities_owner_delete
on public.activities
for delete
to authenticated
using (public.can_edit_owned_application(application_id));

-- Prior awards
create policy awards_select_visible
on public.prior_awards
for select
to authenticated
using (public.can_view_application(application_id));

create policy awards_owner_insert
on public.prior_awards
for insert
to authenticated
with check (public.can_edit_owned_application(application_id));

create policy awards_owner_update
on public.prior_awards
for update
to authenticated
using (public.can_edit_owned_application(application_id))
with check (public.can_edit_owned_application(application_id));

create policy awards_owner_delete
on public.prior_awards
for delete
to authenticated
using (public.can_edit_owned_application(application_id));

-- Evidences
create policy evidences_select_visible
on public.evidences
for select
to authenticated
using (public.can_view_application(application_id));

create policy evidences_owner_insert
on public.evidences
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and public.can_edit_owned_application(application_id)
);

create policy evidences_owner_or_admin_delete
on public.evidences
for delete
to authenticated
using (
  public.can_edit_owned_application(application_id)
  or public.current_role() = 'admin'
);

-- Review history
create policy review_history_select_visible
on public.review_history
for select
to authenticated
using (public.can_view_application(application_id));

create policy review_history_reviewer_insert
on public.review_history
for insert
to authenticated
with check (
  reviewer_id = auth.uid()
  and public.current_role() in ('admin', 'reviewer')
);

-- Audit logs
create policy audit_logs_admin_select
on public.audit_logs
for select
to authenticated
using (public.current_role() = 'admin');

create policy audit_logs_authenticated_insert
on public.audit_logs
for insert
to authenticated
with check (actor_id = auth.uid());

-- ---------------------------------------------------------------------
-- PRIVILEGES
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
on all tables in schema public
to authenticated;

grant usage, select
on all sequences in schema public
to authenticated;

grant all
on all tables in schema public
to service_role;

grant all
on all sequences in schema public
to service_role;

grant execute
on all functions in schema public
to authenticated, service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated;

alter default privileges for role postgres in schema public
  grant execute on functions to authenticated;

alter default privileges for role postgres in schema public
  grant all on tables to service_role;

alter default privileges for role postgres in schema public
  grant all on sequences to service_role;

alter default privileges for role postgres in schema public
  grant execute on functions to service_role;

-- Registration registry is server-only. RLS is enabled and direct client
-- privileges are removed after the generic table grants above.
revoke all on public.student_account_registry from anon, authenticated;
grant all on public.student_account_registry to service_role;

commit;

-- =====================================================================
-- BUOC TIEP THEO
-- =====================================================================
-- 1. Trien khai Edge Function bootstrap-admin.
-- 2. Tao admin dau tien bang CREATE_INITIAL_ADMIN.bat.
-- 3. Dang nhap admin va tao dot xet tai /periods.
-- 4. Them CLB tai /clubs neu can.
-- 5. Tao tai khoan reviewer/submitter tai /admin/users.
