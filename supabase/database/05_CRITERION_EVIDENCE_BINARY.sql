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
