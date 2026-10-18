# Google Apps Script – cổng lưu minh chứng riêng tư v2.0.0

**Hướng dẫn triển khai đầy đủ và checklist nghiệm thu:** [GOOGLE_DRIVE_GATEWAY_V2_2026-10-09.md](../docs/GOOGLE_DRIVE_GATEWAY_V2_2026-10-09.md). Gateway v2 bắt buộc SHA-256 khi upload và triển khai đồng bộ với backend Next.js. Tệp đã tạo được định danh bền vững để retry không trùng sau khi cache hết hạn.

Google Apps Script chỉ là cổng nhận lệnh từ **Next.js server**; Google Drive và các thư mục minh chứng **không được chia sẻ công khai**.

## Chức năng
- `doPost`: tải lên, tải xuống và đưa tệp Drive vào thùng rác khi Next.js gửi **shared secret** đúng.
- Kiểm tra MIME/chữ ký, dung lượng và quyền sở hữu thư mục.
- **`doGet` đã vô hiệu hóa xem minh chứng bằng public token.** Người dùng phải đăng nhập ứng dụng để truy cập `GET /api/evidence/:id`.
- Script **không cần Supabase service-role key**. Hãy xóa `SUPABASE_SECRET_KEY` và `SUPABASE_URL` khỏi Script Properties nếu trước đây có cấu hình cho viewer cũ.

## Cấu hình thủ công
1. Tạo project tại `script.google.com` bằng tài khoản Drive dành riêng cho hệ thống (nên tránh tài khoản Drive cá nhân).
2. Cập nhật `Code.gs` và `appsscript.json`; tạo deployment **version mới**.
3. Trong Project Settings → Script Properties, thiết lập **thủ công và bí mật**:
   - `DRIVE_ROOT_FOLDER_ID`: ID thư mục Drive riêng tư.
   - `STORAGE_SHARED_SECRET`: chuỗi bí mật ngẫu nhiên dài ít nhất 24 ký tự; sinh bằng `pnpm generate-storage-secret` trên máy quản trị (không đưa vào Git/log/tin nhắn công khai).
   - `MAX_IMAGE_SIZE_BYTES=4194304`.
4. Web App chạy bằng tài khoản sở hữu (Execute as Me); quyền gọi endpoint có thể là **Anyone**, vì mọi `doPost` đều xác thực shared secret trước thao tác. **Không chia sẻ URL và shared secret ra frontend**.
5. Trên môi trường Next.js server đặt `GOOGLE_APPS_SCRIPT_WEB_APP_URL` và `GOOGLE_APPS_SCRIPT_SHARED_SECRET` cùng một bí mật. Không dùng prefix `NEXT_PUBLIC_`.
6. Sau khi cập nhật, xác minh các lệnh thử nghiệm: upload C1, tải C1 bằng tài khoản được quyền, tải bằng tài khoản lạ bị từ chối, xóa từ bản nháp và health check bằng admin.
7. **Kiểm tra toàn bộ lịch sử Execution Logs cũ.** Bản trước từng in giá trị shared secret. Nếu script đã chạy, phải xoay khóa rồi cập nhật lại cả hai môi trường. Log mới không in giá trị khóa.

**Cảnh báo:** Chuyển sang bản an toàn này sẽ làm mất hiệu lực các đường dẫn xem công khai đã chia sẻ trước đây. Đây là thay đổi có chủ đích để bảo vệ tài liệu học tập và thông tin cá nhân.

## Cơ chế dọn tệp và migration
Trước khi deploy bản Next.js mới, áp dụng `supabase/migrations/20261008160000_criterion_evidence_binary.sql` (nếu chưa có) và `supabase/migrations/20261008170000_security_hardening.sql` trên staging rồi mới production.

Trong Vercel đặt `CRON_SECRET` ngẫu nhiên ít nhất 24 ký tự. Job `/api/cron/storage-cleanup` được khai báo chạy hằng ngày lúc 03:00 UTC trong `vercel.json`. Không tiết lộ giá trị CRON_SECRET.

Chi tiết: `docs/SECURITY_HARDENING_2026-10-08.md`.
