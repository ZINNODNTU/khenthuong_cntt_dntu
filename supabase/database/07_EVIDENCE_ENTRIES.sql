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