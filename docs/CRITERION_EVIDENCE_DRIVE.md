# Quy trình nộp minh chứng C1–C9 và lưu Google Drive

## Quy tắc vận hành

- **C1–C6:** mỗi tiêu chí bắt buộc tối thiểu 1 và tối đa **20** minh chứng (có thể chọn nhiều tệp).
- **C7:** kết quả rèn luyện loại Tốt hoặc Xuất sắc: **đúng 1** minh chứng.
- **C8:** bảng điểm/xác nhận ĐTB tích lũy đề xuất từ 2,80/4,00: **đúng 1** minh chứng.
- **C9:** xác nhận không bị kỷ luật từ khiển trách trở lên và không vi phạm quy định/quy chế: **đúng 1** minh chứng.
- Hồ sơ tập thể sử dụng C1–C6; các điều kiện cá nhân C7–C9 không yêu cầu cho hồ sơ tập thể.
- Từng tiêu chí chỉ có trạng thái *Chưa đánh giá* → *Đạt* hoặc *Không đạt*; nút đặt lại giúp chỉnh sửa trong thời gian xét. Không chấm điểm số, không dùng trọng số hay ngưỡng phần trăm.
- Hệ thống yêu cầu tối thiểu 1 minh chứng cho **mỗi** tiêu chí áp dụng trước khi nộp; sau khi nộp, chỉ cán bộ có quyền mới đánh giá. Nếu thiếu minh chứng, hồ sơ có thể chuyển về *Yêu cầu bổ sung*.
- Hỗ trợ **JPG, PNG, WebP, PDF**; giới hạn mặc định **4 MB/tệp**. Không dùng liên kết Google Drive công khai cho minh chứng cá nhân.

## Cấu trúc và luồng lưu

```text
Trang nộp hồ sơ Next.js
  └── POST /api/evidence/upload (xác thực, kiểm tra quyền và hạn mức)
      ├── Supabase: kiểm tra hồ sơ ở draft/revision và quyền sở hữu
      ├── Google Apps Script Web App (shared secret, HTTPS)
      │    └── Drive/private-root/applications/<APPLICATION_CODE>/criterion_c1..criterion_c9/<file>
      └── Supabase evidences: application_id, category, drive_file_id, file_name, mime_type, size_bytes...
```

Khi xem minh chứng: giao diện gọi `GET /api/evidence/{id}`; API kiểm tra session + RLS của Supabase rồi dùng Apps Script để tải tệp từ Drive. Khi xóa/đổi tệp trong trạng thái cho phép, xóa metadata Supabase và đưa tệp Drive vào thùng rác.

Google Drive chỉ lưu **nội dung tệp**; Supabase quản lý quan hệ hồ sơ–tiêu chí, metadata, phân quyền, trạng thái Đạt/Không đạt và lịch sử xét duyệt. Thư mục Drive **không đặt chế độ “Anyone with the link”**.

## Triển khai

1. **Sao lưu Supabase hiện có trước.** Với cơ sở dữ liệu đã cài các migration 01–04, áp dụng tiếp:
   `supabase/migrations/20261008160000_criterion_evidence_binary.sql`.
   Dùng SQL Editor hoặc quy trình migration chính thức của dự án. Không chạy lại tập tin reset dữ liệu.
2. Với **Supabase project hoàn toàn mới**, dùng `supabase/database/INSTALL_NEW_PROJECT.sql` (đã được tạo lại bao gồm phần 05). Không chạy tệp này lên project đã có schema.
3. Mở Apps Script gắn với Drive, cập nhật `google-apps-script/Code.gs` để hỗ trợ PDF và **vô hiệu hóa viewer public token**, rồi triển khai phiên bản Web App mới. Chạy dưới tài khoản chủ sở hữu (Execute as Me). “Anyone” ở tầng Apps Script **chỉ** dành cho endpoint dùng shared secret; Drive vẫn giữ riêng tư. Không đưa shared secret vào client/frontend.
4. Script Properties chỉ cần `DRIVE_ROOT_FOLDER_ID`, `STORAGE_SHARED_SECRET`, tùy chọn `MAX_IMAGE_SIZE_BYTES=4194304`. **Xóa `SUPABASE_SECRET_KEY` và `SUPABASE_URL` cũ** khỏi Apps Script sau khi tắt viewer public. `setupStorage()` không còn in shared secret ra log.
5. Trước khi deploy Next.js mới, chạy tiếp `supabase/migrations/20261008170000_security_hardening.sql` (migration 06). Next.js/Vercel server env: `GOOGLE_APPS_SCRIPT_WEB_APP_URL` (URL `/exec`), `GOOGLE_APPS_SCRIPT_SHARED_SECRET`, `MAX_IMAGE_SIZE_MB=4`, `CRON_SECRET` (ít nhất 24 ký tự). Bảo mật các biến này ở server; **không** dùng tiền tố `NEXT_PUBLIC_`.
6. Deploy Next.js, sau đó kiểm tra `/api/storage/health` bằng phiên đăng nhập có quyền và thử nộp một hồ sơ test C1–C9. Xác minh giới hạn tổng 40 tệp, 60 MiB/hồ sơ, API 429, cron dọn tệp. Xem `docs/SECURITY_HARDENING_2026-10-08.md`.

## Kiểm tra nghiệm thu

- C1 tải 2–3 tệp PDF/ảnh; các C2–C6 mỗi tiêu chí 1 hoặc nhiều tệp; các tệp được lưu tại thư mục đúng mã hồ sơ + mã tiêu chí.
- C7–C9 mỗi tiêu chí tải **một tệp**; thử gửi thêm tệp thứ hai phải bị từ chối ở API và database, không chỉ ở giao diện.
- Thử bỏ trống 1 tiêu chí và gửi hồ sơ: bị chặn, chỉ rõ tiêu chí thiếu.
- Thử PDF giả MIME hoặc PDF vượt 4 MB: bị chặn.
- Kiểm tra các vai trò: người khác không thể sửa/xóa/đọc tệp của hồ sơ không được cấp quyền; đường dẫn Drive không hiển thị cho người nộp.
- Người xét chỉ thấy Đạt/Không đạt, có thể mở từng tệp, bắt buộc ghi lý do khi Không đạt; không xuất hiện ô nhập điểm/biểu điểm.
- Hồ sơ cũ vẫn được giữ nguyên trong DB. Khi phải bổ sung, các hồ sơ chưa có minh chứng theo từng tiêu chí cần nộp đủ trước khi gửi lại.

**Lưu ý:** sửa mã nguồn hoặc tạo migration **không tự thay đổi** Google Drive, Apps Script đang chạy hoặc Supabase production; cần triển khai theo đúng thứ tự trên. Không thể xác minh upload thực tế nếu chưa có thông tin triển khai và phiên đăng nhập phù hợp.
