# Khởi tạo cơ sở dữ liệu Supabase cho CNTT

**Hướng dẫn mới nhất:** `docs/SETUP_SUPABASE_NEW_PROJECT.md` (kiểm tra URL, quyền, tạo schema và admin). Tài liệu này không hướng dẫn xóa dữ liệu nữa.

## 1. Project mới chưa có schema CNTT

1. Vào Supabase Dashboard → SQL Editor và xác nhận schema chưa có `public.profiles` và `public.applications`:
   ```sql
   select to_regclass('public.profiles'), to_regclass('public.applications');
   ```
2. Chạy `pnpm supabase:sql` trong workspace để tạo gói `supabase/database/INSTALL_NEW_PROJECT.sql`.
3. Chủ project mở SQL Editor, kiểm tra gói và chạy bằng quyền owner. File đã bao gồm migration `01_SETUP_DATABASE.sql`, `02_CRITERIA_9.sql`, `03_REVIEW_WORKFLOW.sql`, `04_AWARD_SCORING.sql` theo thứ tự.
4. Kiểm tra bảng, phân quyền/RLS và Auth trigger, sau đó chạy `pnpm supabase:check`.

**Không chạy `00_RESET_DATABASE.sql`**. Script RESET xóa schema/ứng dụng và có thể xóa tài khoản đang tồn tại, không cần cho Supabase project mới.

## 2. Project đã có dữ liệu

- Sao lưu toàn bộ database, Auth users và chính sách RLS.
- Đối chiếu các bảng và migration đã triển khai trên staging. **Không chạy gói cài mới hay 01_SETUP_DATABASE.sql** khi đã có bảng; chỉ áp dụng những migration còn thiếu.
- Chạy tích hợp ba tài khoản admin/reviewer/submitter, thử chấm C1–C9, nhập điểm, đánh giá và xuất báo cáo trước khi cập nhật production.

## 3. Tạo tài khoản admin đầu tiên

Sau khi database được tạo thành công, đăng nhập Supabase CLI bằng tài khoản quản trị project:

```powershell
pnpm dlx supabase@latest login
.\CREATE_INITIAL_ADMIN.ps1 -ProjectRef nzoamsyazdafyqnsxkny
```

Script sẽ hỏi email `@dntu.edu.vn`, họ tên và mật khẩu. Không lưu khóa bí mật trong source hoặc đưa vào chat.

## 4. Chạy web

```powershell
pnpm supabase:check
pnpm check
pnpm build
pnpm dev
```

Các API cần `SUPABASE_SECRET_KEY` trong `.env.local` phía server. Kho minh chứng ảnh cần `GOOGLE_APPS_SCRIPT_WEB_APP_URL` và `GOOGLE_APPS_SCRIPT_SHARED_SECRET`. Chỉ bật đăng ký công khai sau khi có quy trình xác minh MSSV.
