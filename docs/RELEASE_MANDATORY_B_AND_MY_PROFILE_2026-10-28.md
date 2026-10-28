# Phát hành: Điều kiện bắt buộc nhóm B và hồ sơ tài khoản — 28/10/2026

## Quy tắc hồ sơ cá nhân

- Nhóm A (C1–C6): sinh viên kê khai theo thành tích thực tế, ít nhất một tiêu chí có minh chứng; không bắt buộc đủ cả sáu.
- Nhóm B: **bắt buộc đủ 3/3** trước khi gửi xét duyệt. C7 (rèn luyện từ Tốt): 01 tài liệu; C8 (kết quả học tập theo ngưỡng được công bố): 01 tài liệu; C9 (không kỷ luật/vi phạm): tích ô cam kết, không yêu cầu tải tệp.
- Ảnh chân dung vẫn bắt buộc đối với hồ sơ cá nhân.
- C7/C8 giữ giới hạn 01 tệp mỗi tiêu chí; C1–C6 cho phép nhiều nội dung và nhiều tệp theo giới hạn.
- UI hiển thị rõ từng mục nhóm B chưa hoàn thành, đánh dấu Bắt buộc *, vô hiệu nút **Gửi hồ sơ xét duyệt** cho đến khi đủ A, B và ảnh chân dung; vẫn cho lưu nháp để tiếp tục sau.
- API PATCH khi nộp thực hiện xác thực C9 và đối chiếu file C7/C8, số lượng mục và ảnh chân dung ở server; không tin dữ liệu trạng thái gửi từ giao diện. `validateCriteria()` nay ràng buộc C9 ở cả pha `submit` và `pass`.

## Thông tin tài khoản

- Đường dẫn `/account/profile` yêu cầu Supabase session hợp lệ; chỉ lấy profile theo `auth.getUser().id`, không nhận `profileId` từ query.
- Hiển thị thông tin đã đăng ký (họ tên, MSSV tách từ email DNTU, email, ngày sinh, điện thoại, chi đoàn), vai trò, trạng thái xác nhận email và hoàn thiện hồ sơ.
- Liên kết có trên sidebar tất cả vai trò, topbar desktop/mobile và tại phần thông tin người nộp.
- Đây là trang **chỉ xem**, không cung cấp sửa email/mã sinh viên hoặc cập nhật tài khoản khác.
- Giao diện responsive, hỗ trợ light/dark theme và no caching cho dữ liệu cá nhân.

## Kiểm thử và phát hành

- `pnpm run typecheck`, `pnpm run check`, `pnpm run build`.
- Playwright `tests/profile-and-mandatory.spec.ts` kiểm tra anonymous không đọc được hồ sơ và các quy tắc B hiển thị; `tests/individual-award-portal.spec.ts` kiểm tra luồng auth an toàn.
- Phải kiểm tra deployment Vercel của commit mới nhất thành công, response `/account/profile` chưa đăng nhập không cho đọc thông tin, các route public vẫn hoạt động. Smoke test trong trình duyệt có session cần kiểm tra dữ liệu của chính người đăng nhập khi có phiên thử nghiệm hợp lệ.
- Không sửa các file ảnh/test artifact không liên quan đã có trong working tree và không thay đổi secrets/DB migrations.
