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
