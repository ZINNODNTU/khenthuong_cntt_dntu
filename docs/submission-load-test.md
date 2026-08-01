# Kiểm thử tải luồng nộp hồ sơ

## Mục tiêu
- 20 tài khoản submitter riêng.
- Mỗi tài khoản tạo một hồ sơ và tải 5 ảnh 1–4 MB.
- Chạy trên staging/preview, không chạy trực tiếp production.

## Chuẩn bị
1. Deploy migration `supabase/hotfix/ADD_EVIDENCE_UPLOAD_IDEMPOTENCY.sql`.
2. Cập nhật `google-apps-script/Code.gs`, tạo deployment version mới.
3. Kiểm tra endpoint storage health trả `version: 1.1.0`.
4. Tạo 20 tài khoản test, mỗi tài khoản có phạm vi cá nhân và chi đoàn hợp lệ.
5. Tạo một đợt xét staging đang mở.

## Kịch bản
1. Tất cả tài khoản đăng nhập trước.
2. Đồng loạt gửi POST `/api/applications`.
3. Mỗi tài khoản tải 5 ảnh qua `/api/evidence/upload`.
4. Retry một upload bằng cùng `uploadKey` để kiểm tra idempotency.
5. PATCH hồ sơ sang `submitted`.

## Ngưỡng đạt
- Không hồ sơ trùng.
- Ít nhất 99% hồ sơ hoàn tất sau tối đa một lần thử lại.
- P95 tạo dữ liệu < 3 giây.
- P95 một ảnh < 10 giây.
- Hồ sơ 5 ảnh < 60 giây.
- Số metadata DB bằng số file Drive hợp lệ.

## Thu thập
- `requestId`, `storageMs`, `totalMs` trong log `[evidence.upload.ok]`.
- HTTP status và mã lỗi từ mọi request.
- P50/P95/P99 cho tạo hồ sơ, upload và submit.
- Số draft còn lại sau test.

## Cleanup
- Xóa hồ sơ test bằng admin.
- Đối chiếu file Drive đã vào thùng rác.
- Xóa tài khoản test nếu không dùng lại.
