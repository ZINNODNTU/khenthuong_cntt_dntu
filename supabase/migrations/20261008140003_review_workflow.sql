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
