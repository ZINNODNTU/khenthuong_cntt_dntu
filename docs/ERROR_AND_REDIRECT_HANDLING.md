# Xử lý chuyển hướng và trang lỗi — v1.0.0

## Nguyen nhan vong lap 307

Ban cu redirect user da co Auth session tu `/login` sang `/` tai proxy.
Khi profile bi thieu hoac `is_active=false`, `/` lai redirect ve `/login`, tao vong lap.

## Luong moi

- Chua co session: chuyen den `/401` va cung cap nut dang nhap.
- Co session nhung thieu profile: `/401?reason=profile-missing`.
- Tai khoan bi khoa: `/403?reason=inactive`.
- Sai vai tro: `/403?reason=role`.
- Loi truy van profile: `/500?code=PROFILE_LOOKUP_FAILED`.
- API chua dang nhap: JSON HTTP 401, khong redirect sang HTML.

## Xu ly tai khoan sau khi reset database

Neu trinh duyet con cookie cu sau khi `00_RESET_DATABASE.sql` xoa Authentication:

1. Mo `/401`.
2. Chon **Dang xuat phien hien tai**.
3. Tao lai admin bang `CREATE_INITIAL_ADMIN.bat`.
4. Dang nhap lai.
