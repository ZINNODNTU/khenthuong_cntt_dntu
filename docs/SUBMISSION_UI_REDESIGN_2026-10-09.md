# Nâng cấp giao diện nộp minh chứng — 09/10/2026

## Định hướng thị giác

Giao diện nộp mới từ bỏ kiểu dashboard SaaS nhiều gradient, huy hiệu và thẻ nổi để
dùng ngôn ngữ thị giác **biểu mẫu học vụ/biên bản hiện đại**:

- Masthead giấy trắng, viền ink, dấu nhận diện Đoàn, dòng định danh Khoa CNTT
  và một dấu chấm nhấn màu đỏ gạch duy nhất.
- Tiến độ dạng số lớn và thanh mảnh, thay vòng tròn conic-gradient.
- Điều hướng ba phần bằng anchor thật; không thêm bước giả/chặn người dùng.
- Danh mục C1–C9 trong **bảng 3 cột**: tiêu chí + trạng thái, các thông tin minh chứng,
  nút thêm thông tin. Gợi ý giấy tờ có thể mở khi cần, không chiếm hẳn cột.
- Mỗi lần thêm thông tin tạo một vùng nhập thu gọn/mở rộng trong đúng hàng.
  Tệp hiển thị ngay bên dưới mục; hỗ trợ chọn nhiều/kéo thả.
- Nút hành động cuối trang có trạng thái hồ sơ, lưu nháp và gửi xét duyệt rõ ràng.
- Desktop bố cục bảng; mobile biến mỗi hàng tiêu chí thành một panel dọc,
  không kéo trang ngang. Dark mode theo các biến màu riêng được định nghĩa trong
  `components/criterion-evidence-form.module.css`.
- Giữ các quy tắc C1–C6 nhiều mục/nhiều tệp, C7–C9 một mục/một tệp (tên mục điền sẵn, chỉ tải tệp); PDF/ảnh,
  quotas, Supabase metadata và Google Drive bytes giữ nguyên.

## Phạm vi mã nguồn

- `components/criterion-evidence-form.tsx`: thiết kế lại masthead, navigation,
  nhóm tiêu chí, bảng kê, phần nhập và footer; thêm drag-and-drop tệp.
- `components/criterion-evidence-form.module.css`: viết lại hệ thống giao diện
  trong phạm vi component, tránh can thiệp các màn hình khác.
- `app/(dashboard)/applications/new/page.tsx`: bỏ tiêu đề trùng.
- `app/(dashboard)/applications/[id]/supplement/page.tsx`: bỏ tiêu đề trùng.

## Kiểm thử hình ảnh và tương tác

Sử dụng một route preview phát triển tạm thời (đã xóa sau khi kiểm tra) để
render trực tiếp component thật. Kết quả Playwright smoke test:
- HTTP 200; xác nhận h1.
- Nhấn '+' C1, nhập tên + mô tả, chọn hai tệp; thêm mục C2; UI cập nhật.
- Độ rộng 390px không bị tràn ngang; không có lỗi JavaScript runtime.
- Ảnh chụp ở `ui-audit-results/screenshots/evidence-ledger-desktop.png` và
  `ui-audit-results/screenshots/evidence-ledger-mobile.png`.

Chưa chạy E2E tải lên Google Drive với tài khoản submitter thật. CSDL lưu nhóm
minh chứng cần áp dụng migration `20261009100000_evidence_entries.sql` theo
`docs/EVIDENCE_LEDGER_2026-10-09.md` trước khi sử dụng nghiệp vụ thực tế.
