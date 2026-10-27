# Bàn giao hoàn thiện email CNTT DNTU — 27/10/2026

## Trạng thái đã kiểm tra

- Mã nguồn bổ sung `/resend-confirmation`: gửi lại email đăng ký khi thư thất lạc hoặc link hết hạn.
- `/auth/confirm` nhận link email **bằng GET để hiển thị nút xác nhận**, chỉ gọi `verifyOtp` sau khi người dùng bấm (POST). Tránh các dịch vụ bảo mật email tự quét và tiêu thụ token dùng một lần.
- Luồng Recovery: mở email → trang xác nhận → nút tiếp tục → `/reset-password` → cập nhật mật khẩu.
- Trường hợp link xác nhận đăng ký hết hạn được đưa về `/resend-confirmation`; link recovery hết hạn về `/forgot-password`.
- Mẫu HTML `confirm-signup.html` và `recovery.html` đã cập nhật lời hướng dẫn tương ứng. Mẫu tự chứa CSS inline, không kéo ảnh theo dõi từ ngoài.
- Không báo đã phát đến Inbox khi Supabase chỉ trả HTTP 200.
- `scripts/publish-supabase-email-templates.mjs` hỗ trợ local check, remote read-only comparison, và cập nhật 2 mẫu có kiểm chứng; **không cấu hình/chạm mật khẩu SMTP**.
- Ngày 27/10/2026, trình duyệt Chrome được gắn profile DNTU nhưng Supabase Dashboard yêu cầu đăng nhập GitHub, không có phiên xác thực hợp lệ để sửa Auth Templates.
- Không có `SUPABASE_ACCESS_TOKEN` trong session máy quản trị. Do đó **chưa đăng/publish template mới lên Supabase**. Chưa xác nhận Inbox thực tế.
- Thử POST JSON trống lên `/api/auth/register` production trả **HTTP 503** với thông báo **“Bộ bảo vệ tần suất đang không khả dụng. Vui lòng liên hệ quản trị.”**. Đây là kiểm tra không tạo tài khoản. Cần kiểm tra `SUPABASE_SECRET_KEY` (server-only) trên Vercel, quyền gọi RPC `public.consume_security_rate_limit` và migration 06; hệ thống phải giữ cơ chế fail-closed, **không tắt rate limiter để lách 503**. Chưa xác định chính xác nguyên nhân bên trong production.
- Local trước đó thiếu `SUPABASE_SECRET_KEY` cho API cần service-role. Không suy đoán trạng thái secret trên Vercel.
- Kiểm thử tự động phải chạy lại sau mỗi thay đổi / sau release.

## Cấu hình Supabase production (phải dùng đúng project)

Project ref: `nzoamsyazdafyqnsxkny` (đối chiếu lại với owner/project).
Site URL: `https://khenthuong-cntt-dntu.vercel.app`.
Redirect allow list cần có:

- `https://khenthuong-cntt-dntu.vercel.app/auth/finish`
- `https://khenthuong-cntt-dntu.vercel.app/auth/finish?mode=recovery`
- `https://khenthuong-cntt-dntu.vercel.app/auth/confirm`
- `http://localhost:3000/auth/finish` (chỉ khi dùng môi trường local)

Supabase Authentication → Providers → Email: bật Confirm email, không tự xác nhận khi signup.

Authentication → SMTP Settings: bật Custom SMTP bằng địa chỉ hộp thư được phép gửi, sender name `Đoàn – Hội Khoa CNTT DNTU`. Nếu dùng Gmail/Google Workspace, kiểm tra host `smtp.gmail.com` và port 465 (SSL) hoặc 587 (STARTTLS) theo dịch vụ cấp, username/email đúng hộp thư gửi, App Password hoặc cơ chế xác thực được quản trị Workspace cho phép. **Không đưa username/password SMTP lên frontend, Git hoặc chat.** Cấu hình SPF, DKIM, DMARC theo tên miền người gửi thực.

Authentication → Emails → Templates:
- **Confirm signup**: Subject file `supabase/email-templates/confirm-signup-subject.txt`; HTML `supabase/email-templates/confirm-signup.html`.
- **Reset password**: Subject file `supabase/email-templates/recovery-subject.txt`; HTML `supabase/email-templates/recovery.html`.

Template dùng `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=...`. Khi mở đường dẫn, phải bấm thêm nút xác nhận trên trang web (chống link prefetch).

## Đồng bộ template qua Management API

Chỉ quản trị viên project được cấp PAT mới chạy:

```powershell
pnpm run auth:templates:check
# Đặt SUPABASE_ACCESS_TOKEN chỉ trong session an toàn, không echo/chụp màn hình.
node scripts/publish-supabase-email-templates.mjs --verify-remote --project-ref nzoamsyazdafyqnsxkny
node scripts/publish-supabase-email-templates.mjs --apply --project-ref nzoamsyazdafyqnsxkny
node scripts/publish-supabase-email-templates.mjs --verify-remote --project-ref nzoamsyazdafyqnsxkny
```

Khi không có PAT, thực hiện qua giao diện Dashboard, lưu từng mẫu, kiểm tra lại từng mẫu được lưu. Push GitHub **không** tự đồng bộ Auth email templates.

## Nghiệm thu email và sự cố

1. Với tài khoản **thử nghiệm đã đăng ký**, địa chỉ hộp thư thuộc quyền sở hữu, gọi `/forgot-password` đúng **một lần**. Kiểm tra Supabase Auth Logs, thư Inbox/Spam/All Mail, sender, thời gian, DKIM. Mã HTTP 200 không phải xác nhận giao thư.
2. Mở email reset từ Inbox → `/auth/confirm` (GET hiển thị nút, chưa tiêu token) → bấm nút → trang `/reset-password` → đặt mật khẩu đủ 12 ký tự → đăng nhập lại thành công.
3. Với một tài khoản test chưa kích hoạt, kiểm tra `/resend-confirmation` và luồng đăng ký/xác nhận, không dùng email của sinh viên hoặc tài khoản admin không sở hữu.
4. Test link hết hạn / link bị bấm 2 lần; phải có thông báo và trang gửi lại tương ứng.
5. Kiểm tra lỗi SMTP 500, giới hạn tần suất 429, không làm lộ email nào đã đăng ký.
6. Nếu Auth Logs hiển thị gửi được nhưng không nhận, kiểm tra SPF/DKIM/DMARC, Gmail Spam, sender alias và chính sách Google Workspace; nếu logs lỗi auth SMTP, xác thực lại App Password hoặc quyền gửi.

## Điều kiện hoàn thành phần mail

**Chỉ đánh dấu DONE production khi**: template đã publish và xác minh remote, Site URL + redirect đúng, Auth Confirm email bật, SMTP gửi được tới Inbox hộp thư được sở hữu, E2E Signup + Recovery thực tế PASS, 503 đăng ký trên production được xử lý. Các điều kiện này **chưa được xác nhận** trong phiên này.
