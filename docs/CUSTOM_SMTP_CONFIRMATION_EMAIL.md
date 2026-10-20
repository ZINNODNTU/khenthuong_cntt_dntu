# Email xác nhận bằng SMTP riêng

## Mục tiêu

Email đăng ký không dùng dịch vụ gửi thử nghiệm mặc định. Supabase Auth
sẽ gửi email xác nhận từ một hộp thư chuyên dụng của hệ thống.

Ví dụ quy ước:

```text
Tên người gửi: Khen thưởng CNTT DNTU
Email người gửi: <email-xac-nhan-rieng>@ten-mien-cua-don-vi
```

Địa chỉ trên phải là hộp thư hoặc bí danh có quyền gửi thực tế.

## 1. Cấu hình URL

Trong Supabase Dashboard, mở phần Authentication URL Configuration:

```text
Site URL:
https://TEN-MIEN-THAT-CUA-HE-THONG

Redirect URLs:
https://TEN-MIEN-THAT-CUA-HE-THONG/auth/confirm
https://TEN-MIEN-THAT-CUA-HE-THONG/auth/callback
http://localhost:3000/auth/confirm
http://localhost:3000/auth/callback
```

## 2. Bật xác nhận email

Trong Authentication Providers hoặc Sign In / Email:

```text
Allow new users to sign up: ON
Confirm email: ON
```

## 3. Cấu hình Custom SMTP

Trong Authentication → Emails → SMTP Settings, bật SMTP riêng và nhập:

```text
Sender name
Sender email
SMTP host
SMTP port
SMTP username
SMTP password
```

Thông tin SMTP do đơn vị cung cấp email cấp.

Không đặt mật khẩu SMTP trong:

- GitHub.
- `.env.local`.
- Vercel Environment Variables.
- Mã nguồn frontend.

Supabase lưu và sử dụng SMTP này trực tiếp cho email xác nhận Auth.

### Google Workspace/Gmail

Thông thường:

```text
Host: smtp.gmail.com
Port: 587
Username: email chuyên dụng
Password: App Password
```

Tài khoản cần bật xác minh hai bước trước khi tạo App Password.
Sender email nên trùng tài khoản SMTP hoặc là alias được cấp quyền gửi.

## 4. Mẫu email

Trong Authentication → Email Templates → Confirm signup:

Tiêu đề lấy từ:

```text
supabase/email-templates/confirm-signup-subject.txt
```

Nội dung HTML lấy từ:

```text
supabase/email-templates/confirm-signup.html
```

Mẫu sử dụng đường dẫn:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

## 5. Biến hiển thị trên giao diện

Trong Vercel hoặc `.env.local` có thể thêm:

```env
NEXT_PUBLIC_AUTH_EMAIL_SENDER_ADDRESS=email-xac-nhan@ten-mien
```

Biến này chỉ giúp trang đăng ký thông báo người dùng cần tìm email từ địa chỉ
nào. Nó không chứa mật khẩu và không thay thế cấu hình SMTP trong Supabase.


## 7. Khôi phục mật khẩu và mẫu email thống nhất (19/10/2026)

Các template mới trong repository:
- `supabase/email-templates/confirm-signup.html` và `confirm-signup-subject.txt`: xác minh tài khoản.
- `supabase/email-templates/recovery.html` và `recovery-subject.txt`: đặt lại mật khẩu.
- Thiết kế dùng bảng HTML, CSS nội tuyến, tối ưu cho Gmail/Outlook và màn hình điện thoại, không cần tải hình từ máy chủ ngoài.

Cấu hình tại Supabase Dashboard → **Authentication → Email Templates**:
1. Chọn **Confirm signup**, dán tiêu đề từ file subject và HTML tương ứng. Mẫu dùng `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`; server xác minh OTP và đặt session cookie. **Site URL phải đúng tên miền production, tuyệt đối không để localhost**.
2. Chọn **Reset Password/Recovery**, dán tiêu đề và HTML từ các file recovery. Mẫu dùng `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`. Server xác thực rồi chuyển thẳng `/reset-password`. `/auth/finish?mode=recovery` vẫn hỗ trợ các email cũ chưa đổi template. Không gửi mật khẩu qua email.
3. Cấu hình Authentication → **URL Configuration**: Site URL phải là **tên miền production thực tế**; thêm redirect `https://<TEN-MIEN-PRODUCTION>/auth/confirm` và `http://localhost:3000/auth/confirm`.
4. Duy trì SMTP đã được chủ tài khoản email cấp quyền; kiểm tra SPF/DKIM/DMARC và Sender Name. Không dùng địa chỉ DNTU làm người gửi nếu SMTP không được cấp phép.
5. Mở trang `/forgot-password` từ trang đăng nhập; nhập MSSV/email; dùng **tài khoản thử** và hộp thư thuộc quyền sở hữu để kiểm tra. Liên kết xác minh chuyển tới `/reset-password`; nhập mật khẩu mới đủ 12 ký tự, sau đó đăng nhập lại.

**Quan trọng:** Push GitHub và Vercel deploy không tự cập nhật template của Supabase Auth trên cloud. Việc cập nhật template bắt buộc thực hiện trong Supabase Dashboard hoặc Management API có quyền quản trị. Không dùng SQL migration để thay thế email Auth.

### Xuất bản hai template qua Supabase Management API

1. Chạy `pnpm run auth:templates:check` để kiểm tra cú pháp, HTML và URL xác minh mà **không thay đổi** Supabase.
2. Nếu có Supabase Personal Access Token với quyền `auth_config_write`/`project_admin_write`, cung cấp token qua biến môi trường `SUPABASE_ACCESS_TOKEN` trên máy quản trị (không commit, không dán token vào chat).
3. Chạy `node scripts/publish-supabase-email-templates.mjs --apply --project-ref nzoamsyazdafyqnsxkny` để cập nhật **chỉ** subject + HTML của Confirm signup và Reset password. Lệnh không sửa cấu hình SMTP.
4. Kiểm tra lại Authentication → Emails → Templates, sau đó dùng email thử thuộc quyền sở hữu để kiểm tra Inbox/Spam và đường dẫn `/auth/confirm` → `/reset-password`.
5. Xóa biến môi trường token sau khi hoàn tất, và kiểm tra Supabase Auth Logs nếu yêu cầu gửi email thành công nhưng không nhận được.

**Chú ý:** Mẫu dùng `{{ .SiteURL }}`, bắt buộc kiểm tra Site URL đang trỏ `https://khenthuong-cntt-dntu.vercel.app` trong Supabase trước khi publish.

## 6. Kiểm tra

1. Đăng ký bằng một MSSV thử nghiệm.
2. Kiểm tra Hộp thư đến và Spam.
3. Xác nhận tên người gửi và email người gửi.
4. Nhấn liên kết xác nhận.
5. Kiểm tra đường dẫn `/auth/confirm`.
6. Đăng nhập từ trang `/`.
