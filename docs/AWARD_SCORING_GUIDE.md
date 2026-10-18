# Hướng dẫn vận hành hệ thống chấm hồ sơ xét khen thưởng

Cập nhật 08/10/2026. Hệ thống hỗ trợ **hội đồng chấm điểm thủ công**; không tự thay thế quyết định khen thưởng và không tuyên bố bộ trọng số mẫu là quy định DNTU.

## 1. Cấu trúc đánh giá

- C1–C6: các tiêu chí nội dung được chấm điểm thực tế, từng điểm có nhận xét/căn cứ. Tổng điểm tối đa của biểu điểm là **100**; Admin chọn phân bổ 100 điểm cho sáu tiêu chí (mỗi tiêu chí >0), theo quyết định của đơn vị.
- C7: rèn luyện Tốt hoặc Xuất sắc; C8: GPA tích lũy >= 2,80/4; C9: không bị kỷ luật từ khiển trách trở lên. Với hồ sơ cá nhân, ba tiêu chí này là **điều kiện bắt buộc** và không thể chọn Không áp dụng.
- Điểm 0 vẫn hợp lệ đối với tiêu chí đã được xác minh. Không được chấm nếu tiêu chí còn Chờ/Không đạt/Không áp dụng.
- Với C1–C6 được xác minh Không áp dụng, phần điểm tối đa được loại khỏi mẫu số. Tỷ lệ đạt = Tổng điểm thực nhận / Tổng tối đa của các tiêu chí đã xác minh ĐẠT × 100%.
- Ngưỡng tối thiểu (%) chỉ do quản trị viên nhập sau khi hội đồng phê duyệt. Điểm dưới ngưỡng **không thể kết luận ĐẠT**, nhưng không tự động tạo quyết định Không đạt.
- Điểm và trạng thái xác minh không phải chứng nhận minh chứng thật; Reviewer cần tự đối chiếu hình ảnh/tài liệu.

## 2. Luồng thao tác

1. Admin tạo hoặc chọn một đợt xét tại `/periods`, vào **Biểu điểm xét thưởng** (`/admin/rubrics`) để nhập C1–C6 cho hai nhóm **Cá nhân** và **Tập thể**, ngưỡng điểm và văn bản căn cứ.
2. Người nộp gửi hồ sơ trong thời gian mở đợt, kèm minh chứng. Mỗi đối tượng chỉ có 1 hồ sơ mỗi đợt theo unique constraint.
3. Reviewer mở `/review`, lọc theo tên, đợt, phân công; nhận hồ sơ để xử lý.
4. Mở phiếu chấm, xác minh lần lượt C1–C9 kèm nhận xét. Tiêu chí C1–C6 đã xác minh ĐẠT mới mở ô **Điểm hội đồng**. Nhập số điểm (tối đa theo rubric), lý do >=5 ký tự và **Lưu điểm**.
5. Hệ thống cho xem tổng/tối đa/tỷ lệ và danh sách điểm còn thiếu. Khi đủ 9 trạng thái, đủ điểm và đáp ứng ngưỡng, cán bộ vẫn phải chủ động chọn **Kết luận ĐẠT**. Có thể Không đạt/Yêu cầu bổ sung kèm lý do.
6. Kết luận, điểm chấm, ngưỡng và biểu điểm được lưu trong lịch sử bất biến theo thời điểm quyết định. Xem phiếu in tại `/applications/[id]/report`; Admin tải CSV tổng hợp tại `/results`.
7. Hồ sơ yêu cầu bổ sung được trả lại cho người nộp. Khi nộp lại, xác minh cũ và điểm cũ bị hủy, phải chấm lại.

## 3. Phân quyền và bảo mật

