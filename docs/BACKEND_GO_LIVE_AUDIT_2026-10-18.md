# CNTT DNTU — Backend production audit (18/10/2026)

## Phạm vi và định danh
- Workspace: `D:\khenthuong_cntt_dntu`.
- Supabase project: `khenthuong_cntt_dntu`, organization `ZINNODNTU`, branch `main / PRODUCTION`.
- Chrome profile DNTU (Default) được NEXORA xác minh trùng profile đã được workspace gắn.
- Project reference trên Supabase trùng với host của `NEXT_PUBLIC_SUPABASE_URL` trong `.env.local`. Không ghi chép khóa/token.

## Thực thi thành công
1. Trước khi cập nhật: migration history có 5 dòng, kết thúc tại `20261008150500_edu_registration_onboarding`. `applications=0`, `evidences=0`, `profiles=2`, `auth.users=2`.
2. Chạy thử toàn bộ migration 05–09 bằng transaction và `ROLLBACK`; truy vấn xác nhận `DRY_RUN_ROLLED_BACK=true` và `evidence_entries_not_created=true`.
3. Triển khai migration 05–09 lên đúng production trong một transaction duy nhất, đồng thời ghi 5 phiên bản vào `supabase_migrations.schema_migrations`:
   - `20261008160000_criterion_evidence_binary`
   - `20261008170000_security_hardening`
   - `20261009100000_evidence_entries`
   - `20261009110000_collective_criteria_t_codes`
   - `20261009120000_evidence_content_integrity`
4. `pnpm run supabase:check`: PASS. Các bảng `evidence_entries`, `storage_cleanup_queue`; cột `evidence_entry_id`, `upload_key`, `content_sha256` đều truy cập được.
5. Audit 22 điều kiện từ `supabase/ops/VERIFY_GO_LIVE_READ_ONLY.sql`: **22/22 PASS** trên một tab SQL mới, chỉ đọc.
6. Truy vấn lịch sử migration sau cập nhật xác minh đủ 5 phiên bản 05–09.
7. `pnpm run storage:smoke`: **PASS** với Drive thật — upload, idempotent retry, từ chối bytes khác cùng key, download SHA-256, trash và từ chối tải tệp đã trash.
8. Sau khi bổ sung kiểm tra trạng thái tài khoản cho API DELETE minh chứng: `pnpm run check` **PASS 67/67**, `pnpm run build` **PASS**.
9. Đã khởi động `pnpm run dev` trên máy @cntt, Next.js 16.3.8 lắng nghe `http://localhost:3000` (background job). HTTP smoke test: `/` và `/login` trả `200`; `/api/storage/health` và `/api/evidence/<unknown-id>` trả `401` khi không đăng nhập, đúng kiểm soát truy cập.

## Hạn chế chưa được nghiệm thu
- **Supabase Free Plan không có scheduled backups**. Project hiển thị `No backups`. Đã thử transaction rollback trước khi áp dụng migration; đó **không phải** bản sao lưu độc lập. Cần thiết lập bản dump/restore định kỳ trước khi vận hành có dữ liệu sinh viên.
- `.env.local` chưa có `SUPABASE_SECRET_KEY` hoặc `SUPABASE_SERVICE_ROLE_KEY`: các API server cần quyền đặc biệt chưa thể nghiệm thu đầy đủ. Supabase Dashboard có mục Secret keys, nhưng không trích xuất hoặc tiết lộ khóa.
- Chưa xác minh `SUPABASE_SECRET_KEY`, `GOOGLE_APPS_SCRIPT_*`, `CRON_SECRET` trên Vercel production và chưa deploy phiên bản frontend/backend mới.
- Chưa chạy E2E thực sự với submitter, reviewer, admin; chưa có load test nhiều người upload đồng thời và kiểm thử restore backup.
- Workspace dùng Node v24.16.0, trong khi `package.json` yêu cầu Node 22.x.
- Bộ tiêu chí T1–T6 và ngưỡng GPA đề xuất cần hội đồng có thẩm quyền phê duyệt.

## Việc tiếp theo để go-live
1. Quản trị viên thiết lập bản backup có thể khôi phục trên môi trường riêng, không đưa dump chứa thông tin cá nhân lên Git.
2. Cấu hình khóa Supabase server-only và biến môi trường Vercel trực tiếp trong Dashboard, không gửi khóa qua chat hay commit Git.
3. Deploy frontend/backend đồng bộ với database migration 05–09. Kiểm tra `/api/storage/health` bằng admin phải báo `ok=true`.
4. Thử E2E tạo hồ sơ C1–C9/T1–T6, upload PDF/JPG, lưu nháp, xét duyệt Đạt/Không đạt, bổ sung, xem tệp, xóa/tác vụ cleanup và kiểm tra truy cập chéo.
5. Chạy benchmark và kiểm thử Node 22, kiểm tra Git diff/staged/untracked trước khi commit/push.

Không chạy script reset hoặc bộ cài `INSTALL_NEW_PROJECT.sql` trên database production hiện tại.
