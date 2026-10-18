# Báo cáo hoàn thiện mã nguồn CNTT DNTU — 08/10/2026

## Phạm vi đã hoàn thành

- Đồng bộ một định nghĩa `CriterionCode`, `CriterionStatus`, `ApplicationCriterion`.
- Tạo `lib/criteria-rules.ts` để xác minh đủ 9 tiêu chí, ngưỡng GPA 2,80, rèn luyện Tốt trở lên và không kỷ luật; sử dụng chung trong API xét duyệt/nộp lại.
- API kết luận ĐẠT từ chối hồ sơ thiếu tiêu chí, tiêu chí còn pending/rejected hoặc dữ liệu C7–C9 không đạt.
- API cập nhật/nộp lại cho phép chủ hồ sơ cá nhân sửa C7–C9 trên bản nháp/yêu cầu bổ sung, và đối chiếu dữ liệu tại server trước khi nộp.
- Giao diện bổ sung C7–C9 và hội đồng có thao tác xác minh/không đạt/không áp dụng/đặt lại.
- Migration bổ sung `02_CRITERIA_9.sql`: phân quyền chỉ đọc cho authenticated, RPC xác minh kiểm tra vai trò/trạng thái, kiểm tra C7–C9, trigger ngăn duyệt ĐẠT bằng truy cập trực tiếp vào Supabase, backfill 9 bản ghi cho hồ sơ cũ (không tự xác minh), reset xác minh khi nộp lại.
- Cập nhật script kiểm tra UI theo cấu trúc Sidebar/Topbar hiện tại và bỏ yêu cầu mật khẩu mặc định trong script phát hành.
- Chỉnh API đọc minh chứng để không trả lỗi nội bộ của Google Apps Script.
- Đồng bộ tài liệu setup/triển khai; bổ sung kiểm thử quy tắc nghiệp vụ.

## Kết quả kiểm thử trong workspace

| Lệnh | Trạng thái |
| --- | --- |
| `pnpm criteria:test` | PASS: 7/7 bài test |
| `pnpm check` | PASS: verify, db:verify, ui:self-check, ui:verify, typecheck |
| `pnpm build` | PASS: Next.js production compile |
| `pnpm exec playwright test tests/ui-audit.spec.ts --reporter=line` | PASS: 12/12, kể cả sau nâng Next.js 16.3.8 (login/design-preview, desktop/tablet/mobile, sáng/tối) |

Các bài kiểm thử ở trên không xác minh toàn bộ nghiệp vụ có đăng nhập và **không xác nhận migration đã thực thi trên Supabase**.
Môi trường chạy Node v24.16.0 trong khi package.json yêu cầu Node 22.x; phải kiểm lại trên Node 22 trong CI.

## Cập nhật bảo mật dependency và tương thích

- Đã nâng Next.js từ `16.2.10` lên **`16.3.8`**, cập nhật lockfile.
- Đã chạy `pnpm audit --fix` để thêm 3 override có điều kiện cho PostCSS, nanoid và source-map-js; sau `pnpm install`, kết quả `pnpm audit --audit-level=low`: **No known vulnerabilities found** (tại thời điểm 08/10/2026).
- Chạy lại `pnpm check` và `pnpm build` sau khi nâng Next.js: đều PASS. Đây là kiểm tra bảo mật dependency theo dữ liệu advisories hiện có, không thay thế kiểm thử xâm nhập hoặc audit ứng dụng.

## Bổ sung chấm điểm số C1–C6 (08/10/2026)

- Đã có migration `04_AWARD_SCORING.sql`: Admin cấu hình biểu điểm 100 điểm theo từng đợt/loại, ngưỡng tối thiểu do hội đồng phê duyệt; Reviewer lưu điểm với căn cứ; có điểm audit, khóa biểu điểm sau lần chấm đầu, trigger bảo vệ kết luận `passed`, snapshot điểm vào `review_history`.
- Có màn hình `/admin/rubrics`, chấm điểm thủ công ở `/review/[id]`, điểm trên báo cáo in và CSV của quản trị viên.
- `pnpm check` đã PASS (17/17 unit test), `pnpm build` PASS và Playwright UI audit 12/12 PASS sau thay đổi.
- **Chưa áp dụng migration 04 trên Supabase thật**; phải thử các RPC, RLS và trigger trên staging. Cần chốt biểu điểm/điểm ngưỡng bằng văn bản trước khi vận hành.
- Chi tiết quy trình và checklist: `docs/AWARD_SCORING_GUIDE.md`.

