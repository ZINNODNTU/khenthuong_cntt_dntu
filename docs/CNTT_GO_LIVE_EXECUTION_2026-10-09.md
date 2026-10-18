# Biên bản chạy nghiệm thu CNTT — 09/10/2026

## Trạng thái (đã thực thi trong workspace D:\khenthuong_cntt_dntu)

| Hạng mục | Kết quả | Nguồn kiểm tra |
| --- | --- | --- |
| TypeScript, bảo mật mã nguồn, nghiệp vụ và 67 unit tests | PASS (67/67) | `pnpm run check` |
| Next.js production build | PASS | `pnpm run build` |
| Kiểm tra đăng ký, xác nhận email và SMTP template | PASS | `pnpm run auth:verify` |
| Bảo vệ đăng ký tài khoản MSSV trùng | PASS mã nguồn | `pnpm run auth:uniqueness:verify` |
| Đăng nhập / giao diện mẫu 3 viewport × 2 theme, kiểm tra WCAG/overflow/network | PASS (12/12) | `pnpm run ui:audit` |
| Hiệu ứng, CLS, reduced motion | PASS (3/3) | `pnpm run ui:motion-audit` |
| Kiểm tra cấu trúc SQL cài đặt mới | PASS | `pnpm run db:verify` |
| Google Apps Script Web App với shared secret thực | PASS, v2.1.0 | `pnpm run storage:check` |
| Drive upload/đối chiếu/tải/xóa trên tài khoản DNTU | PASS ở phiên trước, không chạy lại batch này | `pnpm run storage:smoke` |
| Supabase REST schema đang cấu hình | **FAIL / CHƯA TRIỂN KHAI** | `pnpm run supabase:check` |
| SQL Editor migration staging/production | **CHƯA THỰC HIỆN** | Chưa có xác minh backup và phiên quản trị Supabase |
| Vercel environment + deployment production | **CHƯA THỰC HIỆN** | Chưa có phiên quản trị Vercel đã xác minh |
| Hồ sơ nộp thật và 3 vai trò (submitter/reviewer/admin) | **CHƯA THỰC HIỆN** | Backend Supabase chưa đạt schema cần thiết |

## Các vấn đề đã xử lý ngay trong lượt này
1. Cập nhật hai bộ xác minh tĩnh `scripts/verify-login-smtp.mjs` và `scripts/verify-student-account-uniqueness.mjs`: không còn kiểm tra chuỗi cũ; nay kiểm tra luồng thực tế dùng `enforceRateLimit`, `studentRegistrationSchema`, `auth.signUp`, URL `/auth/finish` và xác nhận email.
2. Tích hợp hai bộ xác minh đăng ký vào `pnpm run check` để mọi lần chạy CI đều kiểm tra chúng.
3. Đã chạy lại `pnpm run check` và `pnpm run build` **thành công** sau khi thay đổi.
4. Không thêm bất kỳ bí mật nào vào repo hoặc output.

## Các điều kiện phải được xử lý trước khi triển khai production

1. Supabase hiện **thiếu** hai bảng `public.evidence_entries`, `public.storage_cleanup_queue` và hai cột `public.evidences.evidence_entry_id`, `public.evidences.content_sha256`. `public.evidences.upload_key` đã tồn tại. Khi chưa khôi phục các cấu trúc này, ứng dụng sẽ lỗi khi lưu hồ sơ minh chứng mới.
2. Tài khoản Supabase đang mở trong Chrome không thể xác nhận thuộc profile `dntu.edu.vn (Default)` được NEXORA gắn; mọi cố gắng `browser_open` tới dashboard đều bị từ chối, **không có thao tác production được thực hiện trên cửa sổ Chrome không xác minh**.
3. Local chưa có `SUPABASE_SECRET_KEY` (và chưa chứng minh trạng thái server-only environment variables trên Vercel), vì vậy backend API/cleanup cron production chưa được nghiệm thu.
4. **Bắt buộc** backup Supabase, xác minh migration history, chạy migration thiếu theo thứ tự 06→07→08→09 trên staging trước, sau đó chạy `supabase/ops/VERIFY_GO_LIVE_READ_ONLY.sql` (22 chỉ tiêu). Không chạy `00_RESET_DATABASE.sql` hay `INSTALL_NEW_PROJECT.sql` trên project đang có dữ liệu.
5. Đảm bảo `SUPABASE_SECRET_KEY`, `GOOGLE_APPS_SCRIPT_WEB_APP_URL`, `GOOGLE_APPS_SCRIPT_SHARED_SECRET`, `CRON_SECRET` chỉ nằm trong biến môi trường server của project Vercel đúng. Redeploy rồi nghiệm thu đăng ký, đăng nhập, nộp và xét duyệt với các tài khoản thử có phân quyền.
6. Node hiện được chạy thử ở v24 nhưng `package.json` yêu cầu Node 22.x. Đặt Node 22 trong môi trường build/production.

## Bằng chứng và giới hạn

- `pnpm run check`: **67/67 unit tests PASS** cùng xác minh quy trình đăng ký.
- Playwright chỉ kiểm thử **hai trang công khai** là `/login` và `/design-preview`; không suy diễn thành E2E hồ sơ thật.
- Google Apps Script gateway health PASS không đồng nghĩa Supabase/ứng dụng production đã sẵn sàng.
- Không tự ý commit/push toàn bộ workspace vì repo đang có rất nhiều file staged từ trước cần đối chiếu.
