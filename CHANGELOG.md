# Changelog

## 1.1.0 — Xét khen thưởng cá nhân Đoàn – Hội Khoa CNTT (18/10/2026)

- Chuyển nhận diện website sang Xét khen thưởng Đoàn – Hội Khoa Công nghệ thông tin.
- Chỉ nhận hồ sơ cá nhân C1–C9, không còn quy trình nộp/xét tập thể mới.
- Cụ thể hóa minh chứng; C1–C6 nhiều mục và nhiều tệp, C7–C9 đúng một tệp mỗi tiêu chí.
- Giữ hồ sơ tập thể lịch sử; danh mục Chi đoàn/CLB còn phục vụ đối chiếu thông tin cá nhân.
- Chặn API cấp tài khoản tập thể; migration 20261018190000_individual_award_only.sql sẵn sàng áp dụng an toàn.
- Đạt 67/67 unit tests, production build và kiểm thử Playwright local.
- Cần chạy migration và kiểm tra biến môi trường server-only tại Supabase/Vercel trước khi go-live.

## 1.0.0 — Duplicate Student Account Fix

- Chuyển đăng ký sinh viên sang API server.
- Chặn một MSSV/email tạo nhiều tài khoản.
- Bổ sung registry khóa duy nhất và unique index không phân biệt hoa thường.
- Chặn yêu cầu đăng ký đồng thời.
- Nhận diện phản hồi user giả của Supabase khi email đã tồn tại.
- Bổ sung hotfix SQL cho database production và script kiểm tra tài khoản trùng.


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
