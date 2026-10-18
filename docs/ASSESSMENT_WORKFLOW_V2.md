# Nghiệp vụ chấm hồ sơ xét khen thưởng — Phiên bản 2

## Nguyên tắc

Dự án thực hiện **xét đủ điều kiện và thẩm định thủ công theo 9 tiêu chí C1–C9**. Không tự tính điểm, hệ số, xếp hạng hoặc tự đề xuất khen thưởng khi hội đồng chưa ban hành thang chấm chính thức. Mọi tiêu chí có kết luận Đạt / Không đạt / Không áp dụng / Chờ chấm và ghi chú riêng. C7–C9 của cá nhân là điều kiện bắt buộc.

Hệ thống là nơi **thẩm định**, không phát hành quyết định khen thưởng chính thức. Phiếu in chỉ là biên bản kết quả trên phần mềm.

## Quy trình thực tế

1. **Admin** quản lý kỳ xét, các đơn vị/tài khoản và theo dõi hàng đợi; **submitter** điền thông tin, tải minh chứng, gửi hồ sơ trong kỳ mở.
2. Hồ sơ xuất hiện ở `/review`. Reviewer dùng bộ lọc theo đợt xét, trạng thái phân công, tên đối tượng; 25 hồ sơ/trang.
3. Reviewer mở `/review/[id]`, nhấn **Nhận hồ sơ để chấm**. Hệ thống khóa quyền thẩm định cho cán bộ phụ trách. Admin có thể tiếp nhận lại khi cần; thao tác được lưu audit.
4. Reviewer đối chiếu minh chứng tại phần nội dung hồ sơ; tại phiếu bên phải chọn Đạt / Không đạt / Không áp dụng, ghi rõ căn cứ cho kết quả Không đạt và Không áp dụng. C7–C9 của cá nhân không được chọn Không áp dụng.
5. Chỉ khi **đủ 9 tiêu chí** và điều kiện C7 (Tốt/Xuất sắc), C8 (GPA ≥2,80), C9 (không kỷ luật từ khiển trách trở lên) được xác minh thì nút **Kết luận ĐẠT** mới khả dụng. Có thể kết luận Không đạt hoặc Yêu cầu bổ sung với nhận xét tối thiểu 5 ký tự.
6. Một transaction trong PostgreSQL khóa bản ghi hồ sơ, kiểm tra quyền phân công, tính đầy đủ và điều kiện bắt buộc, lưu trạng thái hồ sơ, **bản chụp phiếu chấm** trong `review_history` và bản ghi nhật ký. Khi lỗi bất kỳ, transaction rollback toàn bộ.
7. Người nộp theo dõi kết quả trong `/results`, xem lý do yêu cầu bổ sung và cập nhật hồ sơ. Sau khi nộp lại, các đánh giá trước chuyển về Chờ chấm; lịch sử các kết luận vẫn còn.
8. Người có quyền đọc hồ sơ có thể chọn **In phiếu kết quả** tại trang chi tiết (chỉ với hồ sơ đã có kết luận). Admin tải báo cáo CSV từ `/results`; có phân quyền và xử lý formula injection trong CSV.

## Database

Các file thực thi theo thứ tự:

- Cài đặt mới trên DB trống: `00_RESET_DATABASE.sql` (CHỈ khi cố tình hủy môi trường phát triển không có dữ liệu), `01_SETUP_DATABASE.sql`, `02_CRITERIA_9.sql`, `03_REVIEW_WORKFLOW.sql`.
- DB hiện có: backup, kiểm tra `01` đã khớp, chạy **02 nếu chưa áp dụng**, sau đó **03**, trên staging trước rồi mới cân nhắc production. **Không chạy RESET trên staging/production có dữ liệu.**

`03_REVIEW_WORKFLOW.sql` bổ sung: phân công hồ sơ, bảo vệ snapshot tiêu chí, lịch sử chấm theo tiêu chí, ảnh chụp kết luận, khóa giao dịch, từ chối cập nhật reviewer/trạng thái trực tiếp ngoài RPC. Các hàm có kiểm tra trạng thái tài khoản và quyền thẩm định. Trong lược đồ mới, việc chấm điểm/cập nhật chỉ chạy qua RPC được cấp phép.

Lưu ý: migration bảo toàn kết luận cũ; **không dựng lại phiếu chấm lịch sử** đã chốt trước đó. Kết quả cũ có thể chưa có `criteria_snapshot`.

## Bài kiểm thử và kiểm tra

```powershell
pnpm check
pnpm build
pnpm exec playwright test tests/review-access.spec.ts
pnpm exec playwright test tests/ui-audit.spec.ts
pnpm audit --audit-level=low
```

Các bài kiểm thử code, unit, UI khách chưa đăng nhập và build **không thay thế** kiểm thử database thật. Cần kịch bản staging có tài khoản submitter/reviewer/admin.

## Điều kiện nghiệm thu thực tế (bắt buộc)

- [ ] Backup trước migration; chạy 02 và 03 trên staging; kiểm tra rollback.
- [ ] Với tài khoản **submitter**, thử insert/update trực tiếp `application_criteria`, insert giả `review_history`, update reviewer_id hoặc review_comment: tất cả phải bị chặn.
- [ ] Với reviewer A và B, thử claim đồng thời một hồ sơ; chỉ một người nhận được. Người còn lại không thể chấm hoặc kết luận. Admin takeover có nhật ký.
- [ ] Thử direct REST UPDATE applications sang ĐẠT/Không đạt; reviewer không đi qua RPC phải bị chặn.
- [ ] Thử C7=Khá, C8=2.79 và C9 có kỷ luật: không thể duyệt ĐẠT qua API **lẫn qua RPC trực tiếp**. Thử C8=2.80: có thể xác minh.
- [ ] Kết luận Đạt / Không đạt / Yêu cầu bổ sung ghi đủ `review_history`, `criteria_snapshot` và `audit_logs` hoặc rollback đồng bộ nếu xảy ra lỗi.
- [ ] Nộp bổ sung → nộp lại → xác minh cũ được đặt lại và không tự giữ trạng thái Đạt.
- [ ] Kiểm tra in phiếu, tải CSV bằng admin; reviewer/submitter không được xuất CSV tổng hợp. Excel không thực thi công thức nhập trong nhận xét.
- [ ] Test minh chứng được lưu/đọc, log lỗi, đồng thời, thao tác trên mobile và khôi phục backup.
- [ ] Chạy trên **Node 22.x** đúng yêu cầu package; môi trường hiện tại từng dùng Node 24.x.
- [ ] Xác minh quyền sở hữu MSSV bằng phương thức thực tế (email trường/đối chiếu dữ liệu), chống lạm dụng API với shared rate limiter trước khi mở đăng ký đại trà.

## Chưa bao gồm

- Chưa ban hành thang **điểm số/hệ số/xếp hạng** từ đơn vị chủ quản; không tự tạo con số không có thẩm quyền.
- Chưa có chữ ký số, xuất quyết định có pháp lý, hội đồng biểu quyết nhiều vòng, hay kiểm tra gian lận minh chứng tự động.
- Chưa vận hành migration hoặc kiểm thử quyền RLS trên Supabase production.
