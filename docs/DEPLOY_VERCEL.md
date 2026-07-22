# Deploy Vercel

1. Đẩy source lên GitHub hoặc import trực tiếp vào Vercel.
2. Framework: Next.js.
3. Install/Build đã cấu hình pnpm trong `vercel.json`.
4. Thêm biến môi trường:

```env
NEXT_PUBLIC_APP_URL=https://YOUR_APP.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx

NEXT_PUBLIC_PUBLIC_SIGNUP_ENABLED=true
NEXT_PUBLIC_AUTH_EMAIL_SENDER_ADDRESS=email-xac-nhan@your-domain.example
ALLOWED_REVIEWER_DOMAIN=dntu.edu.vn

GOOGLE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
GOOGLE_APPS_SCRIPT_SHARED_SECRET=your_shared_secret
MAX_IMAGE_SIZE_MB=4
```

5. Trong Supabase Auth URL Configuration, thêm:

```text
https://YOUR_APP.vercel.app/auth/confirm
https://YOUR_APP.vercel.app/auth/callback
```

6. Trong phần nhà cung cấp đăng nhập, chỉ bật Email; tắt Google.
7. Deploy Vercel.
8. Tạo admin từ máy quản trị bằng `CREATE_USER_SUPABASE_CLI.ps1`.

`USER_PROVISIONING_SECRET` chỉ lưu trong Supabase Edge Function Secrets, không đưa vào Vercel.

Đặt `SUPABASE_SERVICE_ROLE_KEY` và `GOOGLE_APPS_SCRIPT_SHARED_SECRET` là biến môi trường nhạy cảm.


## SMTP xác nhận tài khoản

Cấu hình SMTP riêng và mẫu email theo `docs/CUSTOM_SMTP_CONFIRMATION_EMAIL.md`. Mật khẩu SMTP chỉ lưu trong Supabase Dashboard, không đưa lên Vercel.
