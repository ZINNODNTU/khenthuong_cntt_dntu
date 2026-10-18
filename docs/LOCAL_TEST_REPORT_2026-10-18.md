# Báo cáo kiểm thử LOCAL — CNTT DNTU — 18/10/2026

## Môi trường
- Workspace: `D:\khenthuong_cntt_dntu`
- Server development: `http://localhost:3000` — đang hoạt động.
- Production build được kiểm thử độc lập tại `http://localhost:3001`.
- Next.js 16.3.8, Node.js v24.16.0, pnpm 10.34.5. Dự án yêu cầu Node.js 22.x nên có cảnh báo engine.
- `.env.local` kết nối Supabase production của dự án; tránh bài kiểm thử tạo/xóa dữ liệu thật.

## Tóm tắt có xác minh
1. `pnpm run check`: PASS, 67/67 unit tests đạt; TypeScript, UI verification và database-file verification đều đạt.
2. `pnpm run supabase:check`: PASS (Auth, schema, bảng và cột migration 05–09), phản hồi một số bảng nhạy cảm 401 với anonymous phù hợp chính sách RLS.
3. `pnpm run storage:check`: PASS; Apps Script gateway v2.1.0 phản hồi với thông tin xác thực phía server.
4. Playwright lần đầu: 52 tests = 43 pass, 4 fail, 5 skip.
   - 2 lỗi chỉ do test dùng `h1` cũ thay vì nhãn giao diện đăng nhập hiện tại.
   - 2 lỗi API đăng ký mong 400 nhưng nhận 503: local không có `SUPABASE_SECRET_KEY`, bộ rate-limit fail-closed trước khi kiểm tra JSON.
5. Đã cập nhật test để theo UI hiện hành, bỏ skip sai của các bài xác minh anonymous API và bổ sung 4 bài kiểm tra `studentRegistrationSchema` độc lập không ghi DB.
6. Playwright chạy lại: **54 PASS, 2 SKIPPED, 0 FAILED** (56 tests); 2 skip chính là đăng ký qua API khi rate limiter không có secret. Chi tiết HTML: `ui-audit-results/report`.
7. `pnpm run build`: PASS (production build + TypeScript).
8. HTTP dev (:3000) với anonymous: GET /,/login,/register => 200; /criteria,/dashboard => 307; GET /api/storage/health, /api/evidence/<unknown>, /api/reports/results => 401; POST /api/evidence/entries, /api/applications/<unknown>/criteria, /api/applications/<unknown>/scores => 401.
9. HTTP production build (:3001): GET /,/login,/register,/design-preview => 200; /dashboard => 307; 3 API nhạy cảm GET => 401. 10 GET /login đồng thời => **10/10 HTTP 200**. Đây chỉ là smoke test cỡ nhỏ, KHÔNG phải benchmark tải thực.
10. `tests/period-delete.spec.ts` **không chạy**: chứa thao tác xóa đợt thật và đang dùng môi trường Supabase production.

## Chưa thể nghiệm thu chức năng đầu-cuối
- Local **thiếu `SUPABASE_SECRET_KEY`** (server-only). Bộ rate limiting từ chối với HTTP 503, nên không thể thử toàn bộ luồng đăng ký, tải minh chứng và quản trị thực tế.
- Chưa có tài khoản thử riêng cho submitter/reviewer/admin trên một Supabase staging tách production.
- Không có bằng chứng cho E2E tạo/nộp/bổ sung hồ sơ, nhiều PDF/ảnh mỗi tiêu chí, xét Đạt/Không đạt, RLS chéo vai trò và Drive cleanup cron từ trình duyệt đăng nhập.
- Chưa chạy trên Node.js 22.x như yêu cầu, chưa kiểm thử phục hồi backup.
- Supabase production trước đó được xác minh là Free Plan không có scheduled backups.

## Các file test đã thay đổi
- `tests/admin-ui.spec.ts`: kiểm tra đúng heading đăng nhập hiện hành.
- `tests/review-access.spec.ts`: không bỏ qua các phép thử HTTP ẩn danh do biến môi trường Playwright không được nạp.
- `tests/student-registration.spec.ts`: báo skip có lý do khi backend rate limit trả 503; không giả định tính năng đăng ký đã chạy.
- `tests/student-registration-validation.spec.ts`: kiểm tra schema đăng ký độc lập (4 bài).

## Tiếp theo
1. Chuẩn bị Supabase **staging** an toàn, cấu hình server-only secret qua local environment/secret manager, không commit hoặc gửi secret vào chat.
2. Đăng nhập bằng bộ tài khoản thử của ba vai trò; chạy E2E thao tác hồ sơ và minh chứng, kiểm tra từng policy truy cập.
3. Kiểm thử Node.js 22.x và backup/restore; sau đó mới xem xét production deployment.

Kết luận: **Local public UI, anonymous access controls, unit tests và build PASS. Core authenticated E2E chưa nghiệm thu; không được coi là production-ready.**
