# Tài khoản đơn vị và MSSV

## Tài khoản sinh viên

Email phải có dạng:

```text
<chỉ gồm chữ số>@dntu.edu.vn
```

MSSV được suy ra ở server từ email đăng nhập. Trường MSSV trên biểu mẫu là chỉ đọc; API bỏ qua mọi giá trị MSSV do trình duyệt tự gửi.

## Tài khoản Chi đoàn

Khi thêm Chi đoàn:

```text
Mã: 22DTH1
Email: 22dth1@dntu.edu.vn
Mật khẩu: liên kết mời thiết lập mật khẩu
Phạm vi: Chỉ nộp hồ sơ tập thể Chi đoàn 22DTH1
```

## Tài khoản CLB

Khi thêm CLB:

```text
Mã: CLB-AI
Email: clb-ai@dntu.edu.vn
Mật khẩu: liên kết mời thiết lập mật khẩu
Phạm vi: Chỉ nộp hồ sơ tập thể CLB tương ứng
```

## Bảo mật mật khẩu mặc định

- Tài khoản đơn vị được đánh dấu `must_change_password = true`.
- Sau khi đăng nhập bằng `liên kết mời thiết lập mật khẩu`, hệ thống chỉ cho mở `/change-password`.
- Mật khẩu mới phải có ít nhất 10 ký tự, gồm chữ và số.
- Quản trị viên có thể đặt lại tài khoản đơn vị về `liên kết mời thiết lập mật khẩu` tại trang quản lý Chi đoàn/CLB.
- Khi Chi đoàn hoặc CLB ngừng sử dụng, tài khoản đại diện cũng bị khóa.

## Chính sách mật khẩu của dự án

Mật khẩu khởi tạo của tài khoản Chi đoàn/CLB là `liên kết mời thiết lập mật khẩu`. Vì vậy cấu hình xác thực của dự án phải cho phép mật khẩu tối thiểu 6 ký tự. Hệ thống vẫn bảo vệ bằng cách bắt buộc đổi sang mật khẩu tối thiểu 10 ký tự, có chữ và số ngay sau lần đăng nhập đầu tiên.

