-- CNTT Award Review: BO CAI DAT CHO SUPABASE PROJECT MOI (KHONG RESET DATA)
-- CHI DANH CHO DATABASE CHUA CO SCHEMA CNTT; NEU DA CO TABLE/ENUM, DUNG TAI DAY.
-- Chay trong Supabase Dashboard > SQL Editor bang tai khoan owner sau khi kiem tra to_regclass.
-- SQL se thay doi schema public va tao auth triggers. Hay kiem tra backup truoc khi thi hanh.
-- KHONG CO 00_RESET_DATABASE.sql TRONG FILE NAY.

-- ======================= BEGIN 01_SETUP_DATABASE.sql =======================

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

-- ======================== END 01_SETUP_DATABASE.sql ========================


-- ======================= BEGIN 02_CRITERIA_9.sql =======================

-- Additive migration for the nine Doan-Hoi award criteria.
-- Safe for existing applications: preserves submitted/approved decisions and never auto-verifies.
-- Execute on staging after 01_SETUP_DATABASE.sql; back up production before applying.
begin;

do $$ begin
  create type public.criterion_status as enum ('pending', 'verified', 'rejected', 'not_applicable');
exception when duplicate_object then null;
end $$;

create table if not exists public.application_criteria (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  code text not null check (code in ('C1','C2','C3','C4','C5','C6','C7','C8','C9')),
  title text not null,
  status public.criterion_status not null default 'pending',
  value_text text,
  numeric_value numeric(8,3),
  boolean_value boolean,
  evidence_note text,
  reviewer_note text,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(application_id, code),
  constraint criterion_numeric_nonnegative check (numeric_value is null or numeric_value >= 0),
  constraint criterion_verification_consistency check
    ((status = 'verified' and verified_by is not null and verified_at is not null) or status <> 'verified')
);

create index if not exists application_criteria_application_idx on public.application_criteria(application_id);
create index if not exists application_criteria_status_idx on public.application_criteria(status);
create index if not exists application_criteria_code_idx on public.application_criteria(code);
drop trigger if exists application_criteria_touch_updated_at on public.application_criteria;
create trigger application_criteria_touch_updated_at
before update on public.application_criteria for each row execute function public.touch_updated_at();

-- Never allow a submitter to set verified_by / status directly.
-- The server uses its service-role client for initial criterion insertion.
alter table public.application_criteria enable row level security;
drop policy if exists application_criteria_select on public.application_criteria;
drop policy if exists application_criteria_insert on public.application_criteria;
drop policy if exists application_criteria_update on public.application_criteria;
create policy application_criteria_select on public.application_criteria
  for select to authenticated using (public.can_view_application(application_id));
revoke all on table public.application_criteria from anon, authenticated;
grant select on table public.application_criteria to authenticated;

-- Preserve old dossiers without fabricating academic or conduct evidence.
-- C7-C9 remain unset pending manual entry/verification for older individual dossiers.
insert into public.application_criteria (application_id, code, title, value_text, evidence_note)
select a.id, v.code, v.title, v.value_text, v.evidence_note
from public.applications a
cross join lateral (values
  ('C1', 'Mức độ đóng góp nổi bật cho công tác Đoàn – Hội', a.achievements, 'Báo cáo thành tích'),
  ('C2', 'Vai trò tổ chức, điều phối hoặc phụ trách hoạt động', a.role_contribution, 'Vai trò trong hoạt động'),
  ('C3', 'Giải thưởng, giấy khen, chứng nhận', (select count(*)::text from public.prior_awards x where x.application_id=a.id), 'Giấy khen, chứng nhận'),
  ('C4', 'Tham gia thường xuyên, tích cực', (select count(*)::text from public.activities x where x.application_id=a.id), 'Danh sách hoạt động'),
  ('C5', 'Cán bộ Đoàn – Hội hoặc CLB', coalesce(a.position, a.role_contribution), 'Chức vụ hoặc trách nhiệm'),
  ('C6', 'Sáng kiến, mô hình và lan tỏa', a.initiatives, a.impact),
  ('C7', 'Kết quả rèn luyện Tốt trở lên', null::text, 'Cần bổ sung minh chứng rèn luyện'),
  ('C8', 'GPA tích lũy từ 2,80/4,00', null::text, 'Cần bổ sung bảng điểm'),
  ('C9', 'Không bị kỷ luật từ khiển trách trở lên', null::text, 'Cần xác minh tình trạng kỷ luật')
) as v(code, title, value_text, evidence_note)
on conflict (application_id, code) do nothing;

-- Only reviewers of active accounts may verify an already-submitted dossier.
create or replace function public.verify_application_criterion(
  p_application_id uuid, p_code text, p_status public.criterion_status,
  p_reviewer_note text default null
)
returns public.application_criteria
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.application_criteria;
  v_app public.applications%rowtype;
