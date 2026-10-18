# DNTU Apps Script live deployment — 09/10/2026

## Kết quả đã xác minh thực tế
- Tạo dự án Google Apps Script mới bằng **Chrome profile DNTU đã được NEXORA xác minh**, không dùng tài khoản Google khác.
- Tên dự án: `CNTT DNTU - Khen thuong - Private Drive Gateway`.
- Đã đưa mã lưu trữ từ `google-apps-script/Code.gs` vào Apps Script, trình chỉnh sửa nhận ra các hàm `doPost`, `setupStorage`, `diagnoseStorage`. Đã thực thi `setupStorage()` thành công; log xác nhận cấu hình root Drive + secret, không in giá trị.
- Đã OAuth bằng tài khoản triển khai DNTU để script thao tác Google Drive. Lưu ý Apps Script DriveApp yêu cầu quyền Drive rộng; tệp minh chứng được tạo trong root riêng tư do script tạo, không chia sẻ root.
- Đã triển khai Web App mới **phiên bản 1**; `Execute as me` (tài khoản DNTU), endpoint `Anyone` nhằm cho phép Next.js server gọi `doPost` bằng shared secret. `doGet` không cấp phát minh chứng.
- Đã sao chép Web App `/exec` và `STORAGE_SHARED_SECRET` vào `.env.local` trên đúng workspace, không in giá trị, không đưa vào Git. `.env.local` đã xác nhận Git-ignore và untracked.
- `pnpm run storage:check`: **PASS**, gateway v2.1.0 trả health từ hệ thống thật.
- `node scripts/smoke-apps-script-storage.mjs`: **PASS** toàn bộ: upload 1 tệp thử, retry trả cùng ID, thay đổi bytes giữ key bị chặn, download + SHA-256 đối chiếu, trash và ngăn download đã trash. Bộ kiểm thử dùng thư mục SMOKE riêng và không ghi Supabase.
- Phản hồi thực tế: lần upload thử đầu **gặp phản hồi non-JSON sau ~43 giây**; lần thử kế tiếp hoàn tất toàn bộ trong ~62 giây. Cần theo dõi biến động độ trễ/quota và kiểm thử tải trước khi mở cho số đông; không gọi đây là SLA ổn định.
- Script dự phòng cho thao tác này: `pnpm run storage:smoke` (sẽ tạo/tái xóa một file tạm trên Drive mỗi lần chạy).
- Đã cập nhật bộ cài database mới `supabase/database/INSTALL_NEW_PROJECT.sql` để bao gồm `09_EVIDENCE_CONTENT_INTEGRITY.sql` (checksum SHA-256). `pnpm run db:verify` nay kiểm tra tính đồng bộ migration 09 và nội dung installer; audit SQL chỉ đọc có 22 điều kiện.

## Cần tiếp tục trước khi công bố cho sinh viên
1. Supabase production vẫn thiếu `public.evidence_entries`, `public.storage_cleanup_queue`, `public.evidences.evidence_entry_id`, `public.evidences.content_sha256` ở lần kiểm tra gần nhất. **Sao lưu và xác minh migration history** trước khi chạy những migration còn thiếu (06, 07, 08, 09); tuyệt đối không reset production. Chạy `supabase/ops/VERIFY_GO_LIVE_READ_ONLY.sql` bằng SQL Editor và nghiệm thu RLS.
2. Vercel production env chưa được kiểm chứng/cập nhật. Cần đặt `GOOGLE_APPS_SCRIPT_WEB_APP_URL` và `GOOGLE_APPS_SCRIPT_SHARED_SECRET` giống giá trị server-only đã có trong `.env.local`, cùng `SUPABASE_SECRET_KEY` và `CRON_SECRET` riêng; redeploy Next.js sau khi migration hoàn tất. Không đẩy secret vào client, Git hoặc chat.
3. Kiểm thử E2E submitter/reviewer/admin và chống truy cập chéo bằng người dùng thử trên staging; thử cron cleanup. Chạy benchmark 10/25/50 request đồng thời và kiểm tra Apps Script quotas. Node 22.x là phiên bản yêu cầu của dự án; máy dev hiện dùng Node 24.x.
4. Tài khoản Google đang dùng là account DNTU học đường; trước go-live nên xác định chính sách bàn giao/chủ sở hữu nếu tài khoản tốt nghiệp hoặc bị vô hiệu hóa.
5. Kiểm tra, dọn tệp/thư mục thử còn sót dưới root `CNTT-Award-Review`: lần upload smoke đầu đã lỗi non-JSON và có thể đã tạo tệp tạm nhưng chưa nhận Drive file ID, không khẳng định mọi artifact đã được thu hồi.
6. Apps Script hiện có tệp `Mã.gs` chứa bản code được chèn trong `myFunction`, và `StorageGateway.gs` là bản top-level đang hoạt động; đây là phần dư của quá trình nhập mã qua UI. Không xóa/tái triển khai production nóng nếu chưa kiểm thử lại — nên chuẩn hóa thành đúng một `Code.gs` từ repo ở bản triển khai kế tiếp.

## Bảo mật
Giá trị Web App URL/deployment ID, root Drive ID, script secret và tài khoản/email cá nhân **không được ghi trong tài liệu này**. Script Property storage secret có thể được xem bởi người có quyền chỉnh sửa project Apps Script; hạn chế cấp quyền chỉnh sửa script. Root Drive folder phải để riêng tư, không chia sẻ Anyone with link.

## Lưu ý
Trạng thái hoàn tất **cổng lưu trữ** không đồng nghĩa production-ready toàn ứng dụng. Hiện gateway đã thực thi trên Drive thật và vượt qua smoke test; Supabase migration/Vercel/E2E vẫn chờ nghiệm thu riêng.
