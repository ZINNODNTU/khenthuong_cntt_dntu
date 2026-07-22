# Cài đặt bằng pnpm

Dự án này chỉ hỗ trợ **pnpm**. `preinstall` sẽ từ chối nếu chạy bằng npm hoặc Yarn.

## Windows

Cách nhanh nhất:

```text
INSTALL_PNPM_WINDOWS.bat
```

Hoặc PowerShell:

```powershell
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install --no-frozen-lockfile
pnpm typecheck
pnpm dev
```

## Các lệnh chính

```powershell
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
pnpm start
pnpm generate-storage-secret
```

## Vercel

`vercel.json` đã cấu hình:

```text
Install: corepack enable && corepack prepare pnpm@10.34.5 --activate && pnpm install --no-frozen-lockfile
Build:   pnpm build
```

Sau lần cài đầu tiên, `pnpm-lock.yaml` sẽ được pnpm hoàn thiện. Nên commit lockfile mới trước khi deploy chính thức.