begin
  if auth.uid() is null or public.current_role() not in ('admin', 'reviewer') then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select * into v_app from public.applications where id = p_application_id for update;
  if not found or v_app.status not in ('submitted', 'review') then
    raise exception 'APPLICATION_NOT_REVIEWABLE';
  end if;
  if char_length(coalesce(p_reviewer_note, '')) > 3000 then
    raise exception 'REVIEW_NOTE_TOO_LONG';
  end if;
  if v_app.application_type = 'individual'
     and p_code in ('C7','C8','C9') and p_status = 'not_applicable' then
    raise exception 'REQUIRED_CRITERION_CANNOT_BE_NA';
  end if;

  select * into v_row from public.application_criteria
  where application_id = p_application_id and code = p_code for update;
  if not found then raise exception 'CRITERION_NOT_FOUND'; end if;

  if p_status = 'verified' and v_app.application_type = 'individual' then
    if p_code = 'C7' and coalesce(v_row.value_text, '') not in ('Tốt', 'Xuất sắc') then
      raise exception 'C7_CONDUCT_NOT_ELIGIBLE';
    end if;
    if p_code = 'C8' and (v_row.numeric_value is null or v_row.numeric_value < 2.8 or v_row.numeric_value > 4) then
      raise exception 'C8_GPA_NOT_ELIGIBLE';
    end if;
    if p_code = 'C9' and v_row.boolean_value is distinct from true then
      raise exception 'C9_DISCIPLINE_NOT_ELIGIBLE';
    end if;
  end if;

  update public.application_criteria
    set status = p_status,
        reviewer_note = nullif(btrim(coalesce(p_reviewer_note, '')), ''),
        verified_by = case when p_status = 'verified' then auth.uid() else null end,
        verified_at = case when p_status = 'verified' then now() else null end,
        updated_at = now()
  where id = v_row.id returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.verify_application_criterion(uuid, text, public.criterion_status, text) from public, anon;
grant execute on function public.verify_application_criterion(uuid, text, public.criterion_status, text) to authenticated;

-- Database invariant: even a direct Supabase UPDATE cannot mark a dossier passed
-- unless all nine criteria exist and have been explicitly resolved by a reviewer.
create or replace function public.guard_passed_application_criteria()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'passed' and old.status is distinct from 'passed' then
    if (select count(*) from public.application_criteria where application_id = new.id) <> 9 then
      raise exception 'CRITERIA_INCOMPLETE';
    end if;

    if exists (
      select 1 from public.application_criteria c
      where c.application_id = new.id
        and (
          c.status not in ('verified','not_applicable')
          or (new.application_type = 'individual' and c.code in ('C7','C8','C9') and c.status <> 'verified')
        )
    ) then
      raise exception 'CRITERIA_UNVERIFIED';
    end if;

    if new.application_type = 'individual' and (
      not exists (select 1 from public.application_criteria c where c.application_id = new.id and c.code='C7' and c.value_text in ('Tốt','Xuất sắc'))
      or not exists (select 1 from public.application_criteria c where c.application_id = new.id and c.code='C8' and c.numeric_value between 2.8 and 4)
      or not exists (select 1 from public.application_criteria c where c.application_id = new.id and c.code='C9' and c.boolean_value is true)
    ) then
      raise exception 'REQUIRED_CRITERIA_NOT_ELIGIBLE';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists d_guard_passed_application_criteria on public.applications;
create trigger d_guard_passed_application_criteria
  before update of status on public.applications for each row
  execute function public.guard_passed_application_criteria();

-- A revised dossier must be reassessed. No previous verification survives re-submission.
create or replace function public.reset_application_criteria_on_resubmit()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.status = 'revision' and new.status = 'submitted' then
    update public.application_criteria
      set status = 'pending', reviewer_note = null, verified_by = null,
          verified_at = null, updated_at = now()
      where application_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists reset_application_criteria_on_resubmit on public.applications;
create trigger reset_application_criteria_on_resubmit
  after update of status on public.applications for each row
  execute function public.reset_application_criteria_on_resubmit();

commit;

-- ======================== END 02_CRITERIA_9.sql ========================


-- ======================= BEGIN 03_REVIEW_WORKFLOW.sql =======================

-- Award review workflow hardening. Execute AFTER 02_CRITERIA_9.sql.
-- Additive, idempotent, no resetting historical decisions or score results.
begin;

alter table public.review_history
  add column if not exists criteria_snapshot jsonb not null default '[]'::jsonb;

create table if not exists public.criterion_review_history (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications(id) on delete cascade,
  code text not null check (code in ('C1','C2','C3','C4','C5','C6','C7','C8','C9')),
  actor_id uuid references public.profiles(id) on delete set null,
  previous_status public.criterion_status,
  next_status public.criterion_status not null,
  reviewer_note text,
  changed_at timestamptz not null default now()
);

create index if not exists criterion_review_history_application_idx
  on public.criterion_review_history(application_id, changed_at desc);

alter table public.criterion_review_history enable row level security;
drop policy if exists criterion_review_history_staff_select on public.criterion_review_history;
create policy criterion_review_history_staff_select on public.criterion_review_history
  for select to authenticated
  using (
    public.current_role() in ('admin','reviewer')
    and public.can_view_application(application_id)
  );
revoke all on public.criterion_review_history from public, anon, authenticated;
grant select on public.criterion_review_history to authenticated;

create or replace function public.audit_criterion_status_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.status is distinct from new.status
     or old.reviewer_note is distinct from new.reviewer_note
     or old.verified_by is distinct from new.verified_by
  then
    insert into public.criterion_review_history (
      application_id, code, actor_id, previous_status, next_status, reviewer_note
    ) values (
      new.application_id, new.code, auth.uid(), old.status, new.status, new.reviewer_note
    );
  end if;
  return new;
end;
$$;
drop trigger if exists audit_criterion_status_change on public.application_criteria;
create trigger audit_criterion_status_change
  after update on public.application_criteria
  for each row execute function public.audit_criterion_status_change();

