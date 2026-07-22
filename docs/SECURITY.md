# Bảo mật

- `SUPABASE_SERVICE_ROLE_KEY` chỉ nằm trên Vercel server.
- `GOOGLE_APPS_SCRIPT_SHARED_SECRET` chỉ nằm trên Vercel server và Apps Script Properties.
- `SUPABASE_SECRET_KEY` dùng cho public viewer chỉ nằm trong Apps Script Properties.
- Browser không gọi Apps Script upload trực tiếp; mọi upload đi qua API đã xác thực của Next.js.
- Next.js và Apps Script đều kiểm tra MIME, chữ ký ảnh và dung lượng.
- File Drive giữ riêng tư; URL công khai dùng UUID token, không lộ file ID.
- Đổi shared secret ngay nếu nghi ngờ bị lộ và cập nhật đồng thời ở Apps Script/Vercel.
