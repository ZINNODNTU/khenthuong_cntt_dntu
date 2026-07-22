# Google Apps Script – cổng lưu trữ ảnh

Apps Script này thay thế hoàn toàn Google Drive OAuth trong Next.js/Vercel.

## Chức năng

- Nhận ảnh base64 từ Next.js bằng `doPost`.
- Kiểm tra shared secret, MIME, chữ ký ảnh và dung lượng.
- Tạo thư mục và lưu ảnh vào Google Drive.
- Trả ảnh cho route nội bộ của Next.js.
- Xóa ảnh bằng cách chuyển file vào thùng rác.
- Cho phép người có public token xem ảnh mà không đăng nhập.

## Cấu hình

1. Tạo project tại `script.google.com` bằng tài khoản sở hữu Google Drive.
2. Dán `Code.gs` và nội dung `appsscript.json`.
3. Trong **Project Settings → Script Properties**, thêm:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
4. Chạy hàm `setupStorage()` một lần và cấp quyền Google Drive.
5. Mở **Executions/Logs**, sao chép:
   - `DRIVE_ROOT_FOLDER_ID`
   - `STORAGE_SHARED_SECRET`
6. Deploy → New deployment → Web app:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Sao chép URL kết thúc bằng `/exec`.
8. Trên Vercel đặt:

```env
GOOGLE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
GOOGLE_APPS_SCRIPT_SHARED_SECRET=gia_tri_STORAGE_SHARED_SECRET
```

## Script Properties đầy đủ

```text
STORAGE_SHARED_SECRET=<chuỗi bí mật>
DRIVE_ROOT_FOLDER_ID=<ID thư mục Drive>
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SECRET_KEY=<Supabase secret/service-role key>
MAX_IMAGE_SIZE_BYTES=4194304
```

Mỗi lần chỉnh `Code.gs`, hãy tạo **deployment version mới** hoặc cập nhật deployment hiện tại.
