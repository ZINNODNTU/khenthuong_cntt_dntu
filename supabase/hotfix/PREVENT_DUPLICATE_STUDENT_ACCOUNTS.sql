-- =====================================================================
-- HOTFIX: ONE ACCOUNT PER STUDENT ID / EMAIL
-- Run once in Supabase SQL Editor for an existing production database.
-- This does not delete users or business data.
-- =====================================================================

begin;

-- Stop immediately if profiles already contain case-insensitive duplicates.
do $$
begin
  if exists (
    select 1
    from public.profiles
    group by lower(email)
    having count(*) > 1
  ) then
    raise exception
      'PROFILE_EMAIL_DUPLICATES_FOUND: run the duplicate audit script before this hotfix';
  end if;
end;
$$;

create unique index if not exists profiles_email_lower_unique
  on public.profiles (lower(email));

create table if not exists public.student_account_registry (
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

create unique index if not exists student_account_registry_email_lower_unique
  on public.student_account_registry (lower(email));

alter table public.student_account_registry enable row level security;

insert into public.student_account_registry (
  student_id,
  email,
  auth_user_id,
  status,
  created_at,
  updated_at
)
select
  split_part(lower(profile.email), '@', 1),
  lower(profile.email),
  profile.id,
  case
    when auth_user.email_confirmed_at is not null then 'confirmed'
    else 'created'
  end,
  profile.created_at,
  now()
from public.profiles profile
join auth.users auth_user on auth_user.id = profile.id
where profile.role = 'submitter'
  and profile.submission_scope = 'individual'
  and lower(profile.email) ~ '^[0-9]+@dntu\.edu\.vn$'
on conflict (student_id) do update
set
  email = excluded.email,
  auth_user_id = excluded.auth_user_id,
  status = excluded.status,
  updated_at = now();

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

grant all on public.student_account_registry to service_role;
revoke all on public.student_account_registry from anon, authenticated;

commit;

-- Verification: both queries should return zero rows.
select lower(email) as normalized_email, count(*)
from public.profiles
group by lower(email)
having count(*) > 1;

select student_id, count(*)
from public.student_account_registry
group by student_id
having count(*) > 1;
