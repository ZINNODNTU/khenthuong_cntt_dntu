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
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/
```

## 5. Biến hiển thị trên giao diện

Trong Vercel hoặc `.env.local` có thể thêm:

```env
NEXT_PUBLIC_AUTH_EMAIL_SENDER_ADDRESS=email-xac-nhan@ten-mien
```

Biến này chỉ giúp trang đăng ký thông báo người dùng cần tìm email từ địa chỉ
nào. Nó không chứa mật khẩu và không thay thế cấu hình SMTP trong Supabase.

## 6. Kiểm tra

1. Đăng ký bằng một MSSV thử nghiệm.
2. Kiểm tra Hộp thư đến và Spam.
3. Xác nhận tên người gửi và email người gửi.
4. Nhấn liên kết xác nhận.
5. Kiểm tra đường dẫn `/auth/confirm`.
6. Đăng nhập từ trang `/`.
