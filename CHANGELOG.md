# Changelog

## 1.0.0 — Login First & Custom SMTP

- Chuyển `/` thành trang đăng nhập chính.
- Điều hướng người dùng đã đăng nhập theo đúng vai trò.
- Chuyển người chưa đăng nhập từ trang bảo vệ về form đăng nhập.
- Bổ sung đường dẫn xác nhận email server-side `/auth/confirm`.
- Bổ sung mẫu email xác nhận thương hiệu CNTT DNTU.
- Hỗ trợ hiển thị địa chỉ email gửi xác nhận trên trang đăng ký.
- Chuẩn hóa thông báo lỗi giới hạn gửi email và email chưa xác nhận.
- Bổ sung tài liệu cấu hình SMTP riêng.


## 1.0.0 — Modern Student UI

- Chuẩn hóa giao diện theo phong cách CNTT hiện đại.
- Sidebar desktop có thể mở rộng và thu gọn.
- Ghi nhớ trạng thái sidebar trên từng thiết bị.
- Sidebar mobile chuyển thành drawer có lớp phủ.
- Bổ sung tooltip khi sidebar thu gọn.
- Bổ sung bảng hướng dẫn nhanh theo vai trò.
- Chuẩn hóa button, form, table, card, dialog, loading và empty state.
- Tối ưu trải nghiệm sinh viên trên điện thoại.
- Bổ sung focus-visible, skip link và reduced-motion.

## 1.0.0

- Hoàn thiện sidebar cố định trên desktop và drawer điều hướng trên mobile.
- Chuẩn hóa topbar, breadcrumb, trạng thái active và thông tin tài khoản.

- Phát hành chính thức hệ thống xét duyệt thành tích Khoa Công nghệ thông tin.
- Tách giao diện và quyền truy cập cho Quản trị viên, Cán bộ xét duyệt và Người nộp hồ sơ.
- Đăng nhập và đăng ký bằng email DNTU.
- MSSV được suy ra từ phần số trước `@dntu.edu.vn`.
- Hỗ trợ hồ sơ cá nhân, tập thể Chi đoàn và tập thể Câu lạc bộ.
- Hỗ trợ ảnh chân dung và ảnh minh chứng.
- Quản lý đợt xét thành tích, Chi đoàn, Câu lạc bộ và tài khoản.
- Mỗi đối tượng chỉ được gửi một hồ sơ trong mỗi đợt xét.
- Tự cấp tài khoản đại diện Chi đoàn và Câu lạc bộ.
- Hỗ trợ đặt lại mật khẩu và bắt buộc đổi mật khẩu khởi tạo.
- Tích hợp kho ảnh thông qua cổng lưu trữ của hệ thống.
- Bổ sung trang lỗi 401, 403, 404 và 500.
- Chuẩn hóa cấu hình triển khai Production.