-- Prevent a service-role update from silently editing a submitted or concluded dossier.
-- The verifier RPC can only update reviewer-controlled fields on an assigned review.
create or replace function public.guard_criterion_snapshot()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_status public.application_status;
  v_reviewer uuid;
begin
  select status, reviewer_id into v_status, v_reviewer
  from public.applications where id = new.application_id for update;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;

  if tg_op = 'INSERT' then
    if v_status not in ('draft','revision')
       or new.status <> 'pending'
       or new.verified_by is not null or new.verified_at is not null
    then
      raise exception 'CRITERION_INSERT_NOT_ALLOWED';
    end if;
    return new;
  end if;

  if old.application_id is distinct from new.application_id
     or old.code is distinct from new.code
     or old.title is distinct from new.title
     or old.id is distinct from new.id
  then
    raise exception 'CRITERION_IDENTITY_IMMUTABLE';
  end if;

  if v_status in ('passed', 'failed') then
    raise exception 'CONCLUDED_CRITERIA_IMMUTABLE';
  end if;

  if v_status in ('submitted','review') then
    if old.value_text is distinct from new.value_text
       or old.numeric_value is distinct from new.numeric_value
       or old.boolean_value is distinct from new.boolean_value
       or old.evidence_note is distinct from new.evidence_note
    then
      raise exception 'SUBMITTED_EVIDENCE_IMMUTABLE';
    end if;

    -- Re-submission must clear all previous verifications.
    if public.current_role() = 'submitter' then
      if new.status <> 'pending' or new.verified_by is not null
         or new.verified_at is not null or new.reviewer_note is not null
      then raise exception 'ONLY_CRITERION_RESET_ALLOWED'; end if;
    elsif public.current_role() not in ('admin','reviewer')
       or (public.current_role() = 'reviewer' and v_reviewer is distinct from auth.uid())
    then
      raise exception 'CRITERION_REVIEW_NOT_ASSIGNED';
    end if;
    return new;
  end if;

  -- Server-side updates to drafts/revisions may only store unverified declarations.
  if new.status <> 'pending' or new.verified_by is not null
     or new.verified_at is not null or new.reviewer_note is not null
  then
    raise exception 'DRAFT_CRITERION_NOT_PENDING';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_criterion_snapshot on public.application_criteria;
create trigger guard_criterion_snapshot
  before insert or update on public.application_criteria
  for each row execute function public.guard_criterion_snapshot();

-- Every scoring/verification operation must be attached to its assigned reviewer.
-- Revoke direct execution of the legacy verifier, exposing only this assignment-aware RPC.
create or replace function public.review_assigned_criterion(
  p_application_id uuid, p_code text, p_status public.criterion_status,
  p_reviewer_note text default null
)
returns public.application_criteria
language plpgsql security definer set search_path = public
as $$
declare
  v_application public.applications%rowtype;
begin
  if auth.uid() is null or public.current_role() not in ('admin','reviewer') then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select * into v_application from public.applications where id=p_application_id for update;
  if not found or v_application.status not in ('submitted','review') then
    raise exception 'APPLICATION_NOT_REVIEWABLE';
  end if;
  if public.current_role()='reviewer'
     and v_application.reviewer_id is distinct from auth.uid() then
    raise exception 'APPLICATION_NOT_ASSIGNED';
  end if;
  if p_status in ('rejected','not_applicable')
     and length(btrim(coalesce(p_reviewer_note,''))) < 5 then
    raise exception 'REVIEW_REASON_REQUIRED';
  end if;
  return public.verify_application_criterion(p_application_id,p_code,p_status,p_reviewer_note);
end;
$$;
revoke all on function public.verify_application_criterion(uuid,text,public.criterion_status,text)
  from public, anon, authenticated;
revoke all on function public.review_assigned_criterion(uuid,text,public.criterion_status,text)
  from public, anon, authenticated;
grant execute on function public.review_assigned_criterion(uuid,text,public.criterion_status,text)
  to authenticated;

