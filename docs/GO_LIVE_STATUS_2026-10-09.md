# Trạng thái hoàn thiện hệ thống — 09/10/2026

## Đã xác minh tại workspace

- Giao diện nộp sử dụng bảng kê theo từng tiêu chí và nút `+`; C1–C6/T1–T6 cho nhiều thông tin, mỗi thông tin nhiều ảnh/PDF.
- C7–C9 của cá nhân giờ hiển thị thao tác `Đính kèm 01 tệp`, tự điền tên mục theo tiêu chí, không bắt người nộp kê khai tên hoạt động; vẫn giới hạn 01 mục/01 tệp theo API + database.
- Cá nhân C1–C9 và tập thể T1–T6 độc lập; kết luận bằng Đạt / Không đạt, không dùng điểm số.
- `pnpm run check`: PASS (63 unit tests, gồm 5 test mô phỏng Google Apps Script/Drive, TypeScript và kiểm tra cấu hình source).
- `pnpm run build`: PASS trên Node 24.16.0. Project khai báo Node 22.x; phải kiểm tra lại trên Node 22 trước khi phát hành.
- `pnpm exec playwright test tests/ui-audit.spec.ts --workers=1`: 12/12 PASS (trang login và design-preview trên desktop, tablet, mobile, dark/light). Đây là kiểm thử giao diện công khai, **chưa** thay thế E2E có đăng nhập nộp tệp thực tế.

## Trạng thái dịch vụ đích (chỉ kiểm tra GET ẩn danh)

Chạy `pnpm run supabase:check` ngày 09/10/2026:

- Supabase Auth, profiles, applications, application_criteria và các bảng cơ bản trả lời.
- **Chưa thấy `public.evidence_entries`**: 404 / PGRST205.
- **Chưa thấy `public.storage_cleanup_queue`**: 404 / PGRST205.
- **Chưa thấy `public.evidences.evidence_entry_id`**: 400 / PostgreSQL 42703.
- Phiên môi trường hiện tại chưa nhận được `SUPABASE_SECRET_KEY` hoặc `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_APPS_SCRIPT_WEB_APP_URL` và `GOOGLE_APPS_SCRIPT_SHARED_SECRET` (không suy ra cấu hình Vercel từ kiểm tra này).

**Kết luận: code build được, nhưng luồng lưu mục minh chứng lên Drive CHƯA thể nghiệm thu trên dịch vụ đang kết nối.** Không tuyên bố hệ thống đã chạy nghiệp vụ thực tế.

## Công việc triển khai bắt buộc trước khi mở cho người dùng

1. Xác nhận đây là đúng Supabase project mục tiêu; tạo backup có thể phục hồi và kiểm thử migration trên staging trước. **Không chạy `00_RESET_DATABASE.sql` hoặc `INSTALL_NEW_PROJECT.sql` trên project đang có dữ liệu.**
2. Đối chiếu danh sách migrations đã áp dụng, rồi chạy **các migration còn thiếu theo thứ tự**; trọng tâm:
   - `supabase/migrations/20261008170000_security_hardening.sql` (06 — cleanup queue và phân quyền), nếu chưa chạy;
   - `supabase/migrations/20261009100000_evidence_entries.sql` (07 — các mục kê khai);
   - `supabase/migrations/20261009110000_collective_criteria_t_codes.sql` (08 — T1–T6 và ràng buộc).
   Kiểm tra mọi migration tiền nhiệm (đặc biệt 05) trước khi chạy, không suy ra trạng thái toàn bộ DB chỉ từ HTTP GET.
3. Cấu hình server secrets trong môi trường triển khai thực: khóa Supabase dành cho máy chủ, `GOOGLE_APPS_SCRIPT_WEB_APP_URL`, `GOOGLE_APPS_SCRIPT_SHARED_SECRET` và `CRON_SECRET`. Không đặt secrets dưới tiền tố `NEXT_PUBLIC_`.
4. Triển khai Google Apps Script từ `google-apps-script/Code.gs`, cấu hình thư mục Google Drive riêng tư và Script Properties (`DRIVE_ROOT_FOLDER_ID`, `STORAGE_SHARED_SECRET`). Hạn chế chia sẻ Drive; không cấp public access cho tệp.
5. Kiểm thử có đăng nhập trên staging: tài khoản cá nhân tải đủ C1–C9; C1 có 2 mục × 2 tệp; C7–C9 mỗi mục đúng 1 tệp; tập thể mới tạo đúng T1–T6; lưu nháp, tải lại, nộp, reviewer mở tệp riêng tư và xác nhận từng tiêu chí; thử hủy/tải sai định dạng/quá quota và cron dọn file.
6. Chạy lại `pnpm run supabase:check`, `pnpm run check`, `pnpm run build` với Node 22.x. Chỉ phát hành sau khi staging PASS và đơn vị có thẩm quyền phê duyệt chính thức bộ tiêu chí tập thể T1–T6.

## Phạm vi phiên này

Chỉ sửa mã trong workspace `D:\\khenthuong_cntt_dntu` và thực hiện kiểm tra GET an toàn tới Supabase. **Không** chạy DDL trên dữ liệu thật, không thay đổi Script đang triển khai, không push/commit hoặc deploy website.
