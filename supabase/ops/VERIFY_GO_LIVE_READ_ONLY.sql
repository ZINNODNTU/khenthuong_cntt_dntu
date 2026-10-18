-- Read-only deployment audit. Run in Supabase SQL Editor with an authorized owner.
-- SAFE: no INSERT, UPDATE, DELETE, DROP, GRANT or ALTER operations.
-- Does not read or display applicants, users, credentials or evidence file IDs.
-- Every row must report PASS before go-live; absence is a blocker.
with checks as (
  select '01 evidence_entries table' as item,
         to_regclass('public.evidence_entries') is not null as ready
  union all
  select '02 storage_cleanup_queue table',
         to_regclass('public.storage_cleanup_queue') is not null
  union all
  select '03 evidence_entry_id column',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='evidences'
                   and column_name='evidence_entry_id')
  union all
  select '04 upload_key column',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='evidences'
                   and column_name='upload_key')
  union all
  select '05 content_sha256 column (migration 09)',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='evidences'
                   and column_name='content_sha256')
  union all
  select '06 content SHA-256 check constraint',
         exists (select 1 from pg_constraint
                 where conrelid=to_regclass('public.evidences')
                   and conname='evidences_content_sha256_check')
  union all
  select '07 evidence_entries RLS',
         exists (select 1 from pg_class
                 where oid=to_regclass('public.evidence_entries') and relrowsecurity)
  union all
  select '08 storage_cleanup_queue RLS',
         exists (select 1 from pg_class
                 where oid=to_regclass('public.storage_cleanup_queue') and relrowsecurity)
  union all
  select '09 atomic evidence deletion/outbox RPC',
         to_regprocedure('public.delete_owned_evidence(uuid)') is not null
  union all
  select '10 entry/file relationship trigger',
         exists (select 1 from pg_trigger
                 where tgrelid=to_regclass('public.evidences')
                   and tgname='evidence_file_entry_guard' and not tgisinternal)
  union all
  select '11 quota enforcement trigger',
         exists (select 1 from pg_trigger
                 where tgrelid=to_regclass('public.evidences')
                   and tgname='evidences_dossier_quota' and not tgisinternal)
  union all
  select '12 submission validation trigger',
         exists (select 1 from pg_trigger
                 where tgrelid=to_regclass('public.applications')
                   and tgname='c_guard_criterion_evidence_submission' and not tgisinternal)
  union all
  select '13 individual / collective scope trigger',
         exists (select 1 from pg_trigger
                 where tgrelid=to_regclass('public.application_criteria')
                   and tgname='application_criteria_award_scope' and not tgisinternal)
  union all
  select '14 T1-T6 accepted in DB constraint',
         exists (select 1 from pg_constraint
                 where conrelid=to_regclass('public.application_criteria')
                   and conname='application_criteria_code_check'
                   and pg_get_constraintdef(oid) like '%T1%'
                   and pg_get_constraintdef(oid) like '%T6%')
  union all
  select '15 collective codes RPC',
         to_regprocedure('public.award_applicable_codes(uuid)') is not null
  union all
  select '16 unique idempotency key',
         exists (select 1 from pg_indexes
                 where schemaname='public' and tablename='evidences'
                   and indexdef ilike '%unique%'
                   and indexdef ilike '%upload_key%')
  union all
  select '17 atomic rate limit RPC',
         to_regprocedure('public.consume_security_rate_limit(text,integer,integer)') is not null
  union all
  select '18 storage cleanup due index',
         to_regclass('public.storage_cleanup_queue_due_idx') is not null
  union all
  select '19 evidence table RLS',
         exists (select 1 from pg_class
                 where oid=to_regclass('public.evidences') and relrowsecurity)
  union all
  select '20 mandatory single-file unique index',
         to_regclass('public.evidences_one_file_per_single_criterion') is not null
  union all
  select '21 atomic per-criterion quota trigger',
         exists (select 1 from pg_trigger
                 where tgrelid=to_regclass('public.evidences')
                   and tgname='evidences_criterion_limit' and not tgisinternal)
  union all
  select '22 evidence entry identity guard',
         exists (select 1 from pg_trigger
                 where tgrelid=to_regclass('public.evidence_entries')
                   and tgname='evidence_entry_guard' and not tgisinternal)
)
select item, case when ready then 'PASS' else 'FAIL' end as result
from checks
order by item;

-- This static catalog audit is necessary but not sufficient: still test
-- row-level permissions with actual staged submitter/reviewer/admin accounts
-- and test the Apps Script Web App independently.