-- Only trusted review RPCs may alter reviewer assignment or formal decisions.
-- Unlike a custom GUC, a transaction-bound permit row cannot be forged via
-- Supabase REST by authenticated users (all table privileges are revoked).
create table if not exists public.review_action_permits (
  application_id uuid not null references public.applications(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id bigint not null,
  primary key(application_id, actor_id, transaction_id)
);
alter table public.review_action_permits enable row level security;
revoke all on public.review_action_permits from public, anon, authenticated;

create or replace function public.guard_review_change_to_rpc()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and public.current_role() in ('admin','reviewer') and (
    old.status is distinct from new.status
    or old.reviewer_id is distinct from new.reviewer_id
    or old.review_comment is distinct from new.review_comment
    or old.decided_at is distinct from new.decided_at
  ) then
    if not exists (
      select 1 from public.review_action_permits
      where application_id=new.id and actor_id=auth.uid()
        and transaction_id=txid_current()
    ) then
      raise exception 'REVIEW_RPC_REQUIRED';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists e_guard_review_change_to_rpc on public.applications;
create trigger e_guard_review_change_to_rpc
  before update on public.applications for each row
  execute function public.guard_review_change_to_rpc();

-- Review history must be immutable from REST; only the security-definer RPC writes it.
revoke insert, update, delete on public.review_history from anon, authenticated;

-- A reviewer must explicitly take responsibility for the dossier before verifying.
create or replace function public.assign_application_review(p_application_id uuid, p_action text)
returns public.applications
language plpgsql security definer set search_path = public
as $$
declare
  v_app public.applications%rowtype;
  v_actor uuid := auth.uid();
  v_role public.user_role := public.current_role();
begin
  if v_actor is null or v_role not in ('admin','reviewer') then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select * into v_app from public.applications where id=p_application_id for update;
  if not found or v_app.status not in ('submitted','review') then
    raise exception 'APPLICATION_NOT_REVIEWABLE';
  end if;

  if p_action='claim' then
    if v_app.reviewer_id is not null and v_app.reviewer_id <> v_actor and v_role <> 'admin' then
      raise exception 'ALREADY_ASSIGNED';
    end if;
    if v_app.reviewer_id is distinct from v_actor or v_app.status='submitted' then
      insert into public.review_action_permits(application_id,actor_id,transaction_id)
        values (p_application_id,v_actor,txid_current()) on conflict do nothing;
      update public.applications set reviewer_id=v_actor, status='review'
        where id=p_application_id returning * into v_app;
      delete from public.review_action_permits where application_id=p_application_id
        and actor_id=v_actor and transaction_id=txid_current();
      insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
        values (v_actor,'application.review.claim','application',p_application_id,'{}'::jsonb);
    end if;
  elsif p_action='release' then
    if v_app.reviewer_id is distinct from v_actor and v_role <> 'admin' then
      raise exception 'NOT_ASSIGNED_TO_YOU';
    end if;
    insert into public.review_action_permits(application_id,actor_id,transaction_id)
      values (p_application_id,v_actor,txid_current()) on conflict do nothing;
    update public.applications set reviewer_id=null where id=p_application_id
      returning * into v_app;
    delete from public.review_action_permits where application_id=p_application_id
      and actor_id=v_actor and transaction_id=txid_current();
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
      values (v_actor,'application.review.release','application',p_application_id,'{}'::jsonb);
  else
    raise exception 'INVALID_ACTION';
  end if;
  return v_app;
end;
$$;
revoke all on function public.assign_application_review(uuid,text) from public, anon, authenticated;
grant execute on function public.assign_application_review(uuid,text) to authenticated;

-- Atomic result: locks application, revalidates criteria, records decision and
-- criterion snapshot in the same database transaction. No half-written history.
create or replace function public.record_application_decision(
  p_application_id uuid,
  p_decision public.review_decision,
  p_comment text default ''
)
returns public.applications
language plpgsql security definer set search_path = public
as $$
declare
  v_app public.applications%rowtype;
  v_actor uuid := auth.uid();
  v_role public.user_role := public.current_role();
  v_comment text := btrim(coalesce(p_comment, ''));
  v_snapshot jsonb;
begin
  if v_actor is null or v_role not in ('admin','reviewer') then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select * into v_app from public.applications where id=p_application_id for update;
  if not found or v_app.status not in ('submitted','review') then
    raise exception 'APPLICATION_NOT_REVIEWABLE';
  end if;
  if v_role='reviewer' and v_app.reviewer_id is distinct from v_actor then
    raise exception 'APPLICATION_NOT_ASSIGNED';
  end if;
  if length(v_comment)>5000 then raise exception 'REVIEW_COMMENT_TOO_LONG'; end if;
  if p_decision in ('failed','revision') and length(v_comment)<5 then
    raise exception 'REVIEW_REASON_REQUIRED';
  end if;

  if p_decision='passed' then
    if (select count(*) from public.application_criteria c
        where c.application_id=p_application_id)<>9 then
      raise exception 'CRITERIA_INCOMPLETE';
    end if;
    if exists (
      select 1 from public.application_criteria c where c.application_id=p_application_id
        and (
          c.status not in ('verified','not_applicable')
          or (v_app.application_type='individual' and c.code in ('C7','C8','C9') and c.status<>'verified')
        )
    ) then raise exception 'CRITERIA_UNVERIFIED'; end if;
    if v_app.application_type='individual' and (
      not exists (select 1 from public.application_criteria c where c.application_id=p_application_id
                  and c.code='C7' and c.value_text in ('Tốt','Xuất sắc') and c.status='verified')
      or not exists (select 1 from public.application_criteria c where c.application_id=p_application_id
                     and c.code='C8' and c.numeric_value between 2.8 and 4 and c.status='verified')
      or not exists (select 1 from public.application_criteria c where c.application_id=p_application_id
                     and c.code='C9' and c.boolean_value is true and c.status='verified')
    ) then raise exception 'REQUIRED_CRITERIA_NOT_ELIGIBLE'; end if;
  end if;

  select coalesce(jsonb_agg(
     jsonb_build_object('code',code,'title',title,'status',status,
                        'value_text',value_text,'numeric_value',numeric_value,
                        'boolean_value',boolean_value,'reviewer_note',reviewer_note,
                        'verified_by',verified_by,'verified_at',verified_at)
     order by code
   ), '[]'::jsonb) into v_snapshot
  from public.application_criteria where application_id=p_application_id;

  insert into public.review_action_permits(application_id,actor_id,transaction_id)
    values (p_application_id,v_actor,txid_current()) on conflict do nothing;
  update public.applications
    set status=p_decision::text::public.application_status,
        reviewer_id=v_actor,
        review_comment=nullif(v_comment,''),
        decided_at=now()
  where id=p_application_id returning * into v_app;
  delete from public.review_action_permits where application_id=p_application_id
    and actor_id=v_actor and transaction_id=txid_current();

  insert into public.review_history(application_id,reviewer_id,decision,comment,criteria_snapshot)
  values (p_application_id,v_actor,p_decision,nullif(v_comment,''),v_snapshot);

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values (v_actor,'application.decision','application',p_application_id,
          jsonb_build_object('decision',p_decision,'criteria_count',jsonb_array_length(v_snapshot)));

  return v_app;
end;
$$;
revoke all on function public.record_application_decision(uuid,public.review_decision,text)
  from public, anon, authenticated;
grant execute on function public.record_application_decision(uuid,public.review_decision,text)
  to authenticated;

commit;

-- ======================== END 03_REVIEW_WORKFLOW.sql ========================


-- ======================= BEGIN 04_AWARD_SCORING.sql =======================

-- 04: Manual scoring for award review. Apply AFTER 02_CRITERIA_9.sql and 03_REVIEW_WORKFLOW.sql.
-- No institution-specific point weights or award thresholds are supplied by this migration.
-- Back up and rehearse on staging. Never run RESET on a live database.
begin;

create or replace function public.is_valid_award_weights(p_weights jsonb)
returns boolean language plpgsql immutable set search_path=public as $$
declare k text; total numeric := 0; n int;
begin
  if jsonb_typeof(p_weights) <> 'object' then return false; end if;
  select count(*) into n from jsonb_object_keys(p_weights);
  if n <> 6 then return false; end if;
  foreach k in array array['C1','C2','C3','C4','C5','C6'] loop
    if jsonb_typeof(p_weights -> k) <> 'number' then return false; end if;
    if (p_weights ->> k)::numeric <= 0 or (p_weights ->> k)::numeric > 100
       or (p_weights ->> k)::numeric <> round((p_weights ->> k)::numeric,2)
      then return false; end if;
    total := total + (p_weights ->> k)::numeric;
  end loop;
  return total = 100;
exception when others then return false;
end;
$$;

create table if not exists public.award_rubrics (
  id uuid primary key default gen_random_uuid(),
  evaluation_period_id uuid not null references public.evaluation_periods(id) on delete cascade,
  application_type public.application_type not null,
  weights jsonb not null,
  min_percentage numeric(5,2) not null check (min_percentage between 0 and 100),
  instructions text not null default '' check (length(instructions) <= 3000),
  configured_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint award_rubric_weights_valid check (public.is_valid_award_weights(weights)),
  unique(evaluation_period_id, application_type)
);
create index if not exists award_rubrics_period_idx on public.award_rubrics(evaluation_period_id);
alter table public.award_rubrics enable row level security;
drop policy if exists award_rubrics_staff_read on public.award_rubrics;
create policy award_rubrics_staff_read on public.award_rubrics for select to authenticated
  using (public.current_role() in ('admin','reviewer'));
revoke all on public.award_rubrics from public, anon, authenticated;
grant select on public.award_rubrics to authenticated;

create table if not exists public.award_score_entries (
  application_id uuid not null references public.applications(id) on delete cascade,
  code text not null check (code in ('C1','C2','C3','C4','C5','C6')),
  rubric_id uuid not null references public.award_rubrics(id) on delete restrict,
  points numeric(5,2) not null check (points between 0 and 100),
  note text not null check (length(btrim(note)) between 5 and 3000),
  scored_by uuid not null references public.profiles(id),
  scored_at timestamptz not null default now(),
  primary key(application_id,code),
  foreign key(application_id,code) references public.application_criteria(application_id,code)
);
create index if not exists award_scores_rubric_idx on public.award_score_entries(rubric_id);
alter table public.award_score_entries enable row level security;
drop policy if exists award_scores_visible on public.award_score_entries;
create policy award_scores_visible on public.award_score_entries for select to authenticated
  using (exists (
    select 1 from public.applications a where a.id=application_id
      and (public.current_role() in ('admin','reviewer') or (
        a.created_by=auth.uid() and a.status in ('passed','failed')
      ))
  ));
revoke all on public.award_score_entries from public, anon, authenticated;
grant select on public.award_score_entries to authenticated;

create table if not exists public.award_score_history (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications(id) on delete cascade,
  code text not null,
  actor_id uuid references public.profiles(id),
  previous_points numeric(5,2),
  next_points numeric(5,2),
  previous_note text,
  next_note text,
  changed_at timestamptz not null default now()
);
create index if not exists award_score_history_app_idx on public.award_score_history(application_id,changed_at desc);
alter table public.award_score_history enable row level security;
drop policy if exists award_score_history_staff_read on public.award_score_history;
create policy award_score_history_staff_read on public.award_score_history for select to authenticated
  using (public.current_role() in ('admin','reviewer') and public.can_view_application(application_id));
revoke all on public.award_score_history from public, anon, authenticated;
grant select on public.award_score_history to authenticated;

create or replace function public.record_award_score_audit()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='DELETE' then
    insert into public.award_score_history(application_id,code,actor_id,previous_points,previous_note)
    values(old.application_id,old.code,auth.uid(),old.points,old.note);
    return old;
  end if;
  if tg_op='INSERT' or (old.points,old.note) is distinct from (new.points,new.note) then
    insert into public.award_score_history(application_id,code,actor_id,previous_points,next_points,previous_note,next_note)
    values(new.application_id,new.code,auth.uid(),
      case when tg_op='INSERT' then null else old.points end,
      new.points,case when tg_op='INSERT' then null else old.note end,new.note);
  end if;
  return new;
end;
$$;
drop trigger if exists audit_award_score_changes on public.award_score_entries;
create trigger audit_award_score_changes after insert or update or delete on public.award_score_entries
for each row execute function public.record_award_score_audit();

-- Freeze a configured rubric as soon as scoring begins or a decision is recorded.
create or replace function public.guard_award_rubric_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_period uuid; v_type public.application_type;
begin
  if tg_op='DELETE' then
    raise exception 'RUBRIC_DELETE_DISABLED';
  end if;
  if tg_op='UPDATE' and
    (new.id is distinct from old.id or new.evaluation_period_id is distinct from old.evaluation_period_id
     or new.application_type is distinct from old.application_type)
  then raise exception 'RUBRIC_IDENTITY_IMMUTABLE'; end if;
  v_period := new.evaluation_period_id;
  v_type := new.application_type;
  if exists (
    select 1 from public.award_score_entries s where s.rubric_id=new.id
  ) or exists (
    select 1 from public.award_score_history h join public.applications a
      on a.id=h.application_id
    where a.evaluation_period_id=v_period and a.application_type=v_type
  ) or exists (
    select 1 from public.applications a where a.evaluation_period_id=v_period
      and a.application_type=v_type and a.status in ('passed','failed')
  ) then raise exception 'RUBRIC_LOCKED'; end if;
  return new;
end;
$$;
drop trigger if exists guard_award_rubric_change on public.award_rubrics;
create trigger guard_award_rubric_change before insert or update or delete
on public.award_rubrics for each row execute function public.guard_award_rubric_change();

create or replace function public.configure_award_rubric(
  p_period_id uuid,p_application_type public.application_type,
  p_weights jsonb,p_min_percentage numeric,p_instructions text default ''
)
returns public.award_rubrics language plpgsql security definer set search_path=public as $$
declare v_row public.award_rubrics;
begin
  if auth.uid() is null or public.current_role() <> 'admin' then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if not exists (select 1 from public.evaluation_periods where id=p_period_id) then
    raise exception 'PERIOD_NOT_FOUND';
  end if;
  if not public.is_valid_award_weights(p_weights)
    or p_min_percentage is null or p_min_percentage < 0 or p_min_percentage > 100
    or p_min_percentage <> round(p_min_percentage,2)
    or length(coalesce(p_instructions,'')) > 3000
  then raise exception 'INVALID_RUBRIC'; end if;
  insert into public.award_rubrics(evaluation_period_id,application_type,weights,min_percentage,instructions,configured_by)
  values(p_period_id,p_application_type,p_weights,p_min_percentage,coalesce(p_instructions,''),auth.uid())
  on conflict(evaluation_period_id,application_type) do update
  set weights=excluded.weights,min_percentage=excluded.min_percentage,
      instructions=excluded.instructions,configured_by=auth.uid(),updated_at=now()
  returning * into v_row;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'rubric.configure','award_rubric',v_row.id,
      jsonb_build_object('period_id',p_period_id,'application_type',p_application_type,
        'weights',p_weights,'min_percentage',p_min_percentage));
  return v_row;
