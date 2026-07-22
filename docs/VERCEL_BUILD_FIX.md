# Cấu hình triển khai Production — v1.0.0

## Thay đổi

- Pin Node.js `22.x`.
- `pnpm build` chỉ chạy `next build`.
- Các kiểm tra nội bộ chuyển sang `pnpm check`.
- Vercel chạy `pnpm exec next build` trực tiếp.
- Trang đăng ký và các trang xác thực được đánh dấu chạy động.
- Hỗ trợ `SUPABASE_SECRET_KEY` và `SUPABASE_SERVICE_ROLE_KEY`.
- Proxy không yêu cầu server secret để kiểm tra phiên đăng nhập.

## Biến môi trường Vercel

Tạo đủ cho Production, Preview và Development:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
NEXT_PUBLIC_PUBLIC_SIGNUP_ENABLED
ALLOWED_REVIEWER_DOMAIN
GOOGLE_APPS_SCRIPT_WEB_APP_URL
GOOGLE_APPS_SCRIPT_SHARED_SECRET
MAX_IMAGE_SIZE_MB
```

Không đưa `SUPABASE_SECRET_KEY` vào biến `NEXT_PUBLIC_*`.

## Cấu hình Vercel

Trong Project Settings:

```text
Node.js Version: 22.x
Framework Preset: Next.js
Root Directory: thư mục chứa package.json
```

Build Command và Install Command có thể để theo `vercel.json`.

## Chạy kiểm tra local

```powershell
pnpm install --no-frozen-lockfile
pnpm check
pnpm build
```

Nếu Vercel từng cache bản lỗi, thêm tạm:

```text
VERCEL_FORCE_NO_BUILD_CACHE=1
```

sau đó Redeploy.
