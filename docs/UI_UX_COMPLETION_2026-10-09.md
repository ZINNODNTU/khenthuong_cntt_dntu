# UI/UX nâng cấp – Đợt hoàn thiện 09/10/2026

## Phạm vi đã triển khai

- **Bàn thẩm định (/review/[id])**: bố cục chia cột khi màn hình đủ rộng, xem ảnh/PDF qua API kiểm quyền, chuyển tệp trước/sau, thao tác bàn phím lên/xuống trong danh sách, thử lại khi bản xem trước lỗi, lọc tiêu chí theo Chưa xét / Đạt / Không đạt, trạng thái tệp, điều hướng về hàng đợi.
- **Phân quyền hiển thị minh chứng**: cán bộ chưa nhận hồ sơ không thể mở tệp qua giao diện; hướng dẫn nhận phụ trách rõ ràng; API quyền sở hữu hiện có vẫn là nguồn quyết định.
- **Nộp minh chứng**: tiến độ đang tải, trạng thái từng tệp, thử lại tệp lỗi, retry tự động tối đa 2 lần cho lỗi tạm thời (408/429/5xx phổ biến và lỗi mạng), dùng idempotency key ổn định để tránh trùng tệp. Không retry lỗi quyền hoặc định dạng.
- **Admin dashboard**: bộ lọc theo đợt xét / toàn hệ thống, lấy đủ các trang dữ liệu để tránh giới hạn mặc định PostgREST 1.000 bản ghi, đếm tài khoản bằng HEAD + count.
- **Trang kết quả**: phân trang phía máy chủ và thông báo lỗi truy vấn, nhãn truy cập được cho bộ lọc.
- **Mobile & accessibility**: tăng kích thước vùng chạm trên bàn thẩm định/upload, focus-visible, trạng thái aria-expanded chính xác cho menu di động, nhóm nút tài khoản dùng semantics phù hợp.
- **Đồng bộ nội dung**: loại bỏ mô tả “chấm điểm” không đúng với quy trình nhị phân của màn hình đăng nhập.

## Nghiệp vụ được giữ nguyên

C1–C6 có thể tải nhiều minh chứng. C7–C9 mỗi tiêu chí chỉ một tệp cho hồ sơ cá nhân; không áp dụng C7–C9 cho tập thể. Mỗi tiêu chí được xét **Đạt / Không đạt**. Không thay đổi quyền backend hay endpoint lưu trữ Google Drive; không thay đổi lược đồ SQL.

## Các bài kiểm tra

- `pnpm run check`: phát hành, cấu trúc DB, UI self-check, kiểm tra production UI, TypeScript và unit tests (39 test) – PASS tại thời điểm báo cáo.
- `pnpm run build`: PASS.
- `pnpm exec playwright test tests/ui-audit.spec.ts --workers=1`: 12/12 PASS cho login và design-preview ở desktop/tablet/mobile, light/dark.
- Thêm `tests/upload-retry.test.mjs` để kiểm thử retry tạm thời, lỗi quyền, giới hạn retry, idempotency giữ ở client.

## Trước khi triển khai công khai

1. Kiểm thử E2E có xác thực riêng cho tài khoản **admin**, **reviewer** và **submitter** với dữ liệu thử, nhất là nhận/trả hồ sơ, upload thất bại, tải PDF và chuyển trạng thái.
2. Kiểm tra giao diện thủ công trên trình duyệt thật iOS Safari, Android Chrome; đặc biệt PDF preview và thanh thao tác cố định.
3. Chạy bằng Node.js 22.x đúng phiên bản dự án; môi trường kiểm tra cục bộ hiện là Node 24.x nên xuất hiện cảnh báo engine.
4. Chưa commit/push và chưa deploy. Kho mã đang có nhiều thay đổi trước đó; kiểm tra `git status` trước khi tạo commit riêng.