end;
$$;
revoke all on function public.configure_award_rubric(uuid,public.application_type,jsonb,numeric,text)
  from public,anon,authenticated;
grant execute on function public.configure_award_rubric(uuid,public.application_type,jsonb,numeric,text)
  to authenticated;

create or replace function public.score_award_criterion(
  p_application_id uuid,p_code text,p_points numeric,p_note text
)
returns public.award_score_entries language plpgsql security definer set search_path=public as $$
declare v_app public.applications%rowtype; v_rubric public.award_rubrics%rowtype;
        v_result public.award_score_entries;
begin
  if auth.uid() is null or public.current_role() not in ('admin','reviewer') then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select * into v_app from public.applications where id=p_application_id for update;
  if not found or v_app.status not in ('submitted','review') then
    raise exception 'APPLICATION_NOT_REVIEWABLE';
  end if;
  if public.current_role()='reviewer' and v_app.reviewer_id is distinct from auth.uid() then
    raise exception 'APPLICATION_NOT_ASSIGNED';
  end if;
  select * into v_rubric from public.award_rubrics
    where evaluation_period_id=v_app.evaluation_period_id
      and application_type=v_app.application_type for update;
  if not found then raise exception 'RUBRIC_NOT_CONFIGURED'; end if;
  if p_code not in ('C1','C2','C3','C4','C5','C6') then raise exception 'INVALID_SCORE_CRITERION'; end if;
  if not exists(select 1 from public.application_criteria
    where application_id=p_application_id and code=p_code and status='verified')
  then raise exception 'CRITERION_NOT_VERIFIED'; end if;
  if p_points is null or p_points < 0 or p_points > (v_rubric.weights ->> p_code)::numeric
    or p_points <> round(p_points,2) then
    raise exception 'SCORE_OUT_OF_RANGE';
  end if;
  if length(btrim(coalesce(p_note,''))) < 5 or length(p_note)>3000 then
    raise exception 'SCORE_REASON_REQUIRED';
  end if;
  insert into public.award_score_entries(application_id,code,rubric_id,points,note,scored_by)
  values(p_application_id,p_code,v_rubric.id,p_points,btrim(p_note),auth.uid())
  on conflict(application_id,code) do update
  set rubric_id=excluded.rubric_id,points=excluded.points,note=excluded.note,
      scored_by=excluded.scored_by,scored_at=now()
  returning * into v_result;
  return v_result;
