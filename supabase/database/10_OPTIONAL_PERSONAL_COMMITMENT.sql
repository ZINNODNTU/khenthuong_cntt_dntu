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
