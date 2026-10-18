# Bảo mật & tối ưu CNTT DNTU – triển khai mã nguồn 08/10/2026

## Những thay đổi đã triển khai trong workspace
1. **Bảo vệ Google Drive:** Apps Script không còn `doGet` viewer bằng public token, không dùng Supabase service-role key, không log shared secret; mỗi thao tác download/delete chỉ chấp nhận tệp thuộc cây thư mục riêng tư của hệ thống. Tắt mọi `public_view_enabled` bằng migration 06.
2. **Bảo vệ trình duyệt:** Hàm `getPublicEvidenceUrl` chỉ trả `/api/evidence/:id`; `getApplication` không truy xuất token/ID Google Drive sang UI. PDF được trả về dưới dạng attachment (tránh mở trực tiếp trong origin app); response dùng `no-store` và `nosniff`.
3. **Phân quyền chặt:** API download kiểm tra reviewer được phân công; DB RLS của bảng `evidences` cũng thu hẹp cho submitter chủ hồ sơ, reviewer được phân công, admin. DB từ chối C7–C9 trên hồ sơ tập thể.
4. **Giới hạn tập trung:** `public.consume_security_rate_limit` là RPC atomic (PostgreSQL UPSERT); chỉ service role có quyền gọi. Bucket là HMAC-SHA256, không lưu IP/email/MSSV dạng rõ. Các ngưỡng: tạo hồ sơ **15/giờ/tài khoản**, upload **100/giờ/tài khoản**, tải tệp **600/giờ/tài khoản**, đăng ký **12/giờ/IP** và **3/giờ/email**. Hết hạn trả HTTP 429 + Retry-After; RPC lỗi trả 503, không tự động bỏ qua kiểm soát.
5. **Chống multipart lớn:** `parseLimitedFormData` kiểm tra Content-Length và thực tế đọc stream; dừng nếu quá tối đa 4 MiB/tệp + 512 KiB metadata, trước khi giải mã formData. Vẫn áp dụng kiểm tra MIME/chữ ký.
6. **Quota transaction-safe:** trigger PostgreSQL dùng advisory lock theo hồ sơ, tối đa **40 tệp** và **60 MiB** cho mọi loại minh chứng cộng lại; giữ giới hạn C1–C6 tối đa 20 tệp/tiêu chí, C7–C9 một tệp/tiêu chí.
7. **Xóa đáng tin cậy:** `delete_owned_evidence` xóa metadata + ghi `storage_cleanup_queue` trong một transaction. Xóa hồ sơ tạo các bản ghi outbox trước khi xóa dữ liệu. Worker kiểm tra không có evidence nào còn tham chiếu ID Drive trước khi xóa; lỗi được retry theo exponential backoff. Vercel Cron hằng ngày tại 03:00 UTC xử lý tối đa 5 tệp/lần.
8. **Hiệu năng:** `getApplication` vẫn chạy các truy vấn độc lập song song nhưng chỉ lấy cột evidence cần dùng, đồng thời phân nhóm hoạt động/giải thưởng theo Map O(n) thay vì filter toàn bộ danh sách nhiều lần.
9. **Chính sách mật khẩu:** đăng ký sinh viên sử dụng chính sách 12 ký tự trở lên và loại các mật khẩu chứa thông tin định danh.

## Triển khai đúng thứ tự (bắt buộc)
1. Sao lưu DB **và quyền truy cập**, thử trên **staging** trước. Nếu DB đã có migration 05, chạy `supabase/migrations/20261008170000_security_hardening.sql`. Nếu chưa có, áp dụng 05 trước 06. **Không chạy** script cài mới `INSTALL_NEW_PROJECT.sql` lên DB hiện hữu.
2. Kiểm tra migration 06 tạo `security_rate_limits`, `storage_cleanup_queue`, RPC `consume_security_rate_limit`, `delete_owned_evidence`, trigger `evidences_dossier_quota` và RLS mới; xác minh role `authenticated` không thể gọi rate-limit RPC hoặc đọc queue.
3. Cập nhật và triển khai **Google Apps Script mới**. Xóa `SUPABASE_URL`, `SUPABASE_SECRET_KEY` khỏi Script Properties sau khi chấm dứt viewer cũ; đảm bảo thư mục Drive không có public permission. **Quay vòng STORAGE_SHARED_SECRET** nếu script cũ từng chạy hàm setupStorage/generateSharedSecret (đã ghi secret trong Execution Logs).
4. Set env server Vercel `GOOGLE_APPS_SCRIPT_WEB_APP_URL`, `GOOGLE_APPS_SCRIPT_SHARED_SECRET`, `SUPABASE_SECRET_KEY` hoặc `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` ngẫu nhiên >=24 ký tự, `MAX_IMAGE_SIZE_MB=4`. Vercel Cron dùng `Authorization: Bearer CRON_SECRET` (không public secret).
5. Deploy Next.js **sau** khi DB mới đã sẵn sàng, vì rate limiter mặc định fail-closed trả 503 nếu RPC chưa được cài. Giám sát code 429/503 và `storage_cleanup_queue`.
6. Kết thúc, rà soát quyền chia sẻ cũ và thông báo các link minh chứng public đã vô hiệu hóa.

