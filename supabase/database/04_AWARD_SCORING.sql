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
