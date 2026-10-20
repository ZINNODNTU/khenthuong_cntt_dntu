# Chẩn đoán email Quên mật khẩu (Supabase Auth)

Dự án: cổng xét khen thưởng Đoàn – Hội Khoa CNTT DNTU.

## Đã kiểm tra

- Vào ngày 20/10/2026, một lần gọi `POST /auth/v1/recover` tới đúng Supabase project bằng public key và redirect production trả về **HTTP 200**.
- Trạng thái 200 nghĩa là yêu cầu được Supabase tiếp nhận, **không xác nhận** email đã được gửi hoặc nhận, cũng **không xác nhận** địa chỉ email thuộc một tài khoản Auth hiện có.
- Giao diện trước đây bỏ qua lỗi Supabase (trừ rate limit), khiến một số lỗi SMTP cũng hiện trạng thái thành công. Đã sửa để trả thông báo lỗi trung tính, không tiết lộ địa chỉ có/không có tài khoản.
- Browser test kiểm tra nhánh lỗi SMTP (HTTP 500), nhánh thành công (HTTP 200) và xác thực trang đặt lại mật khẩu.
- Khi SMTP đã cấu hình nhưng email chưa đến, chỉ có thể kết luận sau khi kiểm tra Supabase Auth Logs và thư đến của tài khoản kiểm thử sở hữu hợp pháp.

## Quy trình kiểm tra thực tế (đúng project)

1. Vào **Supabase Dashboard → Authentication → Users**: xác định tài khoản đã thực sự được tạo dưới đúng email sinh viên. Không gửi yêu cầu vào email admin cũ không sở hữu hoặc email chưa được đăng ký.
2. Vào **Authentication → Emails → SMTP Settings**: xác nhận Custom SMTP còn bật, Sender email đúng tài khoản DNTU có quyền gửi, host và port Google Workspace đúng (ví dụ `smtp.gmail.com`, SSL port 465), mật khẩu là **App Password** chưa bị thu hồi. Không công bố bí mật.
3. Vào **Authentication → Logs** (hoặc Logs Explorer, lọc auth) sau khi thực hiện đúng **một** lần quên mật khẩu với email kiểm thử đã đăng ký: xem lỗi `Error sending recovery email`, SMTP authentication / delivery / quota, và rate limiting nếu có.
4. Kiểm tra Hộp thư đến, Spam, All Mail, hoặc lọc thư theo **sender** và tiêu đề `Đặt lại mật khẩu`. Chờ vài phút; không nhấn liên tục để tránh khóa tần suất.
5. **Authentication → URL Configuration**: Site URL phải là `https://khenthuong-cntt-dntu.vercel.app` (không phải localhost); Redirect URLs có `https://khenthuong-cntt-dntu.vercel.app/auth/finish` (bao gồm các URL có `?mode=recovery` theo cấu hình Supabase) và `/auth/confirm`. Nếu cho phép redirect chính xác, thêm `https://khenthuong-cntt-dntu.vercel.app/auth/finish?mode=recovery`. URL Configuration không thay thế SMTP.
6. **Authentication → Emails → Templates → Reset password**: nếu dùng custom HTML theo repo, lưu template từ `supabase/email-templates/recovery.html` vào chính Supabase Dashboard. GitHub/Vercel không tự cập nhật Supabase Auth templates. Đảm bảo template dùng `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`: xác minh OTP server-side, đặt session cookie rồi đến `/reset-password`. Đường dẫn `/auth/finish?mode=recovery` chỉ dùng làm phương án tương thích thư cũ. Không dán mã xác thực hay mật khẩu vào email.
7. Kiểm thử thông suốt **nhận email → mở link → đặt lại mật khẩu → đăng nhập lại**, dùng đúng tài khoản test có quyền sở hữu. Không sử dụng mail của sinh viên khác hoặc tài khoản admin không sở hữu.

## Quy ước phản hồi frontend

- Nếu Supabase trả lỗi SMTP/hệ thống: hiện lỗi “Hệ thống chưa tiếp nhận được yêu cầu khôi phục”.
- Nếu Supabase trả HTTP 429: báo đang giới hạn tần suất.
- Nếu Supabase trả HTTP 200: chỉ nói “Đã tiếp nhận yêu cầu”, kèm điều kiện email có tài khoản hợp lệ. Không khẳng định email đã vào inbox.
- Không cho người dùng biết địa chỉ email có tồn tại trong Authentication → Users hay không.

## Trạng thái hiện tại

Chưa thể xác minh khả năng gửi email tới Inbox vì phiên điều khiển Dashboard/Gmail thực tế không được cấp quyền truy cập trong thời điểm kiểm tra. **Không kết luận SMTP đã phát thư thành công chỉ từ mã HTTP 200**.
