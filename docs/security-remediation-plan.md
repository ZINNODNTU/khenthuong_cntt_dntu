# Strix Security Remediation Plan

## Baseline khảo sát

Repository thực tế: `d:\CNTT`. Branch: `security/strix-remediation`. Working tree có thay đổi trước đó; không ghi đè hoặc xóa.

## Kiến trúc hiện tại

- Next.js `16.2.10`, React `19.2.7`, TypeScript, pnpm `10.34.5`.
- Supabase SSR `0.12.3`, Supabase JS `2.110.7`, PostgreSQL/RLS.
- Session qua `proxy.ts`, `lib/supabase/proxy.ts`, `lib/supabase/server.ts`, `@supabase/ssr` cookies.
- Admin client server-side trong `lib/supabase/admin.ts`.
- Đăng ký sinh viên: `app/api/auth/register/route.ts`, reservation `student_account_registry`, Auth `signUp`, trigger tạo `profiles`.
- Đơn vị: `lib/unit-accounts.ts`.
- Minh chứng: Next API + Google Apps Script storage/viewer.

## Luồng và file chính

| Luồng | File |
|---|---|
| Login | `components/login-form.tsx` |
| Register | `app/(auth)/register/page.tsx`, `components/register-form.tsx`, `app/api/auth/register/route.ts` |
| Unit account | `lib/unit-accounts.ts`, admin unit routes/components |
| Change password | `app/change-password/page.tsx`, `components/change-password-form.tsx`, `app/api/account/change-password/route.ts` |
| Callback | `app/auth/callback/route.ts`, `app/auth/confirm/route.ts` |
| Session | `proxy.ts`, `lib/supabase/proxy.ts`, `lib/supabase/server.ts` |
| Evidence | `app/api/evidence/upload/route.ts`, `app/api/evidence/[id]/route.ts`, `lib/public-evidence.ts` |
| Authorization | `lib/auth.ts`, `supabase/database/01_SETUP_DATABASE.sql` |
| Audit | `lib/audit.ts`, `audit_logs` |

## Lỗ hổng

1. Mật khẩu đơn vị cố định `123456` trong code/docs/UI.
2. Đổi mật khẩu chưa yêu cầu mật khẩu hiện tại hoặc re-authentication.
3. Chưa có forgot-password flow đầy đủ.
4. Signup switch dùng `NEXT_PUBLIC_*`, không đủ làm security control.
5. MSSV registration chưa có ownership proof.
6. Reservation/Auth compensation chưa tuyệt đối kín.
7. Evidence mặc định `public_view_enabled = true`.
8. Public token plaintext, chưa expiry/revoke/rotate/hash.
9. Evidence API thiếu kiểm tra ownership đầy đủ.
10. Một số API trả lỗi Supabase/storage trực tiếp.
11. Chưa thấy rate limiting.
12. Headers thiếu CSP, HSTS, COOP/CORP.
13. Audit schema/code có dấu hiệu lệch.
14. `pnpm audit` báo 6 moderate và 7 high; PostCSS advisory cần nâng theo lockfile/advisory thực tế.

## Thay đổi dự kiến

- Invitation/password setup cho tài khoản đơn vị; không trả plaintext password.
- Password policy dùng chung; change password yêu cầu current password và re-authentication.
- Forgot/reset flow với generic response, token expiry/one-use và redirect allowlist.
- Server-only signup flag, generic MSSV responses, rate limit và reservation compensation.
- Evidence private-by-default, hashed CSPRNG token, expiry/revoke/rotate, DTO explicit columns, ownership checks.
- Chuẩn hóa API errors với correlation ID và sanitized logs.
- Rate limit cho endpoint nhạy cảm.
- CSP/security headers theo resource thực tế.
- Audit migration/RLS alignment.
- Dependency update tách commit, không `--force`.

## Migration dự kiến

- Auth/audit state and RLS alignment.
- Registration reservation/ownership sau khi xác nhận nguồn dữ liệu nghiệp vụ.
- Evidence private-by-default, token hash, expiry, revoke, rotate, indexes.
- Existing active links chỉ báo cáo; không tự động revoke.
- Mỗi migration có preflight/postflight/rollback.

## Tác động dữ liệu

- Không xóa rows hiện có.
- Evidence mới private.
- Link public cũ giữ nguyên đến khi admin quyết định.
- Legacy unit accounts cần reset/invitation thủ công.
- Auth và PostgreSQL tách transaction; dùng compensation/operator cleanup.

## Kiểm thử

`pnpm lint`, `pnpm typecheck`, `pnpm test` (script hiện chưa có), `pnpm build`, `pnpm audit`, `pnpm outdated`, `pnpm verify`, `pnpm db:verify`; thêm regression tests auth, registration, authorization, evidence, errors, rate limiting.

## Rollback

Backup DB; chạy migration staging; review inverse migration; giữ compatibility cutover; không tự reset account, revoke link, xóa data, migrate production hoặc gửi bulk email.

## Blocker cần xác nhận trong implementation

Schema hiện chưa cho thấy nguồn xác minh quyền sở hữu MSSV (email trường/OTP/activation code/import). Không tự bịa dữ liệu. Nếu không có nguồn hợp lệ, endpoint public registration phải đóng hoặc chuyển manual approval.
