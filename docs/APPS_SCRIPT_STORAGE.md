# Lưu minh chứng bằng Google Apps Script và Google Drive

**Luồng C1–C9/T1–T6:** xem [GOOGLE_DRIVE_GATEWAY_V2_2026-10-09.md](./GOOGLE_DRIVE_GATEWAY_V2_2026-10-09.md), [CRITERION_EVIDENCE_DRIVE.md](./CRITERION_EVIDENCE_DRIVE.md) và [SECURITY_HARDENING_2026-10-08.md](./SECURITY_HARDENING_2026-10-08.md).

## Kiến trúc riêng tư

```text
Browser (session Supabase) → Next.js API (RLS / rate limit) → Apps Script (shared secret) → Drive private folder
                               ↕
                         Supabase metadata / cleanup queue
```

Browser không nhận token chia sẻ công khai hoặc Drive file ID. **Không sử dụng** `doGet?token=...` nữa. Link public cũ đã bị ngừng để bảo vệ minh chứng cá nhân.

## Thiết lập

1. Sao lưu Supabase và triển khai migration 05, **sau đó 06** trên staging rồi production.
2. Cập nhật `google-apps-script/Code.gs` và `appsscript.json`; Apps Script chạy bằng tài khoản chuyên dụng có quyền sở hữu thư mục Drive.
3. Đặt Script Properties `DRIVE_ROOT_FOLDER_ID`, `STORAGE_SHARED_SECRET` và `MAX_IMAGE_SIZE_BYTES=4194304`. **Không đặt SUPABASE_SECRET_KEY/SUPABASE_URL** vào Apps Script.
4. Sinh shared secret bằng máy quản trị, nhập thủ công ở Script Properties và Vercel env. `setupStorage()` không còn in secret vào log.
5. Deploy Web App: Execute as Me, Who has access Anyone (chỉ được gọi POST khi biết shared secret); giữ Drive private. Đặt URL `/exec` và secret trong **server env**, không dùng `NEXT_PUBLIC_`.
6. Đặt Vercel `CRON_SECRET` ngẫu nhiên >=24 ký tự để tự dọn Drive queue bằng cron.
7. Nếu dùng Apps Script cũ, xoay shared secret vì bản cũ có thể đã ghi vào Execution Log; thu hồi mọi quyền chia sẻ Drive công khai.

## API Apps Script
Các lệnh POST `upload`, `download`, `delete`, `health` đều cần shared secret và chỉ thao tác tệp thuộc thư mục lưu trữ quy định. `GET` không trả nội dung minh chứng.

Next.js hạn mức 4 MiB/tệp, tối đa 40 tệp/60 MiB mỗi hồ sơ, hỗ trợ PDF/JPG/PNG/WebP với các tiêu chí. Drive cleanup queue xử lý trường hợp xóa chưa thành công.

## Kiểm chứng
Dùng tài khoản submitter/reviewer/admin thật trên **staging** để kiểm tra upload, quyền xem của reviewer được phân công, quota, giới hạn 429, cron xóa tệp mồ côi và việc từ chối URL công khai cũ.
