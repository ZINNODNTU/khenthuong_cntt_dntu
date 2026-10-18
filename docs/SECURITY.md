# Bảo mật hệ thống CNTT DNTU

- `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` chỉ nằm trong Next.js server; không đưa vào Google Apps Script, frontend hay Git.
- `GOOGLE_APPS_SCRIPT_SHARED_SECRET` chỉ lưu trong Next.js server và Google Apps Script Properties. Không ghi giá trị ra log. Nếu đã chạy Apps Script phiên bản cũ, **xoay secret**.
- `CRON_SECRET` ngẫu nhiên tối thiểu 24 ký tự chỉ nằm trong server env, dùng xác thực cleanup cron.
- Browser không gọi Apps Script trực tiếp; mọi upload/download đi qua Next.js với Supabase Auth, RLS và atomic API rate limit.
- Reviewer chỉ được xem minh chứng của hồ sơ đã phân công; admin và chủ hồ sơ có quyền riêng theo nghiệp vụ.
- File Drive lưu riêng tư trong root hệ thống. Viewer công khai qua token đã bị vô hiệu hóa; dữ liệu hồ sơ chỉ chứa URL nội bộ.
- Next.js kiểm tra byte thực tế, MIME/chữ ký, giới hạn 4 MiB/tệp; database kiểm soát tổng 40 tệp/60 MiB/hồ sơ.
- Xóa metadata/Drive dùng queue để giảm rủi ro tệp mồ côi; nội dung file chưa được xác nhận đã quét malware.
- Migration 06 bắt buộc trước khi phát hành code dùng rate limiter; nếu RPC chưa cài, API trả HTTP 503.
- Chi tiết triển khai và giới hạn còn lại: [SECURITY_HARDENING_2026-10-08.md](./SECURITY_HARDENING_2026-10-08.md).