- Admin: cấu hình biểu điểm, nhận/chuyển phụ trách, xác minh, chấm và kết luận.
- Reviewer: chỉ chấm khi đang nhận phụ trách hồ sơ; ghi lịch sử điểm tự động.
- Submitter: chỉ được kê khai, nộp/bổ sung trong trạng thái hợp lệ; **không có quyền nhập điểm hoặc xác minh tiêu chí**. Chỉ xem điểm đã kết luận khi có quyền xem hồ sơ.
- Không trao `INSERT/UPDATE/DELETE` của bảng điểm cho `authenticated`. Mọi thao tác chấm qua `score_award_criterion` RPC với khóa dòng, ràng buộc số điểm và vai trò.
- Sau điểm chấm đầu tiên, biểu điểm của đợt xét và loại hồ sơ bị khóa. Không sửa lén trọng số/thang điểm khi đã có kết quả.

## 4. Triển khai database (bắt buộc trên staging trước)

Các tệp được chạy **đúng thứ tự** trên database mới:
`01_SETUP_DATABASE.sql`, `02_CRITERIA_9.sql`, `03_REVIEW_WORKFLOW.sql`, `04_AWARD_SCORING.sql`.

Nếu database hiện có `01–03`, chỉ bổ sung `04_AWARD_SCORING.sql` sau khi sao lưu đầy đủ, đối chiếu phiên bản schema hiện có và chạy thử staging.

**Không chạy `00_RESET_DATABASE.sql` trên database có dữ liệu thật.** Migration 04 không tự sinh điểm, không tự tạo rubric và không thay đổi kết quả kết luận trước đây. Hồ sơ đã có kết luận cũ vẫn giữ nguyên lịch sử; không được tự xem các điểm cũ là 0.

Kiểm tra SQL/rà soát quyền tại staging bằng ba tài khoản admin/reviewer/submitter và thử tình huống sau:
- Submitter gọi trực tiếp REST / `score_award_criterion` / `configure_award_rubric` phải bị từ chối.
- Reviewer chưa nhận hồ sơ không lưu được điểm.
- C1 còn pending/rejected hoặc điểm vượt trọng số phải bị từ chối; điểm 0 hợp lệ nếu có căn cứ.
- Không có rubric hoặc chưa chấm đủ C1–C6 thì `passed` bị từ chối ngay cả khi cố UPDATE SQL/REST.
- Điểm thấp hơn ngưỡng không thể `passed`; đúng ngưỡng có thể xem xét nếu C7–C9 đạt.
- Không áp dụng một tiêu chí C1–C6 làm giảm mẫu số; không áp dụng toàn bộ không thể `passed`.
- Sau khi đã phát sinh điểm/lịch sử điểm, đổi trọng số bị từ chối. Đổi đánh giá sang pending/không áp dụng hoặc nộp lại hủy điểm cũ.
- Kết luận có `review_history.score_* / rubric_snapshot / criteria_snapshot` đúng phiên bản; kiểm tra báo cáo in và xuất CSV.

## 5. Chạy kiểm tra

```powershell
pnpm check
pnpm build
pnpm exec playwright test tests/ui-audit.spec.ts --reporter=line
pnpm audit --audit-level=low
```

`pnpm check` chỉ kiểm tra cấu trúc file SQL, logic TypeScript, kiểm thử unit; **không chứng minh migration SQL đã được áp dụng và RPC đã chạy thật**. Hai bài test API ẩn danh ở `tests/scoring-access.spec.ts` được tự động *skip* khi môi trường trả 503 vì chưa cấu hình Supabase; chỉ coi là kiểm chứng phân quyền khi thực sự chạy được trên staging và nhận 401. Phải chạy smoke/integration test trên Supabase staging trước production.

## 6. Điều kiện nghiệm thu còn lại

- Hội đồng duyệt văn bản căn cứ biểu điểm và ngưỡng cho từng đợt/loại hồ sơ. Không đưa biểu điểm tự đặt làm chính sách.
- Chạy migration và kiểm thử RLS / RPC với vai trò thật trên staging (có backup).
- Cấu hình Node 22.x trong CI/hosting; xác thực SMTP, kho minh chứng, giới hạn API và quyền sở hữu MSSV trước khi mở đăng ký.
- Kiểm thử tải đồng thời, in phiếu A4 và xuất CSV theo dữ liệu thật; nghiệm thu và phát hành có kế hoạch rollback.
