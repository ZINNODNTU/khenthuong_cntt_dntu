# Khắc phục lỗi gửi email trên production — 28/10/2026

## Vấn đề được báo

Giao diện `/forgot-password` báo “Hệ thống chưa tiếp nhận được yêu cầu khôi phục…” khi người dùng nhập MSSV trên website thật. Trước đó, Playwright trên production đã ghi nhận request từ trình duyệt tới Supabase `/auth/v1/recover` thất bại ở tầng mạng, trong khi gọi trực tiếp Auth API với public key nhận HTTP 200. Không thể khẳng định lỗi do SMTP chỉ từ ảnh giao diện.

## Điều chỉnh

- Thêm `POST /api/auth/email` chạy **cùng origin** với website, chỉ nhận `{purpose:"recovery"|"signup",email}`.
- Route server gọi trực tiếp Supabase Auth bằng **publishable key**; không cần, không sử dụng service-role key để gửi thư.
- Chỉ định redirect cố định theo `env.appUrl()`, dùng Site URL production đã được sửa: `https://khenthuong-cntt-dntu.vercel.app`.
- Chuyển trang quên mật khẩu và gửi lại email xác nhận sang gateway; giảm phụ thuộc CORS/kết nối cross-origin từ trình duyệt.
- Chặn request có Origin khác website, kiểu dữ liệu sai, body dài và email không hợp lệ. Với signup chỉ nhận email MSSV DNTU.
- Phân biệt request được tiếp nhận (200), bị giới hạn (429), lỗi vận hành (503) và lỗi mạng; không hiển thị chi tiết SMTP/Supabase hoặc tình trạng tồn tại tài khoản.
- Supabase tiếp tục thực thi giới hạn gửi thư. Gateway **không tự retry** vì gửi mail không phải thao tác idempotent.
- Các template email đã dùng host Vercel trong repository. Publish template là thao tác riêng trong Supabase Dashboard, không tự đi theo commit GitHub.

## Nghiệm thu tối thiểu

- Test UI mock 200/429/503 và validation; test POST API dữ liệu sai/origin khác.
- `pnpm run check`, `pnpm run build`.
- Sau deploy, dùng HTTPS production kiểm tra GET /forgot-password, POST /api/auth/email với dữ liệu không hợp lệ (không gửi thư), và **một** POST reset với hộp thư được chủ sở hữu cho phép; HTTP 200 chỉ xác nhận Auth API nhận yêu cầu.
- Người sở hữu cần tự xác nhận Inbox, mở link HTTPS → confirm (chỉ POST khi bấm) → reset mật khẩu → đăng nhập thành công. Không in/log token, mật khẩu hoặc địa chỉ đầy đủ.
- Nếu remote trả 503: kiểm tra log Vercel `[auth.email.upstream]` (chỉ mã lỗi) hoặc `[auth.email.network]`; sau đó Auth Logs và SMTP của Supabase.
