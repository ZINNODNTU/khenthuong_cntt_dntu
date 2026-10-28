# Khắc phục email khôi phục chuyển về localhost — 28/10/2026

## Chẩn đoán từ production

Khi sinh viên nhấn liên kết đặt lại mật khẩu trong email, trình duyệt mở
`http://localhost:3000/auth/confirm?token_hash=...&type=recovery`
và báo `ERR_CONNECTION_REFUSED`. Đây là **URL của máy chạy local**, không phải website Vercel.
Căn nguyên đã được xác minh trực tiếp tại **Supabase Dashboard → Authentication → URL Configuration**:
**Site URL = `http://localhost:3000`**. Mẫu email dùng biến `{{ .SiteURL }}`, nên gửi liên kết sai host.

**Đã thực hiện trên Supabase production:** Đổi Site URL trực tiếp thành
`https://khenthuong-cntt-dntu.vercel.app`. Dashboard hiển thị
`Successfully updated site URL`. Redirect allow list đã tồn tại 5 mục, trong đó có
`https://khenthuong-cntt-dntu.vercel.app/auth/finish`,
`https://khenthuong-cntt-dntu.vercel.app/auth/finish?mode=recovery` và
`https://khenthuong-cntt-dntu.vercel.app/auth/confirm`.
Không xóa các URL local được dùng cho phát triển.

## Chống tái diễn trong repository

- Hai mẫu `recovery.html` và `confirm-signup.html` được cố định host production
  `https://khenthuong-cntt-dntu.vercel.app` trong nút xác nhận; mã `{{ .TokenHash }}`
  vẫn được Supabase thay thế bằng mã ngẫu nhiên khi gửi.
- Bộ phát hành `scripts/publish-supabase-email-templates.mjs` kiểm tra đúng host,
  và nếu được chạy với `--apply` cùng `SUPABASE_ACCESS_TOKEN` có quyền, sẽ
  đồng bộ Site URL + redirect allow list mà không loại bỏ các URL cũ.
- Test mới kiểm soát hồi quy nếu template chứa `localhost` hoặc `http://`.

**Quan trọng:** Commit GitHub / deployment Vercel không tự ghi email HTML vào Supabase.
Hiện tại lỗi `localhost` đã được sửa **trực tiếp bằng Site URL**. Hai mẫu HTML
trong repository chỉ có hiệu lực khi cập nhật qua Dashboard hoặc Management API;
không khẳng định chúng đã được đồng bộ remote.

## Nghiệm thu sau chỉnh sửa

1. Yêu cầu email **mới** tại `https://khenthuong-cntt-dntu.vercel.app/forgot-password`;
   liên kết email cũ có thể hết hạn, bị sử dụng hoặc chứa token lộ từ ảnh chụp.
2. Kiểm tra bằng cách đưa chuột lên nút trong email mới, host phải là
   `https://khenthuong-cntt-dntu.vercel.app` (không nhấn link lạ).
3. Nhấn email → trang `/auth/confirm` → chủ động nhấn nút → `/reset-password`
   → nhập mật khẩu mới → đăng nhập. Không ghi token thật hoặc mật khẩu vào logs/chat.
4. Nếu HTTP 200 từ Auth API nhưng không thấy thư trong Inbox/Spam thì kiểm tra SMTP/Auth logs
   riêng, vì nhận yêu cầu khác với gửi thư đến hộp thư.

## Bằng chứng

- Dashboard (28/10/2026): toast `Successfully updated site URL`, giao diện hiển thị đúng Vercel.
- Các callback production hiện diện trong redirect allow list.
- Chưa xác minh được thao tác đổi mật khẩu thành công bằng token thực (không dùng token
  xuất hiện trong ảnh người dùng vì đã lộ).
