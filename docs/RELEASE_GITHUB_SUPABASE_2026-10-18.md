# GitHub v1.1.0 và Supabase production — 18/10/2026

## Đích phát hành
- GitHub: https://github.com/ZINNODNTU/khenthuong_cntt_dntu — nhánh `main`.
- Supabase: `nzoamsyazdafyqnsxkny.supabase.co`, khớp `NEXT_PUBLIC_SUPABASE_URL` của workspace.
- App: Website xét khen thưởng cá nhân Đoàn – Hội Khoa Công nghệ thông tin.
- Migration mới: `supabase/migrations/20261018190000_individual_award_only.sql`.
- Hệ thống dùng C1–C9, dữ liệu tập thể lịch sử vẫn giữ nguyên.

## Trạng thái backend đã kiểm tra
- `pnpm run supabase:check`: PASS với Auth, các bảng và cột minh chứng đến migration 09.
- Trước phát hành, audit cũ ghi migration 05–09 đã chạy trên production. Không chạy lại các DDL cũ, KHÔNG chạy `INSTALL_NEW_PROJECT.sql` hay script `00_RESET_DATABASE.sql`.
- Việc thiếu key server-only `SUPABASE_SECRET_KEY` được ghi nhận trên local. Chỉ thêm trong cấu hình môi trường bí mật Vercel/hosting; không commit khóa.
- Chrome profile DNTU hiện chưa được NEXORA xác thực lại, không cho phép thao tác SQL Editor khi chưa có phiên đúng tài khoản.
- Không có backup độc lập được xác nhận. Trước khi thay đổi production có dữ liệu sinh viên, phải tạo backup PostgreSQL khôi phục được.

## Áp dụng migration production (phải có quyền quản trị)
1. Đăng nhập Supabase Dashboard đúng project reference trên, kiểm tra Organization, project và môi trường PRODUCTION.
2. Sao lưu trước khi triển khai. Xác minh schema các bảng `public.applications`, `public.profiles`, `public.evaluation_periods` tồn tại và chỉ định hệ thống sẽ ngừng nhận tập thể.
3. Kiểm tra migration history: các phiên bản đến `20261009120000` đã áp dụng; nếu không, dừng lại và đối chiếu thứ tự migration.
4. Trong SQL Editor của đúng project, chạy nguyên văn file `supabase/migrations/20261018190000_individual_award_only.sql` với transaction. File này không xóa dữ liệu.
5. Kiểm tra các trigger đã tồn tại: `reject_new_collective_award_application`, `reject_new_collective_submitter`, `reject_new_collective_period`, và log/đối chiếu migration history. Nếu chạy thủ công, đồng bộ lịch sử migration bằng công cụ Supabase phù hợp, tránh chạy trùng.
6. Kiểm tra RLS, xác thực sinh viên, C1–C9, upload/download Drive, vòng xét Đạt/Không đạt, cron cleanup bằng tài khoản thử nghiệm và **không ghi vào dữ liệu thật**.
7. Triển khai frontend/backend chỉ khi biến `SUPABASE_SECRET_KEY` trong môi trường production đã có, và Google Apps Script web app có đầy đủ cấu hình.

## Kiểm tra SQL chỉ đọc
```sql
select t.tgname, c.relname
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and t.tgname in
('reject_new_collective_award_application', 'reject_new_collective_submitter', 'reject_new_collective_period')
and not t.tgisinternal
order by t.tgname;
```
Kỳ vọng đúng **3 trigger**. Nếu chưa đủ thì migration chưa được áp dụng xong.

## Hoàn tác chỉ migration mới
Chỉ khi cần khôi phục nghiệp vụ cũ và đã đánh giá tác động:
```sql
BEGIN;
DROP TRIGGER IF EXISTS reject_new_collective_award_application ON public.applications;
DROP TRIGGER IF EXISTS reject_new_collective_submitter ON public.profiles;
DROP TRIGGER IF EXISTS reject_new_collective_period ON public.evaluation_periods;
COMMIT;
```
Không tự động bật lại xét tập thể trên frontend/API, cần phát hành mã tương ứng nếu rollback.

## Điều kiện nghiệm thu
- `pnpm run check` gồm 67 unit tests, build và Playwright local phải PASS.
- Kiểm tra tốc độ trong `docs/PERFORMANCE_LOCAL_AUDIT_2026-10-18.md` và RLS read-only audit.
- Ngưỡng GPA 2,80/4,00 đang là **đề xuất**, cần phê duyệt trước khi mở xét.