end;
$$;
revoke all on function public.score_award_criterion(uuid,text,numeric,text) from public,anon,authenticated;
grant execute on function public.score_award_criterion(uuid,text,numeric,text) to authenticated;

-- Any change to a verified status revokes its previously entered score.
create or replace function public.invalidate_award_score()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.status is distinct from new.status and new.status <> 'verified' then
    delete from public.award_score_entries where application_id=new.application_id and code=new.code;
  end if;
  return new;
end;
$$;
drop trigger if exists invalidate_award_score on public.application_criteria;
create trigger invalidate_award_score after update of status on public.application_criteria
  for each row execute function public.invalidate_award_score();

-- On re-submission, marks from the prior round must never be reused.
create or replace function public.clear_award_scores_on_resubmit()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.status='revision' and new.status='submitted' then
    delete from public.award_score_entries where application_id=new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists clear_award_scores_on_resubmit on public.applications;
create trigger clear_award_scores_on_resubmit after update of status on public.applications
  for each row execute function public.clear_award_scores_on_resubmit();

-- Both the RPC and any direct status transition must satisfy the numeric rubric.
create or replace function public.guard_award_score_decision()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_rubric public.award_rubrics%rowtype; v_awarded numeric; v_possible numeric; v_missing int;
begin
  if new.status='passed' and old.status is distinct from 'passed' then
    select * into v_rubric from public.award_rubrics
      where evaluation_period_id=new.evaluation_period_id and application_type=new.application_type;
    if not found then raise exception 'RUBRIC_NOT_CONFIGURED'; end if;
    select
      coalesce(sum(coalesce(s.points,0)),0),
      coalesce(sum((v_rubric.weights->>c.code)::numeric),0),
      count(*) filter(where s.application_id is null)
    into v_awarded,v_possible,v_missing
    from public.application_criteria c
    left join public.award_score_entries s
      on s.application_id=c.application_id and s.code=c.code and s.rubric_id=v_rubric.id
    where c.application_id=new.id and c.code in ('C1','C2','C3','C4','C5','C6') and c.status='verified';
    if v_possible=0 or v_missing<>0 then raise exception 'SCORING_INCOMPLETE'; end if;
    if v_awarded * 100 < v_possible * v_rubric.min_percentage then
      raise exception 'SCORING_BELOW_THRESHOLD';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists f_guard_award_score_decision on public.applications;
