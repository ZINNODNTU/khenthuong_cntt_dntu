# Kiểm tra lỗi kho ảnh

## 1. Chạy kiểm tra từ máy phát triển

```powershell
pnpm storage:check
```

Lệnh đọc `.env.local`, gửi yêu cầu `health` đến Web App và hiển thị nguyên nhân thật.

## 2. Các mã lỗi thường gặp

- `STORAGE_URL_INVALID`: URL không kết thúc bằng `/exec` hoặc đang dùng URL trình soạn thảo `/dev`.
- `STORAGE_DEPLOYMENT_PRIVATE`: Web App đang yêu cầu đăng nhập. Cần triển khai `Execute as: Me` và `Who has access: Anyone`.
- `STORAGE_DEPLOYMENT_NOT_FOUND`: Deployment ID không tồn tại hoặc đã bị xóa.
- `STORAGE_SECRET_MISMATCH`: `GOOGLE_APPS_SCRIPT_SHARED_SECRET` không giống `STORAGE_SHARED_SECRET` trong Script Properties.
- `STORAGE_ROOT_NOT_CONFIGURED`: chưa chạy `setupStorage()` hoặc thiếu `DRIVE_ROOT_FOLDER_ID`.
- `STORAGE_PERMISSION_DENIED`: tài khoản triển khai không có quyền với thư mục Drive.
- `STORAGE_INVALID_JSON`: Code.gs mới chưa được đưa vào deployment đang sử dụng.
- `STORAGE_TIMEOUT`: Apps Script xử lý quá lâu hoặc ảnh quá lớn.

## 3. Sau khi sửa Code.gs

Mỗi lần thay Code.gs:

1. `Deploy` → `Manage deployments`.
2. Chọn deployment Web App.
3. `Edit`.
4. Chọn `New version`.
5. `Deploy`.
6. Giữ URL `/exec` của deployment đó trong `.env.local` và Vercel.

Chỉ lưu mã trong trình soạn thảo mà không cập nhật deployment sẽ khiến website tiếp tục chạy bản cũ.
