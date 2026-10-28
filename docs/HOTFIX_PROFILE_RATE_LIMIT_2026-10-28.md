# Hotfix — Student profile update blocked by global rate-limit backend (28/10/2026)

## Production issue
When a signed-in student clicked **Lưu thay đổi** on `/account/profile`, the API returned HTTP 503 with “Bộ bảo vệ tần suất đang không khả dụng”. The request was blocked **before** validation or the Supabase profile-update RPC.

The problem was introduced because the profile-update route called `enforceRateLimit("profile:update", ...)`, which requires a server-side Supabase service-role key and the separate `consume_security_rate_limit` SQL function. Their runtime compatibility/permissions on production have **not been verified**; the error string alone does not establish whether the key or RPC is missing. This centralized rate limiter remains in place for sensitive APIs; do not silently bypass it on account provisioning, file uploads, login or other high-impact operations.

## Endpoint-specific safe replacement
- `PATCH /api/account/profile` still calls `auth.getUser()`, rejects unverified/inactive/non-student accounts, and validates all four fields with `studentProfileSchema`.
- Restricts cross-site writes by inspecting Origin and Sec-Fetch-Site, while authenticated cookie handling remains in place.
- Checks the current user's persisted `profiles.updated_at` timestamp and allows saving no more than once every **15 seconds** via the web endpoint. Returns HTTP 429 and Retry-After for repeated submissions. This is a low-impact self-edit endpoint; there is no service-role dependency.
- Supabase SECURITY DEFINER `complete_student_profile` checks `auth.uid()`, student email verification, active branch and field constraints independently and only updates the signed-in user's row. The role of that database function is unchanged.
- This application-route cooldown is not a general-purpose distributed atomic rate limiter, and an authorized client calling the existing Supabase RPC directly is outside this route's cooldown. For strict guarantees, rate limiting would need to be enforced within the PostgreSQL function.
- The edit form's own loading state prevents accidental double submissions and displays the API error if a cooldown applies.

## Verification
- `pnpm run typecheck`, `pnpm run check`, and `pnpm run build`: PASS.
- New `tests/profile-update-throttle.test.mjs` covers null, recent, expired and malformed update timestamps.
- `tests/account-profile-branches.spec.ts` covers unauthenticated rejection and cross-origin fail-closed behavior.
- Production post-deployment smoke: an unauthenticated PATCH should return 401; manually saving under a verified student account is still needed to establish full end-to-end success. Do not edit a student's personal data for testing without explicit authorization.
- **Separate follow-up:** audit `SUPABASE_SECRET_KEY` and `public.consume_security_rate_limit` for all other endpoints. They may still return HTTP 503 when their protective backend is unavailable. Do not call the entire system fixed based only on this hotfix.
