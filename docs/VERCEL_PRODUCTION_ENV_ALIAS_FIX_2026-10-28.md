# Vercel production workaround for legacy Secret public variables — 28/10/2026

## Context

The Vercel project stores `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as old **Secret** variables. Their values pointed at an incorrect Supabase project and an incorrect application URL. Vercel's edit UI refuses to convert an existing Secret public-prefixed variable into Config; duplicate keys in the same targets are rejected. The Delete action was blocked by the environment's confirmation gate. No existing environment variable was deleted or rotated.

## Safe replacement variables created via the project's authenticated browser

- `NEXT_PUBLIC_AWARD_SUPABASE_URL` — Config, value is correct project `https://nzoamsyazdafyqnsxkny.supabase.co`.
- `NEXT_PUBLIC_AWARD_SUPABASE_PUBLISHABLE_KEY` — Config, sourced from the local working environment corresponding to that project, without printing the value. Supabase publishable keys are designed for client distribution.
- `AWARD_APP_URL` — Config, value `https://khenthuong-cntt-dntu.vercel.app`.

The code now prefers these replacements; old names remain as backward-compatible fallbacks for local or other environments. This restores public auth client/server routing **once the latest source has been redeployed**, but does not update the old variables or grant access to the Supabase service-role key.

## Security and rollout notes

- Existing `SUPABASE_SERVICE_ROLE_KEY` in Vercel **has not been verified** against the correct Supabase project. Do not claim all privileged backend functions work until checked and corrected securely.
- Correct project dashboard SMTP is enabled, with a DNTU sender on Gmail SMTP, but successful delivery requires an end-to-end Inbox test.
- Supabase email templates are controlled separately in the Supabase Dashboard and are **not** published by a GitHub push.
- Once Vercel UI permits an approved, controlled cleanup, the older variables can be deleted and replaced with the canonical keys as Config. Avoid keeping ambiguous duplicate configurations indefinitely.
- The last production check before alias rollout returned 503 `SUPABASE_PROJECT_MISMATCH`. Check again after deployment.

## Checks after deployment

1. On `/login`, browser Javascript must reference `nzoamsyazdafyqnsxkny.supabase.co` and not connect to the incorrect project.
2. `/api/auth/email` must not return `SUPABASE_PROJECT_MISMATCH` or `AUTH_UPSTREAM_UNREACHABLE`; send at most one recovery request for a controlled account.
3. Verify new email's link is on the Vercel host, then press confirmation and complete a real password reset.
4. Check admin/service-role API capability separately, and verify permissions/RLS prior to opening for real student data.
