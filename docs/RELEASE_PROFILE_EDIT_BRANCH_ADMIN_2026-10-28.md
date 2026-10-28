# Cập nhật tài khoản và danh mục Chi đoàn — 28/10/2026

## Phạm vi

1. Sinh viên có tài khoản đã xác thực được chỉnh sửa họ tên, ngày sinh, số điện thoại và Chi đoàn tại `/account/profile`. Email và MSSV **không cho sửa**.
2. Chi đoàn hiển thị từ bảng `branches`, lọc `is_active=true`. Backend xác thực lại quyền sở hữu bằng `auth.getUser()`, schema `studentProfileSchema` và RPC PostgreSQL `complete_student_profile` (bảo vệ `auth.uid()`). Không sử dụng service-role key cho cập nhật profile.
3. Khi đổi Chi đoàn, hệ thống từ chối nếu chính sinh viên còn hồ sơ nháp, bổ sung, đã nộp hoặc đang xét; phòng trường hợp quy tắc quyền sửa hồ sơ (theo Chi đoàn) bị sai lệch. Sau khi xử lý hồ sơ, sinh viên có thể cập nhật; nếu cần điều chỉnh hồ sơ đang xét, liên hệ admin.
4. Admin `/branches` có Sửa (mã và tên, trạng thái), Ngừng sử dụng/Kích hoạt, và Xóa. API `DELETE /api/admin/branches` đòi quyền admin, kiểm tra profile/application còn tham chiếu, chặn 409 nếu có, tôn trọng FK PostgreSQL để tránh mất dữ liệu lịch sử. Mã Chi đoàn đã tham chiếu sẽ không thể đổi; tên hiển thị vẫn sửa được.
5. Quản lý CLB và Quản lý đơn vị không còn trong sidebar admin. Hai URL lịch sử chỉ redirect đến `/branches` (sau kiểm tra quyền). API CLB cũ trả 410 với tài khoản admin hợp lệ, không còn cho tạo/sửa dữ liệu. Không xóa dữ liệu lịch sử ở PostgreSQL.

## Nghiệm thu

- Typecheck, scripts check, production build.
- Playwright `tests/account-profile-branches.spec.ts` xác nhận khách không thể cập nhật profile/Chi đoàn và không thể truy cập quản lý cũ.
- Người dùng có session xác thực: kiểm tra danh sách Chi đoàn chính xác từ database và thử lưu không thay đổi; kiểm tra UI quản lý admin ở tài khoản admin thật nếu có thể; không thực hiện xóa Chi đoàn production để thử.
- Lưu ý: xóa vật lý Chi đoàn chưa được sử dụng cần service-role key hợp lệ trên Vercel; nếu key sai/cơ sở dữ liệu từ chối, API trả lỗi rõ ràng và dữ liệu được giữ nguyên.
