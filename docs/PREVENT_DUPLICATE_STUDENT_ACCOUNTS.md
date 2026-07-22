# Chặn tài khoản trùng MSSV/email

## Nguyên nhân

Khi Confirm Email đang bật, Supabase có thể trả về một đối tượng người dùng
được làm mờ khi email đã tồn tại. Giao diện cũ đăng ký trực tiếp bằng
`auth.signUp()` nên có thể hiển thị thành công dù tài khoản đã có.

## Cơ chế mới

1. Form gửi dữ liệu đến `/api/auth/register`.
2. API server kiểm tra Chi đoàn, profile và registry.
3. MSSV được đặt khóa duy nhất trước khi gọi Supabase Auth.
4. Database chặn trùng theo cả MSSV và email viết thường.
5. Trigger Auth gắn `auth_user_id` vào registry và từ chối user Auth thứ hai.
6. Xác nhận email chuyển trạng thái registry thành `confirmed`.

## Cập nhật database đang chạy

Không reset database. Mở Supabase SQL Editor và chạy toàn bộ file:

```text
supabase/hotfix/PREVENT_DUPLICATE_STUDENT_ACCOUNTS.sql
```

Sau đó deploy source code mới lên Vercel.

## Kiểm tra tài khoản trùng hiện có

Đặt URL và secret key trong `.env.local`, sau đó chạy:

```powershell
pnpm auth:duplicates:audit
```

Script chỉ báo cáo, không tự xóa tài khoản hoặc hồ sơ.

## Kết quả mong đợi

Lần đăng ký đầu tiên trả về HTTP `201`. Từ lần thứ hai với cùng MSSV/email,
API trả về HTTP `409` và không gửi thêm email xác nhận.
