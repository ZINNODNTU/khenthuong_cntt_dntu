# Bàn giao nâng cấp UI/UX — 09/10/2026

## Phạm vi đã triển khai

- `/review/[id]`: Review Workspace hiển thị danh sách minh chứng phân nhóm C1–C9 bên trái và phiếu đánh giá nhị phân bên phải trên màn hình lớn. PDF và ảnh được tải theo yêu cầu qua API `/api/evidence/[id]`; file được hiển thị từ Blob URL, tự thu hồi Blob URL sau khi đổi tệp hoặc thoát. Trên màn hình nhỏ bố cục xếp dọc; nhấn **Xem trước** tại phiếu đánh giá sẽ cuộn đến vùng xem.
- `/review`: chuẩn hóa thuật ngữ Đạt/Không đạt, số tiêu chí áp dụng 9 (cá nhân) và 6 (tập thể), số lượng **tệp** thay vì ảnh.
- `/dashboard`: bổ sung khối công việc ưu tiên, link mở xét duyệt trực tiếp, nhóm KPI thứ cấp vào chi tiết mở rộng, điều chỉnh tên các chỉ số để không tuyên bố tỷ lệ tham gia khi không có mẫu số đúng.
- `/applications/new` và `/applications/[id]/supplement` (dùng chung form): xem trước tệp trước khi tải, tiến độ tải tệp theo số lượng, thử lại phần tải chưa hoàn tất, giới hạn tổng dung lượng 60 MiB, giữ giới hạn 40 tệp và C7–C9 tối đa một tệp.
- Responsive styles cho Workspace và uploader, chế độ tối và giảm chuyển động.

## Ràng buộc nghiệp vụ & bảo mật được giữ

1. C1–C6: nhiều tệp minh chứng; C7–C9: tối đa 1 tệp cho mỗi tiêu chí, chỉ áp dụng cho cá nhân.
2. Hội đồng sử dụng Đạt / Không đạt đối với tiêu chí, không chấm điểm trong Review Workspace.
3. Minh chứng không công khai URL Drive. Mọi lần xem lưu trữ đều gọi API có xác thực và phân quyền; các URL Blob tạm thời được thu hồi.
4. Không thay đổi schema Supabase, không thay thế endpoint upload/decision hiện có.

## Kết quả kiểm tra

- `pnpm run typecheck`: PASS.
- `pnpm run ui:self-check`: PASS.
- `pnpm run ui:verify`: PASS.
- `pnpm run criteria:test`: PASS 34/34.
- `pnpm run build`: PASS, Next.js 16.3.8.
- `pnpm exec playwright test tests/ui-audit.spec.ts --workers=2 --retries=0`: PASS 12/12 với login và design-preview, desktop/tablet/mobile, sáng/tối, axe-core WCAG.
- Lưu ý: môi trường hiện đang chạy Node 24 trong khi `package.json` khai báo Node 22; các lệnh có cảnh báo engine nhưng vẫn PASS.

## Chưa được xác nhận bằng E2E đăng nhập thật

- Quy trình nhận hồ sơ → mở PDF/ảnh → xác minh 9/6 tiêu chí → kết luận, dùng tài khoản reviewer thật và Supabase RLS.
- Tải tệp thật lên Google Drive, thử lại khi mạng rớt, xóa minh chứng và xác nhận lưu trữ thành công.
- Các màn hình authenticated không thuộc `tests/ui-audit.spec.ts` hiện tại; kết quả 12/12 không phải chứng nhận E2E các màn hình này.

## Triển khai

Workspace: `D:\khenthuong_cntt_dntu`.

Chưa tạo commit, push GitHub hoặc deploy. Working tree tồn tại nhiều thay đổi đã staged/unstaged từ trước, không được tự ý reset hay gộp chung với nâng cấp này; nên review theo file trước khi tạo commit. Không cần migration mới cho thay đổi UI này.
