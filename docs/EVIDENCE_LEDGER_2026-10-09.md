# Bảng kê minh chứng theo từng thông tin (09/10/2026)

## Tính năng

Giao diện /applications/new và /applications/[id]/supplement đã chuyển từ thẻ tải tệp sang bảng
**Mã tiêu chí – Nội dung tiêu chí – Gợi ý minh chứng – Thông tin minh chứng – + – Trạng thái**.

- Nhấn `+` ở một tiêu chí để khai một mục thông tin mới, tự mở biểu mẫu và đặt tiêu điểm vào tên mục.
- Mỗi mục có tiêu đề (3–240 ký tự), mô tả (tùy chọn, 2.000 ký tự) và nhiều PDF/JPG/PNG/WebP.
- C1–C6: mỗi tiêu chí có nhiều mục, mỗi mục có nhiều tệp (tối đa 20 tệp/tiêu chí).
- C7–C9 (cá nhân): đúng 1 mục và 1 tệp/tiêu chí. Tên mục được điền sẵn từ tiêu chí; người nộp **chỉ chọn tệp** mà không phải khai hoạt động/mô tả. Không áp dụng cho tập thể.
- Mỗi tệp không vượt 4 MiB; hồ sơ tối đa 40 tệp và 60 MiB, gồm ảnh chân dung.
- Lưu nháp/hoàn tất giữ cấu trúc mục và tệp trong Supabase, nhị phân tệp trên Google Drive.
- Khi xem lại hồ sơ để chỉnh sửa, có thể mở mục, thêm/xóa tệp và cập nhật mô tả.
- Màn hình cán bộ xét duyệt nhóm tệp theo thông tin đã kê khai, hiển thị tên và mô tả trước khi xem.
- Minh chứng cũ không có ID mục kê khai hiển thị trong **Minh chứng đã nộp trước đây**.

## BẮT BUỘC: cập nhật CSDL đang sử dụng

Đây là chức năng mới cần hai đối tượng Supabase: bảng `public.evidence_entries` và cột
`public.evidences.evidence_entry_id`. **Nếu chưa chạy migration, web có thể mở được nhưng
không thể lưu/xem đúng dữ liệu kê khai mới.**

Với CSDL đang vận hành, đăng nhập Supabase Dashboard → **SQL Editor**, chạy **CHỈ file**:

`supabase/migrations/20261009100000_evidence_entries.sql`

hoặc file tương đương `supabase/database/07_EVIDENCE_ENTRIES.sql`.

Đừng chạy `00_RESET_DATABASE.sql` và đừng chạy lại `INSTALL_NEW_PROJECT.sql`
trên CSDL đã có dữ liệu. Chụp/sao lưu trạng thái DB trước khi nâng cấp.

Khi thiết lập một Supabase project mới hoàn toàn, `pnpm run supabase:sql` sinh
`supabase/database/INSTALL_NEW_PROJECT.sql` có kèm bước 07.

## Kiến trúc và bảo mật

- `POST/DELETE /api/evidence/entries`: xác minh phiên, role submitter, quyền sở hữu
  và trạng thái draft/revision; kiểm tra định dạng và giới hạn độ dài bằng Zod.
- `POST /api/evidence/upload` dùng `evidenceEntryId`, xác minh tiêu chí và hồ sơ
  trước khi upload; mã chống trùng riêng cho mỗi mục.
- RLS của `evidence_entries` chỉ cho owner/assigned reviewer/admin xem, chỉ owner
  của hồ sơ còn chỉnh sửa được tạo/sửa/xóa.
- Trigger DB ngăn tệp liên kết tới mục không thuộc cùng hồ sơ/tiêu chí, và cấm
  đổi định danh của mục; unique index giới hạn một mục C7/C8/C9 mỗi hồ sơ.
- API lưu tệp tiếp tục sử dụng Google Drive gateway, kiểm tra MIME từ chữ ký tệp,
  xóa tệp có outbox và tệp không công khai.
- Trước khi nộp hồ sơ, backend kiểm tra mỗi mục kê khai đều phải có tệp và
  các tiêu chí bắt buộc đều đủ minh chứng.
- Không sửa/xóa metadata hoặc file sau khi hồ sơ không ở draft/revision.

## Kiểm thử

Chạy `pnpm run check`, `pnpm run build`, và
`pnpm exec playwright test tests/ui-audit.spec.ts --workers=1`.
Các kiểm thử UI sẵn có chỉ đi qua login/design-preview; **chưa thay thế kiểm thử
E2E đã đăng nhập với Supabase + Google Drive**. Khi migration đã được áp dụng,
cần dùng tài khoản submitter thử thêm 2 mục cho C1, mỗi mục 2 tệp PDF/ảnh, lưu
nháp, tải lại, nộp và đối chiếu tên/mô tả/tệp trên màn hình reviewer; thử C7
để xác nhận chặn tệp thứ hai.