## Checklist bắt buộc trước khi nghiệm thu production

1. Sao lưu Supabase (database + quyền/roles) và đặt cửa sổ bảo trì phù hợp.
2. Trên **staging**, chạy `supabase/database/02_CRITERIA_9.sql` sau schema cơ sở, không chạy script RESET. Đối với dự án đang chạy, cần xác minh không có các bản migration C1–C9 thủ công bị xung đột.
3. Kiểm tra tất cả hồ sơ cũ có 9 mã C1–C9, C7–C9 chưa tự được xác minh; ghi nhận trường hợp hồ sơ cũ thiếu nguồn xác nhận và hướng dẫn bổ sung.
4. Với 3 tài khoản thực trên staging: submitter, reviewer, admin, xác minh:
   - Submitter không thể INSERT/UPDATE `application_criteria` trực tiếp qua Supabase REST.
   - Reviewer chỉ xác minh qua `verify_application_criterion`; RPC không cho xác minh hồ sơ ở trạng thái draft/revision.
   - Trạng thái `passed` bị DB trigger chặn khi thiếu tiêu chí, dữ liệu cá nhân GPA <2,80, không đủ rèn luyện, hoặc có kỷ luật.
   - Kiểm tra GPA đúng 2,80, 2,79, rèn luyện Khá/Tốt, C9 true/false, hồ sơ tập thể có C7–C9 không áp dụng.
   - Yêu cầu bổ sung → chỉnh sửa → nộp lại phải hủy trạng thái xác minh cũ.
   - Đối chiếu nhật ký kết luận, quyền truy cập minh chứng và lỗi hiển thị.
5. Chạy thử tải đồng thời 20 hồ sơ/100 ảnh theo `docs/submission-load-test.md` trên staging, ghi P95 và lỗi thực tế.
6. Dependency audit đã sạch tại thời điểm kiểm tra; tiếp tục giám sát advisory và hoàn thiện rate limit dùng shared store, chứng minh quyền sở hữu MSSV và rà soát public evidence token trước khi mở đăng ký rộng.
7. Chạy lại `pnpm check && pnpm criteria:test && pnpm build` và Playwright trên **Node 22.x** trong CI/staging, kiểm tra env/secrets, tính khả dụng SMTP và Apps Script.
8. Tạo commit/review riêng cho thay đổi mới, không tự đưa toàn bộ working tree hiện có lên Git vì đang chứa nhiều tệp đã staged từ trước.
9. Chỉ áp dụng migration lên production sau khi staging được nghiệm thu; giữ backup, rollback thủ công, quan sát log theo batch và có phương án khôi phục.

## Các tồn đọng chưa tuyên bố hoàn tất

- Chưa chạy migration ở Supabase thật; SQL mới là bản chuẩn bị và chưa được kiểm thử thực thi end-to-end trên database.
- Chưa có bộ E2E xác thực người dùng thật dành cho xét duyệt, RLS và upload trên staging.
- Thiếu nguồn dữ liệu có thẩm quyền để xác minh sinh viên là chủ của MSSV. **`PUBLIC_SIGNUP_ENABLED=false` nên được giữ trên production** cho tới khi có cơ chế xác minh.
- Chưa có rate limiter phân tán, forgot-password hoàn chỉnh, chiến lược token public evidence hash/rotate, kiểm thử kiểm toán quyền và báo cáo `pnpm audit` mới.
- Chưa triển khai đầy đủ các bảng phân rã học tập, rèn luyện, kỷ luật, vai trò, sáng kiến theo kế hoạch trước đây; hiện tại ma trận C1–C9 chứa snapshot đủ cho quy trình xét duyệt.
- Chưa triển khai production và không thay đổi dữ liệu live.
