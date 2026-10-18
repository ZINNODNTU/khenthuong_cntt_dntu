-- Registration: verified university student email + complete student identity
-- Additive, does not modify existing users or reset data.
begin;

alter table public.profiles
  add column if not exists phone text,
  add column if not exists birth_date date,
  add column if not exists profile_completed_at timestamptz;

-- The 19 branch names are already public campus organizational metadata.
-- Permit listing active branches on the anonymous registration screen only.
drop policy if exists branches_registration_lookup on public.branches;
create policy branches_registration_lookup
on public.branches for select to anon
using (is_active = true);

-- Newly created account metadata comes from user input and may be missing;
-- accept it as a complete student profile only after strict DB validation.
create or replace function public.capture_student_registration_details()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_branch text;
  v_phone text;
  v_birth text;
  v_date date;
begin
  if lower(coalesce(new.email, '')) !~ '^[0-9]+@dntu\.edu\.vn$' then
    return new;
  end if;
  v_name := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  v_branch := upper(btrim(coalesce(new.raw_user_meta_data ->> 'branch_code', '')));
  v_phone := btrim(coalesce(new.raw_user_meta_data ->> 'phone', ''));
  v_birth := btrim(coalesce(new.raw_user_meta_data ->> 'birth_date', ''));

  if char_length(v_name) < 2 or char_length(v_name) > 150
     or v_phone !~ '^(0[0-9]{9}|\+84[0-9]{9})$'
     or v_birth !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     or not exists (select 1 from public.branches b where b.code = v_branch and b.is_active)
  then
    return new;
  end if;

  begin
    v_date := v_birth::date;
  exception when others then
    return new;
  end;
  if v_date > (current_date - interval '18 years')::date
     or v_date < date '1900-01-01' then
    return new;
  end if;

  update public.profiles p
  set full_name = v_name,
      phone = v_phone,
      birth_date = v_date,
      profile_completed_at = now(),
      updated_at = now()
  where p.id = new.id
    and p.role = 'submitter'
    and p.submission_scope = 'individual'
    and p.branch_code = v_branch;
  return new;
end;
$$;

drop trigger if exists on_student_registration_details on auth.users;
create trigger on_student_registration_details
after insert on auth.users
for each row execute function public.capture_student_registration_details();

-- A public RPC would allow client-side guessing or mass updates. Only an
-- authenticated student can use this routine to complete THEIR OWN details.
create or replace function public.complete_student_profile(
  p_full_name text,
  p_branch_code text,
  p_phone text,
  p_birth_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_confirmed timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  select lower(email), email_confirmed_at
    into v_email, v_confirmed
    from auth.users where id = (select auth.uid());

  if v_email is null or v_email !~ '^[0-9]+@dntu\.edu\.vn$'
     or v_confirmed is null then
    raise exception 'SCHOOL_EMAIL_NOT_VERIFIED' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_full_name, ''))) < 2
     or char_length(btrim(p_full_name)) > 150
     or coalesce(p_phone, '') !~ '^(0[0-9]{9}|\+84[0-9]{9})$'
     or p_birth_date is null
     or p_birth_date > (current_date - interval '18 years')::date
     or p_birth_date < date '1900-01-01'
     or not exists (
       select 1 from public.branches b
       where b.code = upper(btrim(coalesce(p_branch_code, '')))
         and b.is_active
     )
  then
    raise exception 'STUDENT_PROFILE_INVALID' using errcode = '22023';
  end if;

  update public.profiles p
     set full_name = btrim(p_full_name),
         phone = p_phone,
         birth_date = p_birth_date,
         branch_code = upper(btrim(p_branch_code)),
         profile_completed_at = now(),
         updated_at = now()
   where p.id = (select auth.uid())
     and p.role = 'submitter'
     and p.submission_scope = 'individual'
     and p.is_active = true;

  if not found then
    raise exception 'STUDENT_PROFILE_NOT_FOUND_OR_INACTIVE' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.complete_student_profile(text, text, text, date) from public, anon;
grant execute on function public.complete_student_profile(text, text, text, date) to authenticated, service_role;

-- Access gate is enforced *inside PostgreSQL* as well as in Next.js so
-- direct Supabase REST calls cannot bypass the completion screen.
create or replace function public.student_award_access_ready()
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when p.role <> 'submitter' or p.submission_scope <> 'individual' then true
      else
        p.is_active
        and u.email_confirmed_at is not null
        and p.email ~ '^[0-9]+@dntu\.edu\.vn$'
        and length(btrim(p.full_name)) >= 2
        and p.branch_code is not null
        and p.phone ~ '^(0[0-9]{9}|\+84[0-9]{9})$'
        and p.birth_date is not null
        and p.birth_date <= (current_date - interval '18 years')::date
        and p.profile_completed_at is not null
    end
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = (select auth.uid())
  ), false);
$$;

revoke all on function public.student_award_access_ready() from public, anon;
grant execute on function public.student_award_access_ready() to authenticated, service_role;

drop policy if exists applications_student_profile_required_insert on public.applications;
create policy applications_student_profile_required_insert
on public.applications as restrictive for insert to authenticated
with check (public.student_award_access_ready());

drop policy if exists applications_student_profile_required_update on public.applications;
create policy applications_student_profile_required_update
on public.applications as restrictive for update to authenticated
using (public.student_award_access_ready())
with check (public.student_award_access_ready());

commit;