create trigger f_guard_award_score_decision before update of status on public.applications
  for each row execute function public.guard_award_score_decision();

alter table public.review_history
  add column if not exists score_total numeric(6,2),
  add column if not exists score_possible numeric(6,2),
  add column if not exists score_percentage numeric(6,2),
  add column if not exists score_threshold numeric(5,2),
  add column if not exists rubric_snapshot jsonb;

-- Save an immutable snapshot in the decision history, even for failed/revision outcomes.
create or replace function public.snapshot_award_score_decision()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_rubric public.award_rubrics%rowtype; v_type public.application_type;
        v_period uuid; v_total numeric; v_possible numeric;
begin
  select application_type,evaluation_period_id into v_type,v_period from public.applications where id=new.application_id;
  select * into v_rubric from public.award_rubrics
    where evaluation_period_id=v_period and application_type=v_type;
  if not found then return new; end if;
  select coalesce(sum(coalesce(s.points,0)),0),
    coalesce(sum((v_rubric.weights->>c.code)::numeric),0)
  into v_total,v_possible
  from public.application_criteria c
  left join public.award_score_entries s
    on s.application_id=c.application_id and s.code=c.code and s.rubric_id=v_rubric.id
  where c.application_id=new.application_id
    and c.code in ('C1','C2','C3','C4','C5','C6') and c.status='verified';
  new.score_total:=v_total;
  new.score_possible:=v_possible;
  new.score_percentage:=case when v_possible>0 then round(v_total*100/v_possible,2) else null end;
  new.score_threshold:=v_rubric.min_percentage;
  new.rubric_snapshot:=jsonb_build_object('weights',v_rubric.weights,
    'instructions',v_rubric.instructions,'rubric_id',v_rubric.id);
  select coalesce(jsonb_agg(
    x.item || jsonb_build_object('points_awarded',s.points,
      'points_possible',case when x.item->>'code' in ('C1','C2','C3','C4','C5','C6')
        then (v_rubric.weights->>(x.item->>'code'))::numeric else null end,
      'score_note',s.note) order by x.item->>'code'),'[]'::jsonb)
    into new.criteria_snapshot
  from jsonb_array_elements(new.criteria_snapshot) as x(item)
  left join public.award_score_entries s
    on s.application_id=new.application_id and s.code=x.item->>'code';
  return new;
end;
$$;
drop trigger if exists a_snapshot_award_score_decision on public.review_history;
create trigger a_snapshot_award_score_decision before insert on public.review_history
  for each row execute function public.snapshot_award_score_decision();
commit;

-- ======================== END 04_AWARD_SCORING.sql ========================


-- ======================= BEGIN 05_CRITERION_EVIDENCE_BINARY.sql =======================

