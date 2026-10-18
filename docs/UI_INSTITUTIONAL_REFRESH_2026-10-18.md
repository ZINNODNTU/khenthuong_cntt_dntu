# CNTT DNTU — Institutional UI Refresh (18/10/2026)

## Mục tiêu
Đưa dự án từ phong cách SaaS/AI mẫu (gradient lớn, huy hiệu phát sáng, khẩu hiệu chung, thẻ bento nhiều lớp) về giao diện học vụ DNTU, tập trung nghiệp vụ **nộp hồ sơ – thẩm định minh chứng – xét Đạt/Không đạt**.

## Thực thi
- `components/login-screen.tsx`: thay khẩu hiệu bằng nội dung nghiệp vụ rõ ràng; bố cục 3 bước bằng số thứ tự, bỏ icon trạng thái trang trí; đổi tiêu đề form thành “Đăng nhập”, giữ cách xử lý tài khoản, mật khẩu, phân quyền và chuyển hướng.
- `components/login-screen.module.css`: giao diện xanh than phẳng, đường nhấn đỏ gạch, giảm bo góc và hiệu ứng nổi, input và CTA tối giản; responsive/dark.
- `app/(auth)/login/page.tsx`, `app/page.tsx`, `components/login-screen.tsx`: truyền `error`, `confirmed`, `next` từ server `searchParams` dưới dạng string đã lọc; bỏ `useSearchParams` + `Suspense` fallback client-only. Dạng redirect sau đăng nhập vẫn đi qua `safeNext`.
- `app/(auth)/register/page.tsx`, `app/(auth)/register/register-page.module.css`: cập nhật tiêu đề/nhãn và hệ thống màu sắc, form dễ đọc trên điện thoại, giữ yêu cầu email DNTU.
- `components/register-form.tsx`: đồng bộ thông điệp và giới hạn minlength HTML từ **10 sang 12**, đúng với Zod backend.
- `app/(dashboard)/submitter/page.tsx`, `app/(dashboard)/submitter/submitter-dashboard.module.css`: thay banner mang tính truyền thông bằng phần tóm tắt hồ sơ thực tế, màu sắc/cạnh viền phẳng, cập nhật thông tin tiêu chí theo scope: cá nhân C1–C9 / tập thể T1–T6.
- `app/(dashboard)/dashboard/dashboard-upgrade.css`: làm phẳng banner điều hành và thẻ quản trị.
- `app/globals.css`: token xanh than/đỏ gạch, giảm bo góc/shadow, active sidebar rõ ràng, topbar bỏ kính mờ và gradient, card không bay khi hover.

## Chất lượng và hiệu năng
- Production build Next.js/TypeScript: PASS; `pnpm run check`: 67/67 unit tests PASS.
- Login SSR & accessibility regression: 21/21 Playwright tests PASS across login/register, desktop/tablet/mobile, light/dark, confirmation and expired-session feedback.
- Auth UI WCAG/geometry Playwright: kiểm tra desktop/mobile và dark/light. `tests/institutional-auth-ui.spec.ts` 4/4 PASS sau khi khắc phục tương phản.
- Chromium production 390px: CLS trước thay đổi `0.15622`, sau chuyển login form sang SSR `0.00916` (3 lần đo); desktop CLS `0` (3 lần).
- Script chẩn đoán: `scripts/diagnose-layout-shift-local.mjs`, chạy bằng `node scripts/diagnose-layout-shift-local.mjs` khi `next start --port 3001`.

## Tiếp theo trước phát hành
- Kiểm thử các màn hình dashboard thực bằng tài khoản submitter/reviewer/admin trên staging sau khi cấu hình server secret; hiện thay đổi đã qua build nhưng các màn hình bảo vệ chưa được chụp lại bằng một phiên đăng nhập hợp lệ.
- Rà soát các luồng nhiều minh chứng, bổ sung hồ sơ, xem trước file và màn xét duyệt với dữ liệu test thật.
- Bảo vệ database production; không chạy migration, reset, không đẩy mã lên Git/Vercel trong lần tinh chỉnh UI.
- Máy local hiện dùng Node 24 thay vì engine yêu cầu Node 22; nghiệm thu runtime chính thức trên Node 22.

## Phạm vi không thay đổi
Không thay đổi Supabase schema, Google Apps Script, quyền truy cập, luồng upload/xóa minh chứng, định nghĩa tiêu chí hay logic chấm Đạt/Không đạt. `/design-preview` vẫn là màn xem trước thiết kế tách biệt với màn người dùng thực.
