# Thiết lập Supabase mới cho hệ thống xét khen thưởng CNTT

> **TRẠNG THÁI THỰC TẾ — 08/10/2026:** Supabase CLI đã liên kết project `nzoamsyazdafyqnsxkny`. Bốn migration `20261008140001`–`20261008140004` đã chạy **THÀNH CÔNG** trên project này, 17 bảng ứng dụng có mặt, 19 Chi đoàn được khởi tạo. Edge Function `bootstrap-admin` đã deploy (ACTIVE). `pnpm supabase:check` PASS. **KHÔNG chạy lại INSTALL_NEW_PROJECT.sql hay 01_SETUP_DATABASE.sql trên project này.** Còn thiếu `SUPABASE_SECRET_KEY` trên server, cấu hình Auth URLs/SMTP, tài khoản admin đầu tiên và Google Apps Script lưu minh chứng. Các phần dưới đây là hướng dẫn dành cho project **mới/chưa cài schema**, không phải yêu cầu chạy lại trên project hiện tại.

Cập nhật: 08/10/2026. Dự án: `nzoamsyazdafyqnsxkny`.

## Trạng thái đã kiểm tra

- URL `https://nzoamsyazdafyqnsxkny.supabase.co` và publishable key do chủ dự án cung cấp đã được đặt trong file `.env.local` (bị .gitignore loại trừ).
- `/auth/v1/health` và `/auth/v1/settings` phản hồi HTTP 200: **dịch vụ Supabase Auth kết nối thành công**.
- Trước khi cài đặt, PostgREST trả 404 cho `profiles`. **Sau khi chạy 4 migration qua Supabase CLI, `pnpm supabase:check` PASS trên bảng nghiệp vụ.** Một số bảng chấm điểm trả HTTP 401 với mã 42501 cho khách chưa đăng nhập, là quyền truy cập bị chặn theo thiết kế, không phải lỗi kết nối.
- Schema đã được áp dụng với Supabase CLI đã đăng nhập; khóa công khai không thể chạy DDL. Còn thiếu khóa **server secret** trong `.env.local`, tài khoản admin đầu tiên và kho minh chứng. Edge Function `bootstrap-admin` đã deploy, chỉ chấp nhận thao tác có secret đủ dài.
- Các gói `@supabase/supabase-js` và `@supabase/ssr` đã có trong `package.json`; repo dùng **pnpm**, không dùng `npm install` vì có kiểm tra package manager.

## Bước 1 — Kiểm tra project và schema trên Dashboard

Mở Supabase Dashboard, chọn project có ref **nzoamsyazdafyqnsxkny**, mở **SQL Editor**. Trước khi chạy bất cứ script cài đặt nào, hãy chạy câu truy vấn **chỉ đọc** này:

```sql
select
  to_regclass('public.profiles') as profiles,
  to_regclass('public.applications') as applications,
  to_regclass('public.application_criteria') as application_criteria,
  to_regclass('public.award_rubrics') as award_rubrics;
```

Nếu **tất cả đều NULL** và project chưa từng triển khai ứng dụng CNTT, có thể xem như database mới; dùng gói cài đặt ở Bước 2. Nếu **bất kỳ bảng nào đã tồn tại**, **KHÔNG** chạy `01_SETUP_DATABASE.sql` hay gói cài mới: sao lưu và xác định migration còn thiếu để chạy từng file. Nếu đã có dữ liệu thật cần thử trên staging trước.

## Bước 2 — Tạo schema nghiệp vụ (chỉ project mới)

Tại thư mục dự án, chạy:

```powershell
pnpm supabase:sql
```

Lệnh này tạo file `supabase/database/INSTALL_NEW_PROJECT.sql` bằng cách ghép **đúng thứ tự**:

1. `01_SETUP_DATABASE.sql`: 19 Chi đoàn, hồ sơ, user profiles, RLS, Auth trigger.
2. `02_CRITERIA_9.sql`: bảng xác minh 9 tiêu chí.
3. `03_REVIEW_WORKFLOW.sql`: phân công cán bộ, xác minh và kết luận nguyên tử.
4. `04_AWARD_SCORING.sql`: biểu điểm C1–C6, chấm và snapshot kết quả.

**Không chứa `00_RESET_DATABASE.sql`**. **KHÔNG thực hiện bước này trên project `nzoamsyazdafyqnsxkny` vì đã cài xong schema.** Chỉ với project khác hoàn toàn mới, mở file `INSTALL_NEW_PROJECT.sql`, sao chép SQL vào **Supabase Dashboard → SQL Editor → Run** bằng quyền owner. Script tạo và chỉnh các bảng, function, trigger RLS; hãy xem nội dung/backup trước khi chạy. Nếu gặp lỗi, lưu lỗi và dừng xử lý; không lặp lại toàn bộ gói khi một phần đã được áp dụng.