-- Evidence-only awards: C1-C6 multi-file, C7-C9 single-file; binary review.
-- Apply AFTER 20261008140004_award_scoring.sql.
begin;

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

commit;

-- ======================== END 05_CRITERION_EVIDENCE_BINARY.sql ========================


-- ======================= BEGIN 06_SECURITY_HARDENING.sql =======================

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

-- ======================== END 06_SECURITY_HARDENING.sql ========================


-- ======================= BEGIN 07_EVIDENCE_ENTRIES.sql =======================

-- Evidence statement groups: one declared achievement/activity can contain several attachments.
begin;

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

commit;

-- ======================== END 07_EVIDENCE_ENTRIES.sql ========================


-- ======================= BEGIN 08_COLLECTIVE_CRITERIA_T.sql =======================

-- Separate physical T1–T6 collective criteria from C1–C9 individual criteria.
-- ADDITIVE: all historical C-coded collective records, decisions, and evidence remain unchanged.
-- Deploy after 20261009100000_evidence_entries.sql. Back up DB; test on staging first.
begin;

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

commit;

-- ======================== END 08_COLLECTIVE_CRITERIA_T.sql ========================


-- ======================= BEGIN 09_EVIDENCE_CONTENT_INTEGRITY.sql =======================

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

-- ======================== END 09_EVIDENCE_CONTENT_INTEGRITY.sql ========================


-- ======================= BEGIN 10_OPTIONAL_PERSONAL_COMMITMENT.sql =======================

-- Individual awards: C1-C6 are self-selected, C7-C8 need evidence, C9 uses a checked declaration.
-- Apply only after taking a DB backup. Existing applications and historic evidence stay untouched.
begin;

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

  if p_require_verified and v_type='individual' then
    if not exists (select 1 from public.evidences where application_id=p_id
      and parent_type='application' and category in
      ('criterion_c1','criterion_c2','criterion_c3','criterion_c4','criterion_c5','criterion_c6')) then
      raise exception 'PERSONAL_ACHIEVEMENT_REQUIRED';
    end if;
    if exists (select 1 from public.application_criteria c where c.application_id=p_id
      and (c.code in ('C7','C8','C9') or (c.code in ('C1','C2','C3','C4','C5','C6')
        and exists (select 1 from public.evidences e where e.application_id=p_id
          and e.parent_type='application' and e.category='criterion_'||lower(c.code))))
      and c.status<>'verified') then
      raise exception 'CRITERIA_UNVERIFIED';
    end if;
    if not exists (select 1 from public.application_criteria where application_id=p_id
      and code='C9' and boolean_value is true) then
      raise exception 'DISCIPLINARY_COMMITMENT_REQUIRED';
    end if;
  elsif p_require_verified and exists (
    select 1 from public.application_criteria where application_id=p_id
    and code=any(v_needed) and status<>'verified'
  ) then
    raise exception 'CRITERIA_UNVERIFIED';
  end if;
end; $$;

create or replace function public.guard_criterion_evidence_submission()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_code text; v_count integer; v_needed text[];
begin
  if new.status='submitted' and old.status is distinct from new.status then
    perform public.assert_award_criteria_complete(new.id,false);
    if new.application_type='individual' then
      if not exists (select 1 from public.evidences where application_id=new.id
        and parent_type='application' and category in
        ('criterion_c1','criterion_c2','criterion_c3','criterion_c4','criterion_c5','criterion_c6')) then
        raise exception 'PERSONAL_ACHIEVEMENT_REQUIRED';
      end if;
      foreach v_code in array array['C7','C8'] loop
        select count(*) into v_count from public.evidences
          where application_id=new.id and parent_type='application'
          and category='criterion_'||lower(v_code);
        if v_count=0 then raise exception 'CRITERION_EVIDENCE_MISSING: %',v_code; end if;
        if v_count<>1 then raise exception 'CRITERION_EVIDENCE_LIMIT'; end if;
      end loop;
      if not exists (select 1 from public.application_criteria
        where application_id=new.id and code='C9' and boolean_value is true) then
        raise exception 'DISCIPLINARY_COMMITMENT_REQUIRED';
      end if;
    else
      v_needed:=public.award_applicable_codes(new.id);
      foreach v_code in array v_needed loop
        select count(*) into v_count from public.evidences
          where application_id=new.id and parent_type='application'
          and category='criterion_'||lower(v_code);
        if v_count=0 then raise exception 'CRITERION_EVIDENCE_MISSING: %',v_code; end if;
        if v_code in ('C7','C8','C9') and v_count<>1 then raise exception 'CRITERION_EVIDENCE_LIMIT'; end if;
      end loop;
    end if;
  end if;
  return new;
end; $$;

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
  if p_status='verified' then
    if v_app.application_type='individual' and p_code='C9' then
      if v_row.boolean_value is distinct from true then
        raise exception 'DISCIPLINARY_COMMITMENT_REQUIRED';
      end if;
    elsif not exists (select 1 from public.evidences
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
revoke all on function public.verify_application_criterion(uuid,text,public.criterion_status,text) from public,anon,authenticated;
revoke all on function public.assert_award_criteria_complete(uuid,boolean) from public,anon,authenticated;
grant execute on function public.assert_award_criteria_complete(uuid,boolean) to service_role;
commit;

-- ======================== END 10_OPTIONAL_PERSONAL_COMMITMENT.sql ========================
