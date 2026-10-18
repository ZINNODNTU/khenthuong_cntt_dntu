# CNTT – Bàn giao triển khai ngày 09/10/2026 (đã cập nhật sau khi triển khai Apps Script thành công)

## Đã hoàn thiện trong workspace
- Mã nguồn: D:\khenthuong_cntt_dntu; Google Apps Script v2.x tại google-apps-script/Code.gs.
- Nâng cấp /api/storage/health: kiểm tra bảng evidence_entries, storage_cleanup_queue và các cột evidences.evidence_entry_id, upload_key, content_sha256 trước khi báo sẵn sàng.
- Nâng cấp scripts/check-supabase-connection.mjs để kiểm tra cả khóa chống trùng và SHA-256.
- Nâng cấp scripts/check-image-storage.mjs: redacted endpoint/secret/Drive folder ID, timeout 20 giây, xác nhận gateway version v2.x, tránh in raw HTML/JSON đăng nhập.
- Tạo báo cáo SQL **chỉ đọc**: supabase/ops/VERIFY_GO_LIVE_READ_ONLY.sql (22 điều kiện, gồm RLS, quota và trigger giới hạn tệp).
- Thêm kiểm thử giả lập lỗi lưu/tải Drive, retry đổi tên tệp, tệp vượt 4 MiB, tệp bên ngoài private root.

## Lệnh xác minh
- pnpm run check: 67/67 tests PASS và TypeScript PASS (Node 24.16.0, dự án yêu cầu 22.x). Tests bao gồm retry phát hiện tệp Drive bị thay đổi nội dung dù SHA-256 trong description vẫn cũ.
- pnpm run build: PASS (Next.js 16.3.8).
- pnpm run supabase:check: FAIL. HTTP 404/PGRST205 với evidence_entries, storage_cleanup_queue; 400/42703 với evidences.evidence_entry_id và evidences.content_sha256. Cột evidences.upload_key tồn tại (HTTP 200). Thiếu SUPABASE_SECRET_KEY tại local; Google Apps Script URL và shared secret **đã được cấu hình server-only trong .env.local**, nhưng chưa xác minh/cấu hình chúng trên Vercel production.

## Trình duyệt @cntt: sự cố ban đầu và trạng thái đã giải quyết
- Đã thử NEXORA browser_open trên Supabase Dashboard trong Chrome được gắn workspace.
- Sự cố mở cửa sổ qua browser_open vẫn còn, nhưng sau đó phiên Chrome hiện hữu **đã được xác minh đúng dntu.edu.vn (Default)**; thao tác Apps Script được thực hiện thành công bằng Windows Accessibility trong phiên này.
- Trạng thái trước đó identity Unknown đã thay bằng Match; đã xác minh người dùng DNTU trong Apps Script OAuth. Không dùng Chrome profile hay tài khoản khác.
- Đã tạo và triển khai Web App Apps Script v2.1.0 **trên Google Drive DNTU thật**, chạy setupStorage và kiểm thử Google Drive thật thành công. Chưa chạy SQL ở Supabase production; chưa chỉnh sửa Vercel production; chưa push các thay đổi Git do workspace có nhiều file staged từ trước. Đã đồng bộ migration 09 vào bộ cài dự án mới và kiểm thử db:verify, storage:check đạt.

## Cách tiếp tục trên chính tài khoản được cấp
1. Đã xác minh và vận hành Apps Script qua Chrome đúng hồ sơ DNTU. Với Supabase, vẫn cần mở đúng project trong phiên có quyền quản trị thích hợp.
2. Chrome profile DNTU đã xác minh thành công; không cần bật Remote Debugging cho luồng Apps Script sử dụng Accessibility vừa hoàn tất.
3. Trong đúng Supabase project: backup/staging, kiểm tra migration history rồi áp dụng **các migration còn thiếu**, đặc biệt 06 (security), 07 (entries), 08 (T-codes), 09 (SHA-256) theo thứ tự. Không dùng reset. Chạy SQL kiểm tra chỉ đọc trên staging, mọi dòng phải PASS.
4. **HOÀN TẤT:** đã triển khai Google Apps Script gateway v2.1.0, xác thực server-only và smoke test upload/retry/download/delete trên Drive thật đạt. Chi tiết: docs/DNTU_APPS_SCRIPT_DEPLOYMENT_2026-10-09.md.
5. Trong Vercel project tương ứng: cấu hình server-only keys (SUPABASE_SECRET_KEY, GOOGLE_APPS_SCRIPT_WEB_APP_URL, GOOGLE_APPS_SCRIPT_SHARED_SECRET, CRON_SECRET) trong Dashboard trực tiếp, không paste vào chat/log/Git. Deploy đồng bộ.
6. Nghiệm thu thật: 2 mục C1 mỗi mục 2 tệp; C7–C9 1 tệp; T1–T6; idempotent retry, phân quyền, tải và xoá, cron, test tải đồng thời. Kiểm tra sức chịu tải và quota Apps Script.
7. Chạy lại check/build dưới Node 22.x; pnpm run storage:check đã PASS, pnpm run storage:smoke đã PASS. Còn phải chạy pnpm run supabase:check, GET /api/storage/health với admin sau migration.

Chỉ tuyên bố production-ready sau khi cả kiểm thử thực tế và hệ thống giám sát/khôi phục dữ liệu được xác minh.
