# Production hotfix: audit log not recording (28 Oct 2026)

## Root cause
Actual Supabase `public.audit_logs` DDL defines columns:
`id bigint`, `actor_id uuid`, `action text`, `entity_type text`, `entity_id uuid`,
`metadata jsonb`, `created_at timestamptz`.

`lib/audit.ts` previously tried to insert nonexistent columns such as `module`, `resource_type`, `status`, `request_id` and `description`. The other legacy calling convention included a nonexistent `module` column. PostgREST rejected both formats and the function ignored the returned error. As a result, administrative and security events were missing despite completed business operations.

## Changes
- Replaced writer with canonical six-field record: `actor_id, action, entity_type, entity_id, metadata`. Extended attributes are packed into JSONB `metadata`, sensitive property names recursively removed, and insert errors recorded in Vercel runtime logs as `[audit.insert_failed]` with action and database error code, never passwords/tokens.
- Password recovery via email now posts to `/api/account/reset-password` with an authenticated session, applies the existing password policy, and inserts `account.password_reset` (or `account.password_reset_failed`) after the Supabase Auth action. No service-role secret is required for this audit write.
- Forced first-login password change now audits the credential change **before** the separate admin-only flag update. If the flag update fails, the response states the password really changed; it must not mislead the user into retrying the old password.
- Logout logs `account.logout` before signing out.
- The primary login form initiates a small same-origin authenticated `/api/auth/login-event` request (keepalive) after successful Supabase sign-in; this is **best effort** and not a guaranteed all-session login record.
- Admin audit page is force-dynamic, handles database query errors visibly, labels newer event names, displays the 200 most recent records, and includes an explicit refresh button. This is not exhaustive historical pagination.

## Security
- Password values and OTP tokens never enter the audit payload.
- Audit API endpoints validate the caller's Supabase session and reject cross-site requests.
- Existing audit table RLS allows authenticated users to insert rows with their own actor_id, but clients could still submit misleading action strings directly. Treat this as an **activity feed, not yet a tamper-proof security log**. Harden with a restricted server-side audit RPC and verified privileged backend before formal compliance use.
- Do not expose a Supabase service-role key to the browser or try to bypass rate limiting.

## Validation
- `pnpm run check` (70 existing unit tests) PASS.
- `node --experimental-strip-types --test tests/audit-log.test.mjs` (4 tests) PASS.
- Playwright `tests/audit-routes.spec.ts` + `tests/email-confirmation.spec.ts` (11 tests) PASS.
- `pnpm run build` PASS.
- Real credential changes were **not** performed to test this fix. Historical events silently rejected by PostgREST cannot be reconstructed. After deployment, verify fresh authenticated events appear in Admin → Nhật ký hoạt động; if not, inspect `[audit.insert_failed]` and verify RLS permissions/migrations for this Supabase project.

## Follow-up
Review Vercel server-only service-role env and `consume_security_rate_limit` separately: those remain relevant to sensitive endpoints and are **not** repaired by this audit-only change.
