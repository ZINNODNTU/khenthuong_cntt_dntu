-- Hotfix: enforce minimum age and evidence date range.
-- Run once in Supabase SQL Editor for an existing database.
alter table public.evaluation_periods
  add column if not exists evidence_starts_on date,
  add column if not exists evidence_ends_on date;

update public.evaluation_periods
set evidence_starts_on = coalesce(evidence_starts_on, starts_at::date),
    evidence_ends_on = coalesce(evidence_ends_on, ends_at::date)
where evidence_starts_on is null or evidence_ends_on is null;

alter table public.evaluation_periods
  alter column evidence_starts_on set not null,
  alter column evidence_ends_on set not null;
alter table public.evaluation_periods drop constraint if exists evaluation_period_evidence_time_check;
alter table public.evaluation_periods add constraint evaluation_period_evidence_time_check check (evidence_ends_on >= evidence_starts_on);

create or replace function public.validate_application_period_and_submission()
returns trigger language plpgsql security definer set search_path = public as $$
declare period_record public.evaluation_periods%rowtype; needs_period_validation boolean;
begin
  needs_period_validation := tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.status = 'submitted' and old.status is distinct from 'submitted');
  if not needs_period_validation then return new; end if;
  select * into period_record from public.evaluation_periods where id = new.evaluation_period_id;
  if period_record.id is null then raise exception 'Dot xet khong ton tai.'; end if;
  if period_record.status <> 'open' or now() < period_record.starts_at or now() > period_record.ends_at then raise exception 'Dot xet hien khong nhan ho so.'; end if;
  if new.application_type = 'individual' and not period_record.allow_individual then raise exception 'Dot xet khong nhan ho so ca nhan.'; end if;
  if new.application_type = 'collective' and new.collective_type = 'branch' and not period_record.allow_branch_collective then raise exception 'Dot xet khong nhan ho so tap the Chi doan.'; end if;
  if new.application_type = 'collective' and new.collective_type = 'club' and not period_record.allow_club_collective then raise exception 'Dot xet khong nhan ho so tap the CLB.'; end if;
  if tg_op = 'UPDATE' and new.status = 'submitted' then
    if not exists (select 1 from public.evidences where application_id = new.id) then raise exception 'Ho so phai co it nhat 01 anh minh chung.'; end if;
    if new.application_type = 'individual' and not exists (select 1 from public.evidences where application_id = new.id and parent_type = 'application' and category = 'portrait') then raise exception 'Ho so ca nhan phai co anh chan dung.'; end if;
    if exists (select 1 from public.activities where application_id = new.id and length(trim(name)) < 3) then raise exception 'Co hoat dong chua nhap ten hop le.'; end if;
    if exists (select 1 from public.prior_awards where application_id = new.id and (length(trim(title)) < 3 or length(trim(decision_number)) < 1 or length(trim(issuer)) < 2)) then raise exception 'Co thanh tich khen thuong chua du thong tin.'; end if;
    if new.application_type = 'individual' then
      if new.birth_date is null then raise exception 'Ho so ca nhan phai co ngay sinh.'; end if;
      if new.birth_date > (current_date - interval '18 years')::date then raise exception 'Nguoi nop ho so phai du 18 tuoi.'; end if;
    end if;
    if exists (select 1 from public.activities where application_id = new.id and (activity_date is null or activity_date < period_record.evidence_starts_on or activity_date > period_record.evidence_ends_on)) then raise exception 'Ngay hoat dong nam ngoai khoang minh chung hop le.'; end if;
    if exists (select 1 from public.prior_awards where application_id = new.id and (issued_date is null or issued_date < period_record.evidence_starts_on or issued_date > period_record.evidence_ends_on)) then raise exception 'Ngay cap khen thuong nam ngoai khoang minh chung hop le.'; end if;
    new.submitted_at := now(); new.reviewer_id := null; new.decided_at := null;
  end if;
  return new;
end; $$;
