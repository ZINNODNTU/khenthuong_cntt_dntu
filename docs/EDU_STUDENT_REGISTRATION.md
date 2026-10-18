# Đăng ký sinh viên và xác nhận email trường — 08/10/2026

## Tình trạng triển khai

- Đã áp dụng migration `supabase/migrations/20261008150500_edu_registration_onboarding.sql` vào project `nzoamsyazdafyqnsxkny`. Không chạy RESET.
- Đã bật `PUBLIC_SIGNUP_ENABLED=true` **trong file .env.local** trên máy phát triển. Khi deploy, cần cấu hình biến này trên máy chủ/Vercel riêng.
- Supabase Auth đang có `mailer_autoconfirm=false`, `disable_signup=false`, tức là bắt buộc xác minh email và đăng ký đang được cho phép.
- Đã bổ sung Redirect URL `http://localhost:3000/auth/finish` vào cấu hình Auth của Supabase bằng CLI; luồng **mẫu email mặc định** dùng URL này để trở lại website.
- Supabase Free đang dùng default mail provider **không cho cập nhật email template** qua API. Khi cấu hình SMTP riêng có thể áp dụng mẫu `supabase/email-templates/confirm-signup.html`. **Chưa xác nhận thư gửi tới email sinh viên DNTU thực tế**: cần thử bằng hộp thư do chính sinh viên sở hữu.
- `SUPABASE_SECRET_KEY` không cần cho đăng ký công khai; các API quản trị khác vẫn cần khóa server.

## Quy trình sinh viên

1. Vào `/register`, cung cấp **họ tên, địa chỉ sinh viên MSSV@dntu.edu.vn, Chi đoàn, ngày sinh (>= 18 tuổi), số điện thoại và mật khẩu**. Các trường đều bắt buộc.
2. Backend Zod chặn sai định dạng và tra Chi đoàn hoạt động qua chính sách RLS cho anon (chỉ bảng `branches`).
3. Supabase Auth tạo tài khoản vai trò `submitter` và gửi thư xác nhận. Tài khoản không được phép đăng nhập khi chưa xác minh email (Email confirmations enabled).
4. Sinh viên bấm liên kết trong email; Supabase xử lý xác minh, đưa về `/auth/finish`, sau đó đăng nhập tại `/login`.
5. `profiles.profile_completed_at` chỉ được ghi nếu thông tin từ đăng ký hợp lệ theo quy tắc kiểm tra **trong PostgreSQL**, hoặc khi sinh viên đã xác minh email dùng trang `/complete-profile` để bổ sung. Không nhận dữ liệu quyền `admin/reviewer` từ client.
6. Mục `/submitter` và `/applications/*` đều kiểm tra trạng thái email và hồ sơ qua server. Các API tạo/sửa hồ sơ, tải minh chứng kiểm tra tương tự, cộng với policy **restrictive** ở PostgreSQL chặn insert/update `applications` khi tài khoản sinh viên chưa hoàn thiện.

## Phạm vi áp dụng

- Sinh viên đăng ký qua email `MSSV@dntu.edu.vn` — phù hợp hệ thống xác định MSSV từ email, không phải tất cả email tùy ý chứa `.edu.vn`.
- Tài khoản **Admin/Reviewer** và tài khoản tập thể Chi đoàn/CLB không bị bắt hoàn thiện hồ sơ cá nhân.
- Sinh viên đã được cấp tài khoản từ trước nhưng thiếu trường mới sẽ được chuyển sang `/complete-profile`. Không xóa/ghi đè dữ liệu cũ.
- Dữ liệu đăng ký hoàn chỉnh chỉ xác thực quyền sở hữu email trường, không tự động chứng minh thông tin khai báo là đúng; việc thẩm định vẫn thuộc cán bộ.

## Thiết lập email production

Ở Supabase Dashboard → Authentication:
- Providers → Email: bật Confirm email; không bật tự động xác nhận.
- URL Configuration: đặt Site URL theo domain HTTPS chính thức và bổ sung URL HTTPS `/auth/finish` (cập nhật `NEXT_PUBLIC_APP_URL` của Next.js tương ứng).
- Thiết lập **custom SMTP** có quyền gửi tới email bên ngoài Supabase team và SPF/DKIM/DMARC, kiểm tra quota/rate limit. Default Supabase mail có giới hạn gửi và không bảo đảm nhận ở hộp thư DNTU.
- Khi dùng custom SMTP, có thể cập nhật template với Supabase CLI hoặc Dashboard; giữ tương thích giữa URL trong template và hai route `/auth/confirm` (token_hash) / `/auth/finish` (default provider redirect).

## Kiểm thử không tạo tài khoản giả

```powershell
pnpm check
pnpm build
pnpm exec playwright test tests/student-registration.spec.ts tests/login-experience.spec.ts --reporter=line
```

**Test nghiệm thu thủ công cần hộp thư sinh viên thật**: đăng ký → nhận thư → nhấp xác nhận → đăng nhập → được vào `/submitter`; trường hợp email chưa xác minh/tài khoản bỏ trống phải bị chặn. Không gửi mật khẩu, access token hay OTP trong chat.
