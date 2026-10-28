# Khắc phục liên kết khôi phục và thời gian gửi email — 28/10/2026

## Hiện tượng

Trang `/auth/finish` hiện "Liên kết không hợp lệ hoặc đã hết hạn" dù người dùng vừa nhận thư. Người dùng cũng gặp thời gian chờ lâu khi gửi recovery email. Lỗi hiển thị có thể đến từ token đã bị dùng, email cũ bị vô hiệu sau lần gửi khác, hoặc session cookie không được đính kèm khi đổi token thành phiên đăng nhập; không suy đoán từ ảnh rằng SMTP giao chậm là nguyên nhân trực tiếp.

## Thay đổi thực hiện

1. Mở trực tiếp Supabase Dashboard chính xác của dự án. Body template Reset password trước đó khác với file repository. Cập nhật mẫu khôi phục HTML chứa đường dẫn trực tiếp `https://khenthuong-cntt-dntu.vercel.app/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` và lưu qua Dashboard. Mẫu mới dùng token hash; GET chỉ hiển thị nút xác nhận, tránh link scanner làm tiêu thụ mã.
2. Đổi `POST /auth/confirm` sang Supabase SSR client với `getAll/setAll` ràng buộc cookie vào chính HTTP 303 redirect tới `/reset-password`. Trước đó dùng client cookie store riêng rồi tạo response 303 độc lập.
3. Phân loại lỗi hết hạn hoặc lỗi dịch vụ (không tiết lộ token, email, nội dung trả về), giúp hướng dẫn chính xác hơn.
4. Tăng thời gian chờ Supabase SMTP trong API từ 15 lên 35 giây, client từ 20 lên 40 giây. Đây là tránh báo lỗi sớm khi thư có thể đã được gửi; **không phải giảm thời gian SMTP thực tế**.
5. Hiển thị trạng thái xử lý sau 4/12 giây; cấm nhấp lại khi đang gửi. Nếu lỗi hoặc mạng ngắt, khuyên kiểm tra Inbox và Spam trước khi tạo mã khác, tránh vô hiệu mã đang được gửi.
6. Bổ sung thời lượng kết nối Supabase trên log server dưới dạng nhóm thời gian/status, không ghi nhận email, token hoặc mật khẩu.

## Nghiệm thu

- `pnpm run check`: 69/69 unit tests.
- `pnpm exec playwright test tests/email-confirmation.spec.ts tests/email-resend.spec.ts tests/individual-award-portal.spec.ts`: 19/19 PASS.
- `pnpm run build`: PASS.
- Nghiệm thu cuối bắt buộc: tạo **một** email khôi phục mới, mở nút trong email mới nhất, nhấn xác nhận thủ công, vào trang đặt lại mật khẩu; người sử dụng tự đổi mật khẩu và xác nhận đăng nhập lại. Không đăng/chụp URL có `token_hash`.
- Email đến Inbox và API 200 không tự chứng minh liên kết đã xác minh hoặc đổi mật khẩu thành công.
- Nếu thời gian thực tế vẫn dài, xác định độ trễ SMTP từ Supabase Auth Logs và server log `[auth.email.timing]`; có thể cân nhắc dịch vụ SMTP chuyên dụng nếu chủ hệ thống đồng ý. Không tắt xác thực/rate limit để tăng tốc.
