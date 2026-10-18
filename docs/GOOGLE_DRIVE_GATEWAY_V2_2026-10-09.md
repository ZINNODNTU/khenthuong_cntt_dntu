# Google Drive gateway v2.x — triển khai & nghiệm thu (09/10/2026)

## Kiến trúc

Trình duyệt → Next.js API (Supabase session + RLS + quota) → Apps Script Web App (shared secret + SHA-256 + khóa đồng thời) → Google Drive riêng tư. Metadata nằm trong Supabase, nội dung tài liệu ở Drive. Không chia sẻ file Drive trực tiếp cho sinh viên hay người xét duyệt.

Bản v2 bảo vệ upload đồng thời và retry bằng Drive filename xác định từ application + category + uploadKey, không phụ thuộc CacheService 6 giờ. Client retry khi lỗi mạng, backend chỉ gửi một lần có timeout 38 giây; cùng upload key/nội dung trả về cùng Drive ID. Tệp tải xuống được kiểm tra chữ ký MIME và SHA-256. Xóa tệp/hồ sơ ghi outbox trước, dọn Drive bằng cron.

## Supabase (phải làm TRƯỚC khi deploy web)

1. Backup project đang vận hành, kiểm tra chính xác môi trường và migration history, thử ở staging.
2. Nếu chưa có, áp dụng theo thứ tự: supabase/migrations/20261008170000_security_hardening.sql (06), supabase/migrations/20261009100000_evidence_entries.sql (07), supabase/migrations/20261009110000_collective_criteria_t_codes.sql (08), supabase/migrations/20261009120000_evidence_content_integrity.sql (09). Đảm bảo migration 05 và hotfix idempotency đã có trước khi chạy 06–09.
3. Không chạy 00_RESET_DATABASE.sql hay INSTALL_NEW_PROJECT.sql trên DB có dữ liệu.
4. Chạy SQL kiểm tra chỉ đọc trong supabase/ops/VERIFY_GO_LIVE_READ_ONLY.sql bằng SQL Editor của đúng project; mọi hàng phải PASS. Kiểm tra lại bằng pnpm run supabase:check và với admin trên /api/storage/health. Đảm bảo RPC/trigger T1–T6 được thử riêng trên staging.

Tại lần kiểm tra ngày 09/10/2026, Supabase URL đang kết nối chưa có evidence_entries, storage_cleanup_queue, evidences.evidence_entry_id và evidences.content_sha256; evidences.upload_key đã tồn tại. Do đó chưa thể nghiệm thu lưu tệp thật.

## Google Apps Script (phiên bản 2)

1. Dùng tài khoản Google chuyên dụng sở hữu một folder minh chứng riêng tư trên Drive; không đặt “Anyone with the link” cho folder/tệp.
2. Trong Google Apps Script, thay nội dung bằng google-apps-script/Code.gs và cập nhật appsscript.json từ repo. Tạo New version khi Deploy, không chỉ Save source.
3. Script Properties: DRIVE_ROOT_FOLDER_ID = ID folder; STORAGE_SHARED_SECRET = bí mật ngẫu nhiên tối thiểu 24 ký tự; MAX_IMAGE_SIZE_BYTES = 4194304. Sinh bí mật ở máy quản trị bằng pnpm generate-storage-secret, nhập ở Google và Vercel; không đưa secret vào Git, log hay chat.
4. Trong Apps Script Editor chạy setupStorage() một lần và diagnoseStorage() để xác minh cấu hình. Không chạy generateSharedSecret() nếu chưa sẵn sàng cập nhật secret đồng thời trên server.
5. Deploy Web App: Execute as Me (tài khoản sở hữu folder), Who has access: Anyone cho server-to-server nếu cần. HTTP endpoint công khai nhưng thao tác yêu cầu shared secret; giữ URL/server credentials kín. Dùng URL kết thúc /exec, không dùng /dev.
6. Thu hồi Script Properties SUPABASE_SECRET_KEY / SUPABASE_URL cũ. Xoay secret nếu bản cũ từng ghi nó vào execution logs.

**Bắt buộc deploy Apps Script v2 và Next.js backend v2 đồng bộ**: gateway mới yêu cầu trường SHA-256 khi upload. Next.js tuân theo HTTP redirect của Apps Script ContentService.

## Next.js / Vercel server environment

- NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: cấu hình công khai.
- SUPABASE_SECRET_KEY hoặc SUPABASE_SERVICE_ROLE_KEY: chỉ server.
- GOOGLE_APPS_SCRIPT_WEB_APP_URL: địa chỉ /exec v2.
- GOOGLE_APPS_SCRIPT_SHARED_SECRET: khớp STORAGE_SHARED_SECRET tại Apps Script.
- CRON_SECRET: ngẫu nhiên ít nhất 24 ký tự.
- MAX_IMAGE_SIZE_MB = 4.

Không thêm NEXT_PUBLIC_ trước bất cứ biến bí mật nào. Redeploy web sau khi cập nhật env. Cron dọn file trong vercel.json chạy mỗi ngày lúc 03:00 UTC; kiểm tra giới hạn Cron của gói Vercel đang dùng trước khi đổi lịch.

## Checklist nghiệm thu trên staging

1. pnpm run check; pnpm run build dưới Node.js 22.x (đúng khai báo dự án).
2. pnpm run supabase:check; pnpm run storage:check; chạy supabase/ops/VERIFY_GO_LIVE_READ_ONLY.sql bằng SQL Editor có quyền; admin truy cập /api/storage/health và kiểm tra ok=true, schemaReady=true, gatewayReady=true, version=2.x.
3. C1 có hai mục thông tin, mỗi mục hai tệp. C7–C9 mỗi tiêu chí đúng một tệp. Tập thể mới T1–T6, tập thể cũ còn giữ C-code.
4. Lưu nháp, refresh, nộp, reviewer mở ảnh/PDF. Tài khoản không có quyền phải bị chặn; file Drive không public.
5. Retry upload cùng key/nội dung trả cùng Drive file ID kể cả khi cache hết hạn. Dữ liệu đổi nhưng giữ key phải bị từ chối; kiểm tra giả MIME, vượt 4 MiB, sai secret, file bên ngoài root.
6. Xóa tệp/hồ sơ, xác minh metadata biến mất tức thì; file được đưa vào thùng rác sau cron. Quan sát storage_cleanup_queue để xử lý lần retry nếu Drive tạm lỗi.

Node vm tests mô phỏng Drive, không thay thế kiểm thử thực tế trên Apps Script/Google Drive staging. Phiên này không thay đổi production DB, Google deployment hoặc Vercel deployment.
