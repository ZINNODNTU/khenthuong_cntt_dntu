# Bộ tiêu chí cá nhân và tập thể — triển khai T1–T6 (09/10/2026)

## Quyết định nghiệp vụ cần phê duyệt

Bộ cá nhân C1–C9 giữ nguyên. Bộ tập thể T1–T6 là **đề xuất**, chưa phải văn bản
quy định của Trường/Khoa đã được phê duyệt; cần hội đồng xác nhận nội dung và
việc **cả sáu tiêu chí phải được đánh giá Đạt** trước khi áp dụng chính thức.
GPA tích lũy 2,80/4,00 ở C8 vẫn là ngưỡng **đề xuất**.

| Mã cá nhân | Mục đánh giá | Mã tập thể | Mục đánh giá |
|---|---|---|---|
| C1 | Đóng góp nổi bật Đoàn – Hội | T1 | Hoàn thành kế hoạch, nhiệm vụ |
| C2 | Vai trò tổ chức/điều phối cá nhân | T2 | Năng lực tổ chức/phối hợp |
| C3 | Giấy khen/chứng nhận cá nhân | T3 | Huy động, gắn kết thành viên |
| C4 | Tham gia thường xuyên, tích cực | T4 | Đóng góp phong trào, cộng đồng |
| C5 | Vai trò cán bộ, CLB và nhiệm vụ | T5 | Kết quả/thành tích tập thể được ghi nhận |
| C6 | Sáng kiến, mô hình, lan tỏa cá nhân | T6 | Cải tiến, mô hình hiệu quả, lan tỏa |
| C7 | Rèn luyện Tốt trở lên | — | Không áp dụng |
| C8 | Học tập, GPA tích lũy 2,80/4,00 (đề xuất) | — | Không áp dụng |
| C9 | Không kỷ luật từ khiển trách trở lên | — | Không áp dụng |

C1–C6, T1–T6: mỗi tiêu chí nhiều mục thông tin, mỗi mục nhiều tài liệu.
C7–C9: một mục, một tệp theo tiêu chí. Mỗi tiêu chí chỉ xác minh Đạt/Không đạt.

Điều cần lưu ý: T5 không yêu cầu có giải thưởng nếu đã có kết quả được xác nhận;
T6 không yêu cầu sáng kiến đạt giải, nhưng cách làm cần triển khai thực tế.

## Kiến trúc mã

- `lib/award-criteria.ts` — chín tiêu chí cá nhân.
- `lib/collective-award-criteria.ts` — sáu định nghĩa tập thể.
- `lib/award-criteria-scope.ts` — lựa chọn bộ theo loại hồ sơ và phân biệt
  hồ sơ C-coded lịch sử với hồ sơ T-coded mới.
- `lib/types.ts` — union mã C1–C9, T1–T6.
- `lib/criterion-evidence.ts` — category Drive `criterion_cN` hoặc
  `criterion_tN`, kiểm tra số lượng file theo mã hồ sơ.
- `lib/criteria-rules.ts` — kiểm tra đủ 9 tiêu chí cá nhân hoặc 6 tiêu chí
  tập thể mới; hỗ trợ 9 bản ghi ở hồ sơ tập thể cũ.
- `lib/evidence-entry-rules.ts` — kiểm tra tên nhóm và liên kết file theo
  đúng bộ tiêu chí đã lưu.
- `app/api/applications/route.ts` — hồ sơ tập thể **mới tạo T1–T6 thật**,
  không sinh C7–C9. Cá nhân vẫn tạo C1–C9.
- `/api/evidence/entries`, `/api/evidence/upload` — kiểm tra tiêu chí có
  thuộc hồ sơ trong cơ sở dữ liệu trước khi cho lưu/upload.
- Trang tra cứu tiêu chí, nộp, bổ sung, xét duyệt, danh sách tài liệu, tóm
  tắt và phiếu in đều hiển thị mã và nội dung của từng loại hồ sơ.

## Tương thích dữ liệu cũ

**Không đổi mã của hồ sơ đã tồn tại**: mọi tập thể cũ có bản ghi C1–C9,
các nhóm và minh chứng `criterion_cN`, kết luận và snapshot xét duyệt được giữ
nguyên. Những hồ sơ được tạo ở lần cập nhật trước có tên T1–T6 nhưng mã lưu
C1–C6 cũng tiếp tục được giải thích theo tên đã lưu; API vẫn dùng C cho chúng.

Các hồ sơ tập thể tạo **sau khi áp dụng migration 08** dùng T1–T6 và
`criterion_tN` hoàn toàn độc lập. Không có backfill phá dữ liệu hay cập nhật
trạng thái kết luận cũ.

CSDL đã được chuẩn bị một migration additive, kiểm tra ranh giới hai bộ,
giới hạn 20 tệp/tiêu chí (3 tiêu chí cá nhân cuối 1 tệp), bắt buộc upload trước
khi nộp và bắt buộc mọi tiêu chí áp dụng đã Đạt trước khi kết luận. Công cụ xóa
file cũng hỗ trợ category T và tiếp tục ghi hàng đợi dọn Google Drive an toàn.

## Điều kiện vận hành

CẦN sao lưu CSDL và thử staging. **Không** dùng `00_RESET_DATABASE.sql`
hoặc chạy lại `INSTALL_NEW_PROJECT.sql` trên Supabase có dữ liệu.

Đối với cơ sở dữ liệu đang chạy, theo đúng thứ tự áp dụng **hai migration riêng**:

1. `supabase/migrations/20261009100000_evidence_entries.sql` — nhóm
   thông tin minh chứng (nếu chưa chạy).
2. `supabase/migrations/20261009110000_collective_criteria_t_codes.sql`
   — mã tập thể T1–T6, ràng buộc và RPC.

Có thể chạy nội dung file trong Supabase Dashboard > SQL Editor sau khi kiểm tra
môi trường / sao lưu. `pnpm run supabase:sql` chỉ tạo file SQL cài đặt cho
**dự án mới**, không thực thi trên Supabase.

**Không triển khai mã mới lên web chính thức trước khi áp dụng migration 08**:
API tạo hồ sơ tập thể mới sẽ thất bại khi DB vẫn giới hạn C-code.

## Kiểm thử

- `pnpm run check`
- `pnpm run build`
- `pnpm exec playwright test tests/ui-audit.spec.ts --workers=1`
- Kiểm tra E2E cần tài khoản submitter thực và Google Drive thật:
  tạo hồ sơ Chi đoàn/CLB mới -> xem 6 bản ghi T -> thêm 2 mục T1 mỗi mục
  2 tệp PDF/ảnh -> lưu nháp, tải lại -> nộp -> reviewer xem và đánh giá cả
  6 tiêu chí -> kết luận -> in báo cáo; xác nhận hồ sơ tập thể cũ vẫn C.
  Thử không upload / sai mã T cho hồ sơ cá nhân / xóa T-file / cố đưa
  minh chứng C vào hồ sơ T để xác minh DB và API từ chối.

Chưa thử SQL trên Supabase hoạt động hay E2E thật nếu không có môi trường
staging an toàn; kiểm thử TypeScript/Unit/UI không thay thế nghiệm thu đó.