## Kịch bản kiểm thử bắt buộc trên staging
- Gửi upload bằng tài khoản submitter không hoạt động, chưa đổi mật khẩu, người khác, hồ sơ đã nộp: từ chối.
- A là reviewer được phân công xem được evidence; B là reviewer không được phân công chỉ nhận 403, kể cả khi gọi Supabase REST trực tiếp. Admin vẫn xem được.
- Gửi PDF giả, PDF vượt 4 MiB, multipart >4 MiB+512 KiB, C7–C9 hai tệp, C7 trên hồ sơ tập thể, 41 tệp và tổng tệp >60 MiB: API và DB từ chối tương ứng.
- Gửi đồng thời nhiều tệp ở các category khác nhau: DB áp dụng quota nhất quán không vượt 40/60 MiB.
- Đủ số lần liên tục theo ngưỡng: nhận 429 và Retry-After; tài khoản khác không bị giới hạn lây. Khi tắt RPC trên staging, API phải trả 503.
- Xóa evidence trong bản nháp rồi tạm ngắt Drive: metadata mất, queue giữ ID để cron xử lý; khi Drive hoạt động trở lại thì file được chuyển vào Trash. Nếu ID vẫn được tham chiếu ở bảng evidence, queue **không** được phép xóa file.
- Mở lại URL `/exec?token=<old>`: chỉ hiển thị thông báo tắt liên kết, không trả tệp.
- Kiểm tra chức năng xét duyệt nhị phân C1–C9, dashboard, CSV, in báo cáo, reset/revision và toàn bộ quyền RLS.
- Chạy `pnpm run check`, `pnpm run build`, `pnpm audit --audit-level=low` trên Node 22 (runtime đích) và thử tối thiểu 20 hồ sơ/100 tệp trên staging.

## Giới hạn còn tồn tại
- **Chưa có quét malware/PDF CDR**. Định dạng và chữ ký chỉ là kiểm tra lớp đầu; lưu PDF dạng attachment giảm rủi ro origin nhưng không đảm bảo tệp sạch. Trước khi triển khai nhạy cảm, bổ sung dịch vụ quét và cách ly/quy trình xem xét.
- **CSP** hiện vẫn có `script-src 'unsafe-inline'` trong production do phụ thuộc cơ chế hydration Next.js. Cần kiểm thử CSP nonce/strict-dynamic trên staging (không tự bỏ unsafe-inline khi chưa xác minh ảnh hưởng).
- Quyền sở hữu email/MSSV mới dựa trên xác nhận email, chưa có đối soát hệ thống trường; giữ `PUBLIC_SIGNUP_ENABLED=false` ở production tới khi xác thực nguồn dữ liệu.
- Đăng nhập dùng Supabase Auth trực tiếp từ client, vì vậy rate limiter RPC mới không bao phủ lưu lượng đăng nhập. Cần kết hợp cấu hình Supabase Auth, WAF/chống bot ở hạ tầng.
- Chưa chạy migration trên DB thật, chưa redeploy Google Apps Script/Vercel, chưa chứng minh kiểm thử tích hợp Supabase+Drive và pentest. SQL lưu trữ/hàng đợi cũng cần diễn tập backup/restore.
- Các dữ liệu lịch sử chấm điểm, component giao diện cũ còn lại để phục vụ tương thích/đối soát; chỉ xóa sau khi được duyệt dữ liệu lịch sử.
- Cron Vercel chạy 1 lần/ngày nên queue lớn có thể giải phóng chậm. Có thể tăng tần suất nếu gói triển khai hỗ trợ hoặc chạy thủ công bởi quản trị với CRON_SECRET.

**Trạng thái:** triển khai mã nguồn hoàn tất cho lớp bảo vệ ưu tiên; chưa xác nhận an toàn production cho tới khi áp dụng migration và nghiệm thu môi trường thật.
