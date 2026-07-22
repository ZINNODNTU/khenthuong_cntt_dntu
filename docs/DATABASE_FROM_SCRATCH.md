# Khoi tao database tu dau

## Canh bao

`00_RESET_DATABASE.sql` xoa:

- Toan bo ho so.
- Toan bo bang va cau hinh nghiep vu.
- Toan bo tai khoan dang nhap.
- Toan bo lich su xet duyet va nhat ky.

File reset khong xoa anh tren Google Drive.

## Thu tu thuc hien

### 1. Xoa database cu

Mo SQL Editor va chay:

```text
supabase/database/00_RESET_DATABASE.sql
```

### 2. Tao database moi

Chay:

```text
supabase/database/01_SETUP_DATABASE.sql
```

### 3. Tao admin dau tien

Dang nhap CLI:

```powershell
pnpm dlx supabase@latest login
```

Sau do chay:

```text
CREATE_INITIAL_ADMIN.bat
```

### 4. Khoi dong he thong

```powershell
pnpm install --no-frozen-lockfile
pnpm verify
pnpm db:verify
pnpm typecheck
pnpm build
pnpm dev
```

### 5. Cau hinh nghiep vu

Dang nhap admin va thuc hien:

1. Tao dot xet tai `/periods`.
2. Them CLB tai `/clubs` neu can.
3. Tao reviewer va submitter tai `/admin/users`.
4. Kiem tra kho anh tai `/settings`.
