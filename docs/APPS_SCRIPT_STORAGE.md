# Lưu ảnh bằng Google Apps Script

## Kiến trúc

```text
Browser → Next.js API trên Vercel → Google Apps Script Web App → Google Drive
                           └──────→ Supabase metadata/public token
```

Vercel không giữ OAuth Client, Client Secret hoặc Refresh Token của Google. Google Drive chỉ được truy cập bởi Apps Script chạy dưới tài khoản triển khai.

## Thiết lập nhanh

1. Tạo Apps Script project.
2. Sao chép thư mục `google-apps-script/` vào project.
3. Thêm `SUPABASE_URL` và `SUPABASE_SECRET_KEY` trong Script Properties.
4. Chạy `setupStorage()` và cấp quyền.
5. Lấy `STORAGE_SHARED_SECRET` từ log.
6. Deploy Web App: **Execute as Me**, **Who has access: Anyone**.
7. Thêm URL `/exec` và shared secret vào `.env.local`/Vercel.

## API nội bộ Apps Script

Các lệnh `doPost` đều yêu cầu `STORAGE_SHARED_SECRET`:

- `upload`: lưu ảnh và trả file ID.
- `download`: trả base64 cho proxy ảnh đã đăng nhập.
- `delete`: chuyển file vào Trash.
- `health`: kiểm tra thư mục gốc và version.

`doGet?token=<uuid>` là trang xem ảnh công khai. Token được tra cứu trong Supabase; Google Drive file ID không xuất hiện trong URL.

## Giới hạn dung lượng

Mặc định ứng dụng và Apps Script cùng giới hạn 4 MB/ảnh. Ảnh được truyền base64 nên kích thước request lớn hơn file gốc; không nên tăng quá cao nếu chưa kiểm thử quota và thời gian thực thi.
