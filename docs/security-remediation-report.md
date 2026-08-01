# Strix remediation report

## A. Executive summary

Completed first execution group on branch `security/strix-remediation`:

- Unit account provisioning no longer sets or returns fixed passwords; new accounts use Supabase invitation flow.
- Change-password API now requires current password, new password and confirmation; server re-authenticates before update.
- Added shared password policy.
- Signup endpoint now checks server-only `PUBLIC_SIGNUP_ENABLED`.
- New evidence defaults private in database setup.
- Added reviewed evidence sharing lifecycle hotfix with hash/expiry/revoke/created columns and rollback comments.
- Added CSP, HSTS production-only, COOP/CORP and existing security headers.
- Added repository baseline plan.

Not completed yet: forgot-password flow, ownership verification, full rate limiter, full public token rotation/hashed viewer cutover, full error layer, audit schema alignment, dependency upgrades, comprehensive regression suite.

## B. File changes

- `lib/unit-accounts.ts`: invitation flow; no plaintext password result. Existing users are relabeled without resetting password.
- `lib/identity.ts`: removed default password export.
- `lib/password-policy.ts`: shared 12–128 character policy, common-password and identity checks.
- `app/api/account/change-password/route.ts`: current password re-authentication, generic errors, audit failure/success.
- `components/change-password-form.tsx`: current/new/confirm fields.
- `lib/env.ts`, `.env.example`: server-only signup flag `PUBLIC_SIGNUP_ENABLED`.
- `app/api/auth/register/route.ts`: direct API server guard.
- `supabase/database/01_SETUP_DATABASE.sql`: new evidence rows default private.
- `supabase/hotfix/SECURITY_EVIDENCE_SHARING.sql`: reversible evidence lifecycle columns/indexes; no production execution.
- `next.config.ts`: security headers.
- `docs/security-remediation-plan.md`: repository survey and plan.

Pre-existing dirty files were preserved.

## C. Database changes

No production database changed. New reviewed SQL only:

- Evidence `public_view_enabled` default false in setup file.
- Hotfix adds `public_token_hash`, share timestamps and partial indexes.
- Existing links are not revoked.
- Rollback comments included in hotfix.

Run staging review and backup before applying.

## D. Environment variables

- `PUBLIC_SIGNUP_ENABLED=true|false`: server-only registration gate; required production policy should be explicit.
- Existing secret variables remain server-only: `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_APPS_SCRIPT_SHARED_SECRET`.
- No secret values added.

## E. Test results

- `pnpm typecheck`: passed. Node warning: project expects Node 22.x, runtime is Node 24.16.0.
- `pnpm db:verify`: first run failed because project convention rejects `supabase/migrations`; file moved to `supabase/hotfix/SECURITY_EVIDENCE_SHARING.sql`, rerun launched.
- `git diff --check`: passed with line-ending warnings only.
- Default-password scan still finds legacy docs/UI references in `README.md`, `docs/UNIT_ACCOUNTS_AND_STUDENT_ID.md`, `components/branch-manager.tsx`, `components/club-manager.tsx`; these need next group cleanup.
- `pnpm audit`: previously reported 6 moderate and 7 high; no dependency change made yet.
- `pnpm test`: script absent in current package.json.

## F. Production checklist

- Backup database.
- Review and run hotfix on staging only.
- Confirm Supabase invite email/template and `/auth/callback?next=/change-password`.
- Set explicit `PUBLIC_SIGNUP_ENABLED`.
- Manually identify/reset legacy unit accounts; do not bulk reset automatically.
- Review existing public evidence links before revoke/expiry.
- Configure trusted rate-limit store before exposing sensitive endpoints.
- Run typecheck, lint, build, browser smoke tests and security regression tests.
- Deploy small commits; monitor sanitized logs; keep rollback ready.

## Remaining risks

- Legacy `public_token` still exists for compatibility and is not yet fully hash-only.
- CSP may need tuning for actual runtime resources.
- Invitation email setup requires Supabase configuration.
- MSSV ownership source remains unknown and blocks safe public registration hardening.