Chạy SQL xác minh sau khi hoàn thành:

```sql
select
  to_regclass('public.profiles') as profiles,
  to_regclass('public.applications') as applications,
  to_regclass('public.application_criteria') as application_criteria,
  to_regclass('public.criterion_review_history') as criterion_review_history,
  to_regclass('public.award_rubrics') as award_rubrics,
  to_regclass('public.award_score_entries') as award_score_entries;
```

Kết quả mong đợi: sáu cột đều khác NULL.

## Bước 3 — Cấu hình Authentication

Trong **Authentication → URL Configuration**, đặt:
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback` và `http://localhost:3000/auth/confirm`

Khi deploy Vercel, bổ sung HTTPS domain thật cho hai URL trên, đồng thời chỉnh Site URL thành URL chính thức. Giữ Email provider phù hợp và cấu hình SMTP nếu dùng xác nhận qua email.

**Giữ `PUBLIC_SIGNUP_ENABLED=false`** cho tới khi có xác minh quyền sở hữu MSSV. Trong Supabase Dashboard → Authentication → Providers → Email, **tắt tùy chọn cho phép người dùng mới đăng ký (Allow new users to sign up / Enable sign ups, tùy phiên bản Dashboard)** trong giai đoạn chỉ dùng tài khoản do Admin cấp. Đây là cấu hình phía Supabase, không thể thay thế chỉ bằng việc ẩn nút đăng ký trong web. Không mở đăng ký ẩn danh chỉ để thử giao diện.

## Bước 4 — Hoàn thành biến môi trường private

Trong **Supabase Dashboard → Project Settings → API Keys**, lấy khóa **Secret** (`sb_secret_...`) dành cho server. Chỉ chép trực tiếp vào `.env.local` trên máy quản trị hoặc môi trường server deployment, không đưa lên Git/chat/browser:

```env
SUPABASE_SECRET_KEY=sb_secret_...     # thay bằng khóa thật, không dùng publishable key
```

Khóa này **không dùng để chạy SQL DDL** và cần cho các API server tạo hồ sơ/tài khoản. Không đặt tên bắt đầu bằng `NEXT_PUBLIC_`.

Nếu ứng dụng dùng Google Apps Script để lưu minh chứng, còn cần:

```env
GOOGLE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/.../exec
GOOGLE_APPS_SCRIPT_SHARED_SECRET=<secret thực tế của Apps Script>
```

Cấu hình chi tiết tại `docs/APPS_SCRIPT_STORAGE.md`.

## Bước 5 — Tạo admin và cấu hình biểu điểm

Sau khi schema sẵn sàng, đăng nhập Supabase CLI bằng tài khoản quản trị dự án và chạy tại máy quản trị:

```powershell
pnpm dlx supabase@latest login
.\CREATE_INITIAL_ADMIN.ps1 -ProjectRef nzoamsyazdafyqnsxkny
```

Script yêu cầu email `@dntu.edu.vn`, họ tên, mật khẩu tương ứng và triển khai Edge Function bootstrap. Chỉ thực hiện trên project do bạn quản lý; không chia sẻ mật khẩu admin hay secret trong chat. Sau đó đăng nhập web, tạo đợt xét tại `/periods`, cấu hình biểu điểm tại `/admin/rubrics`.

## Bước 6 — Chạy web và nghiệm thu

```powershell
pnpm supabase:check
pnpm check
pnpm build
pnpm dev
```

Khi bảng được tạo, `pnpm supabase:check` cần đạt cả Auth và schema (PostgREST có thể trả HTTP 403 hợp lệ cho truy cập ẩn danh bị RLS chặn). Chỉ có HTTP 200 cho Auth **không** chứng minh đăng nhập, RLS, lưu hồ sơ hoặc chấm điểm hoạt động.

Kiểm thử đầy đủ với admin/reviewer/submitter trên staging, xác nhận các RPC (nhận hồ sơ, chấm C1–C9, nhập điểm, kết luận), xuất CSV, báo cáo và upload ảnh trước khi mở production. Có kế hoạch sao lưu và rollback.

## Ghi chú về code Supabase SSR

Ứng dụng đã sử dụng `lib/supabase/server.ts`, `lib/supabase/browser.ts` và `lib/supabase/proxy.ts` + `proxy.ts`, tương đương các ví dụ `utils/supabase/*` do Supabase cung cấp. **Không** đổi `app/page.tsx` thành trang mẫu `todos` vì đó chỉ là ví dụ kiểm tra kết nối, sẽ làm mất trang đăng nhập hồ sơ xét thưởng.
