# Website xét khen thưởng cá nhân Đoàn – Hội Khoa Công nghệ thông tin — v1.0.0

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
liên kết mời thiết lập mật khẩu
```

Tài khoản phải đổi mật khẩu ở lần đăng nhập đầu tiên.

Với 19 Chi đoàn có sẵn trong database, mở `/branches` và bấm **Cấp tài khoản cho các Chi đoàn còn thiếu**.

## Đăng ký sinh viên bằng email trường

Đăng ký tự phục vụ đã được bổ sung tại `/register`: chỉ nhận email sinh viên dạng `MSSV@dntu.edu.vn`, yêu cầu họ tên, Chi đoàn, ngày sinh và số điện thoại, đồng thời bắt buộc xác nhận email trước khi truy cập nộp/xét hồ sơ. Sinh viên có hồ sơ thiếu thông tin sẽ được chuyển sang `/complete-profile`. Xem `docs/EDU_STUDENT_REGISTRATION.md` để cấu hình SMTP/URL và kiểm thử nghiệm thu.

## Database

Để thiết lập **Supabase mới**, xem `docs/SETUP_SUPABASE_NEW_PROJECT.md`. Trên project thực sự chưa có schema CNTT, chạy `pnpm supabase:sql` để tạo `INSTALL_NEW_PROJECT.sql`; sau đó chủ project áp dụng bằng SQL Editor. Bộ gốc gồm các migration theo thứ tự:

```text
-- KHÔNG chạy 00_RESET_DATABASE.sql (xóa dữ liệu)
supabase/database/01_SETUP_DATABASE.sql
supabase/database/02_CRITERIA_9.sql
supabase/database/03_REVIEW_WORKFLOW.sql
supabase/database/04_AWARD_SCORING.sql
supabase/database/05_CRITERION_EVIDENCE_BINARY.sql
supabase/database/06_SECURITY_HARDENING.sql
supabase/database/07_EVIDENCE_ENTRIES.sql
supabase/database/08_COLLECTIVE_CRITERIA_T.sql
supabase/database/09_EVIDENCE_CONTENT_INTEGRITY.sql
```

**Trước khi chạy SQL hãy sao lưu và kiểm tra schema hiện có**; nếu đã có bảng, không chạy lại file 01. Khởi tạo và kiểm tra kết nối: `pnpm supabase:check`. Phần API Auth 200 không chứng minh đã có bảng nghiệp vụ.

Sau khi khởi tạo schema bằng tài khoản chủ Supabase:

1. Tạo admin bằng `CREATE_INITIAL_ADMIN.bat`.
2. Đăng nhập admin.
3. Vào `/branches` để cấp tài khoản cho 19 Chi đoàn có sẵn.
4. Thêm CLB tại `/clubs`; tài khoản CLB được tạo ngay.
5. Tạo tài khoản sinh viên/cán bộ tại `/admin/users`.
6. Tạo đợt xét tại `/periods`.
7. Chỉ tiếp nhận hồ sơ **cá nhân C1–C9**. Thống nhất minh chứng và điều kiện theo `docs/TIEU_CHI_CA_NHAN_DOAN_HOI_2026-10-18.md` trước khi mở đợt xét.
8. Người nộp cung cấp minh chứng theo từng tiêu chí; người xét duyệt chỉ xác nhận **Đạt / Không đạt**, không nhập hoặc tổng hợp điểm số.

Xem `docs/TIEU_CHI_CA_NHAN_DOAN_HOI_2026-10-18.md` và `docs/GOOGLE_DRIVE_GATEWAY_V2_2026-10-09.md` để nghiệm thu nghiệp vụ và lưu tệp minh chứng. Chức năng chấm điểm là dữ liệu lịch sử, không áp dụng cho kết luận mới. Với database có dữ liệu thật **không chạy RESET**, chỉ bổ sung migration còn thiếu sau khi sao lưu và kiểm tra SQL ở staging.

## Chạy kiểm tra

```powershell
pnpm install --no-frozen-lockfile
pnpm verify
pnpm db:verify
pnpm criteria:test
pnpm typecheck
pnpm build
pnpm dev
```

## Quy ước tài khoản

- Sinh viên nhập MSSV; email được tạo thành `MSSV@dntu.edu.vn`.
- Chi đoàn `22DTH1` dùng `22dth1@dntu.edu.vn`.
- CLB dùng mã CLB viết thường trước `@dntu.edu.vn`.
- Mật khẩu khởi tạo tài khoản đơn vị: `liên kết mời thiết lập mật khẩu`.
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
- Design System nằm tại `app/globals.css`.
- Quy chuẩn UX nằm tại `docs/UI_UX_STANDARD.md`.


## Trang đầu và email xác nhận

- `/` là trang đăng nhập chính.
- Người đã đăng nhập được chuyển đến không gian đúng vai trò.
- Người chưa đăng nhập khi mở trang bảo vệ được đưa về `/` và quay lại trang
  ban đầu sau khi đăng nhập.
- Email xác nhận dùng SMTP riêng được cấu hình trong Supabase.
- Mẫu thư nằm tại `supabase/email-templates`.
- Hướng dẫn nằm tại `docs/CUSTOM_SMTP_CONFIRMATION_EMAIL.md`.


## Chống tài khoản trùng MSSV

- Đăng ký được xử lý tại API server, không gọi `signUp` trực tiếp từ trình duyệt.
- Mỗi MSSV/email chỉ có một bản ghi trong `student_account_registry`.
- Database chặn đồng thời theo MSSV và email không phân biệt chữ hoa/thường.
- Với database đang chạy, thực thi `supabase/hotfix/PREVENT_DUPLICATE_STUDENT_ACCOUNTS.sql`.
- Xem `docs/PREVENT_DUPLICATE_STUDENT_ACCOUNTS.md`.

