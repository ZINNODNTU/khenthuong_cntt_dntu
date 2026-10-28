# Production Supabase project mismatch — 28/10/2026

## Live diagnosis

- Supabase Dashboard for the award portal and the working local `.env.local` use project
  `nzoamsyazdafyqnsxkny.supabase.co`.
- JavaScript served by `https://khenthuong-cntt-dntu.vercel.app/login` contains
  `tjjltcssupcmpbvucqnw.supabase.co`, **a different Supabase project**.
- Vercel production `POST /api/auth/email` returned `503 AUTH_UPSTREAM_UNREACHABLE`
  in both Node.js and Edge runtimes. Vercel runtime logs showed `[auth.email.network]`.
- A local Auth API request against the correct project previously returned HTTP 200
  for a recovery request. HTTP 200 proves only submission was accepted, not Inbox delivery.
- Supabase correct project's SMTP toggle is enabled, sender is a DNTU mailbox,
  host `smtp.gmail.com`, port 465; Dashboard warned that personal SMTP services may
  affect transactional email deliverability. No SMTP credentials were viewed/changed.

## Required changes in Vercel project settings

**IMPORTANT: do not submit real student credentials while production points at the wrong tenant.**

1. Vercel project `dntu/khenthuong-cntt-dntu` → Settings → Environment Variables.
2. Replace `NEXT_PUBLIC_SUPABASE_URL` with
   `https://nzoamsyazdafyqnsxkny.supabase.co` in Production and Preview.
3. Replace `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with the **matching publishable key from the same project**, obtainable from Supabase API Keys. The key in local `.env.local` is of type `sb_publishable_` and the local host matches this correct project, but do not paste keys in chat or logs.
4. Verify `SUPABASE_SERVICE_ROLE_KEY`/server-side service key is the correct project's key; if not, replace it securely in Vercel. **Never put service-role or secret key in the client, Git or terminal output.**
5. Verify `NEXT_PUBLIC_APP_URL` is `https://khenthuong-cntt-dntu.vercel.app` for production.
6. Vercel marks older `NEXT_PUBLIC_...` variables as **Secret**, and its UI disallows changing a saved Secret to Config. Because names start `NEXT_PUBLIC_`, the dashboard shows a public-prefix validation warning. They need to be **recreated as Config variables**; the direct delete action was blocked by the computer-use confirmation gate, so no deletion was attempted.
7. Redeploy latest GitHub commit for production **after** environment variable changes; `NEXT_PUBLIC_...` is embedded into built client bundles at build time.
8. Verify bundle references correct host, `POST /api/auth/email` yields accepted/limited upstream response rather than mismatch or unreachable, then test one new email and complete reset via Inbox.
9. Independently verify Auth email templates in Supabase Dashboard match the HTML files. Updating GitHub does not publish templates to Supabase.

## Code safeguards

- Added same-origin recovery and resend gateway with input checks and neutral error messages.
- Reverted failed Edge experiment; Node.js is supported long term.
- In production, email gateway now **refuses** to send auth mail to a Supabase project
  other than `nzoamsyazdafyqnsxkny.supabase.co`, returning the safe
  `SUPABASE_PROJECT_MISMATCH` error. This is a deliberate fail-closed configuration guard,
  not a substitute for fixing Vercel.

## Status

The code can build and pass automated tests. **Production email delivery cannot be marked completed until Vercel environment variables are corrected and a real Inbox-to-reset test passes.**
