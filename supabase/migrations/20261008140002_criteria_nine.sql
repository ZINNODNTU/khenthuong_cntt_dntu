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
