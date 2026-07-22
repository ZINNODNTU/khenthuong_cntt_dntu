# Hệ thống xét duyệt thành tích Khoa CNTT — v1.0.0

## Thay đổi chính

### MSSV tự động theo email

Tài khoản sinh viên bắt buộc dùng định dạng:

```text
MSSV@dntu.edu.vn
```

Ví dụ:

```text
210001234@dntu.edu.vn
```

Hệ thống tự lấy MSSV là:

```text
210001234
```

Người nộp không thể tự nhập hoặc thay đổi MSSV trong hồ sơ.

### Tự cấp tài khoản Chi đoàn và CLB

Khi quản trị viên thêm Chi đoàn hoặc CLB, hệ thống tự tạo tài khoản:

```text
<MÃ_ĐƠN_VỊ viết thường>@dntu.edu.vn
```

Ví dụ:

```text
22DTH1  -> 22dth1@dntu.edu.vn
CLB-AI  -> clb-ai@dntu.edu.vn
```

Mật khẩu khởi tạo:

```text
123456
```

Tài khoản phải đổi mật khẩu ở lần đăng nhập đầu tiên.

Với 19 Chi đoàn có sẵn trong database, mở `/branches` và bấm **Cấp tài khoản cho các Chi đoàn còn thiếu**.

## Database

Chỉ dùng đúng hai file:

```text
supabase/database/00_RESET_DATABASE.sql
supabase/database/01_SETUP_DATABASE.sql
```

Sau khi chạy lại database:

1. Tạo admin bằng `CREATE_INITIAL_ADMIN.bat`.
2. Đăng nhập admin.
3. Vào `/branches` để cấp tài khoản cho 19 Chi đoàn có sẵn.
4. Thêm CLB tại `/clubs`; tài khoản CLB được tạo ngay.
5. Tạo tài khoản sinh viên/cán bộ tại `/admin/users`.
6. Tạo đợt xét tại `/periods`.

## Chạy kiểm tra

```powershell
pnpm install --no-frozen-lockfile
pnpm verify
pnpm db:verify
pnpm typecheck
pnpm build
pnpm dev
```

## Quy ước tài khoản

- Sinh viên nhập MSSV; email được tạo thành `MSSV@dntu.edu.vn`.
- Chi đoàn `22DTH1` dùng `22dth1@dntu.edu.vn`.
- CLB dùng mã CLB viết thường trước `@dntu.edu.vn`.
- Mật khẩu khởi tạo tài khoản đơn vị: `123456`.
- Tài khoản đơn vị bắt buộc đổi mật khẩu ngay lần đăng nhập đầu tiên.
- Với 19 Chi đoàn được tạo sẵn từ database, mở `/branches` và dùng nút cấp tài khoản cho các Chi đoàn còn thiếu.


## Vercel

Xem `docs/VERCEL_BUILD_FIX.md`. Lệnh deploy chỉ chạy `next build`; chạy `pnpm check` riêng trước khi đẩy mã nguồn.
## Giao diện điều hướng

Sidebar được hiển thị cố định trên desktop và chuyển thành menu trượt trên mobile. Xem `docs/PROFESSIONAL_SIDEBAR.md`.


## Giao diện hiện đại

- Sidebar desktop có thể mở/thu gọn và ghi nhớ trạng thái.
- Mobile dùng menu drawer.
- Nút trợ giúp trên topbar hiển thị hướng dẫn theo vai trò.
- Design System nằm tại `app/modern-ui.css`.
- Quy chuẩn UX nằm tại `docs/UI_UX_STANDARD.md`.


## Trang đầu và email xác nhận

- `/` là trang đăng nhập chính.
- Người đã đăng nhập được chuyển đến không gian đúng vai trò.
- Người chưa đăng nhập khi mở trang bảo vệ được đưa về `/` và quay lại trang
  ban đầu sau khi đăng nhập.
- Email xác nhận dùng SMTP riêng được cấu hình trong Supabase.
- Mẫu thư nằm tại `supabase/email-templates`.
- Hướng dẫn nằm tại `docs/CUSTOM_SMTP_CONFIRMATION_EMAIL.md`.
