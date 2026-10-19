# Supabase — chuẩn hóa quy tắc hồ sơ cá nhân (19/10/2026)

## Phạm vi

Website xét khen thưởng Đoàn – Hội Khoa CNTT sử dụng Supabase Auth và các bảng RLS.
Bộ tiêu chí cá nhân vẫn duy trì 9 mã C1–C9 để tương thích với dữ liệu lịch sử.

- **Nhóm A, C1–C6:** chọn những tiêu chí thực sự có thành tích; phải có ít nhất một tiêu chí nộp minh chứng. Không yêu cầu nộp đủ cả sáu.
- **Nhóm B, C7 và C8:** mỗi tiêu chí bắt buộc đúng 01 tệp xác nhận.
- **Nhóm B, C9:** bắt buộc tích cam kết không bị kỷ luật từ mức khiển trách trở lên và không vi phạm quy định, quy chế Nhà trường. Trường hợp C9 không yêu cầu tải tệp riêng. Hội đồng vẫn cần đối chiếu trước khi chấm Đạt.
- **Ảnh chân dung:** vẫn bắt buộc; các điều kiện ảnh và hạn mức lưu trữ được giữ nguyên.
- **Cơ chế xét duyệt:** Hội đồng phải đánh giá Đạt các tiêu chí nhóm A đã kê khai, cùng với C7, C8 và C9. Các tiêu chí A chưa kê khai không làm hồ sơ bị trượt tự động.
- **Dữ liệu lịch sử:** không xóa hồ sơ, minh chứng, kết quả xét hay lịch sử thao tác.

## Mã nguồn và migration

- Migration bổ sung: `supabase/migrations/20261019220000_optional_personal_achievement_commitment.sql`.
- Bản SQL tương đương cho quản trị viên: `supabase/database/10_OPTIONAL_PERSONAL_COMMITMENT.sql`.
- Bản cài đặt cho **database hoàn toàn mới**: `supabase/database/INSTALL_NEW_PROJECT.sql` (không dùng để cập nhật database đã có dữ liệu).
- Lệnh kiểm tra local: `pnpm run db:verify`, `pnpm run supabase:check`, `pnpm run check`, `pnpm run build`.

### Áp dụng trên Supabase đang sử dụng (có dữ liệu)

1. Xác nhận đúng Supabase project tương ứng với `NEXT_PUBLIC_SUPABASE_URL` của môi trường cần cập nhật. Không xuất khóa/token/connection string ra báo cáo hoặc commit.
2. Tạo bản backup/khả năng khôi phục trước khi tác động database production; ghi nhận migration đã áp dụng.
3. Vào **SQL Editor** với đúng tài khoản có quyền quản lý project. Chạy **chỉ** nội dung `10_OPTIONAL_PERSONAL_COMMITMENT.sql`. Không chạy `00_RESET_DATABASE.sql`, không chạy `INSTALL_NEW_PROJECT.sql` trên database đã có bảng.
4. Nếu sử dụng Supabase CLI với phiên đăng nhập của chủ project, kiểm tra `supabase migration list`, chạy `supabase db push` (không cần Docker khi đẩy migration trực tiếp lên hosted database). Xác nhận không vô tình đẩy migration cũ chưa được triển khai.
5. Đối chiếu các chức năng SQL sau khi triển khai:

```sql
select p.proname,
       strpos(pg_get_functiondef(p.oid), 'DISCIPLINARY_COMMITMENT_REQUIRED') > 0 as commitment_guard,
       strpos(pg_get_functiondef(p.oid), 'PERSONAL_ACHIEVEMENT_REQUIRED') > 0 as optional_achievement_guard
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'assert_award_criteria_complete',
    'guard_criterion_evidence_submission',
    'verify_application_criterion'
  )
order by p.proname;
```

6. Kiểm tra với **tài khoản thử nghiệm riêng**: khai C3 có minh chứng + C7/C8 có tệp + C9 đã cam kết, gửi hồ sơ, và đánh giá Đạt C3/C7/C8/C9. Kiểm tra trường hợp không tích C9 bị từ chối; C1/C2/C4/C5/C6 bỏ trống không cản gửi.
7. Thử luồng lưu nháp, gửi lại sau yêu cầu bổ sung, quyền hạn nộp/xét, và ảnh/PDF riêng tư. Không tạo hồ sơ thật để kiểm thử nếu chưa có sự cho phép của người sở hữu dữ liệu.

### Cấu hình bảo mật/hoạt động

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: được công bố phía client theo thiết kế.
- `SUPABASE_SECRET_KEY`: **bắt buộc thiết lập ở server khi chạy những API có thao tác quản trị/service-role**. Không đưa vào `NEXT_PUBLIC_*`, Git, docs hay phản hồi chat.
- Giữ nguyên quy tắc RLS, dùng RPC cho thẩm định và kết luận; không cấp quyền truy cập công khai vào bảng minh chứng.
- Kiểm tra domain email sinh viên, URL callback Auth và SMTP/sender trước khi đưa lên production. Không coi cấu hình email là đã xác nhận chỉ vì Auth endpoint trả về 200.
- Kiểm tra kết quả `pnpm run supabase:check` và khắc phục các cảnh báo trước khi nhận hồ sơ thật.

## Trạng thái triển khai

**Đã triển khai trực tiếp ngày 19/10/2026** trên project `khenthuong_cntt_dntu` trong tổ chức `ZINNODNTU's Org` (đúng project ref trong `.env.local`). Supabase SQL Editor xác nhận giao dịch thành công cho:
- `20261018190000_individual_award_only.sql`: tạo ba trigger chỉ nhận hồ sơ/tài khoản/đợt xét cá nhân mới, không xóa hồ sơ tập thể lịch sử.
- `20261019220000_optional_personal_achievement_commitment.sql`: cập nhật ba hàm kiểm tra nộp/xét, áp dụng C1–C6 linh hoạt, C7/C8 có tệp, C9 tích cam kết.

Đã kiểm tra hàm SQL sau triển khai bằng `pg_get_functiondef` (cả ba có dấu hiệu xử lý C9; hai hàm kiểm tra có điều kiện nhóm A) và đồng bộ cả hai version vào `supabase_migrations.schema_migrations` (đã truy vấn lại thấy đủ hai dòng). Định nghĩa ba hàm cũ được lưu tại bản backup nội bộ của máy triển khai để hoàn tác, **không phải backup toàn database**.

**Còn cần nghiệm thu:** `SUPABASE_SECRET_KEY` chưa có trong môi trường local được kiểm tra trước đó; chưa chạy end-to-end có phiên đăng nhập sinh viên và reviewer thật, và chưa xác nhận các biến bí mật production/Vercel. Chưa khẳng định sản phẩm đã sẵn sàng nhận hồ sơ thật.
