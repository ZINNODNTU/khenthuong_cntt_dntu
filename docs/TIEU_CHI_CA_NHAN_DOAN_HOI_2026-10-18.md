# Tiêu chí xét khen thưởng CÁ NHÂN Đoàn – Hội Khoa Công nghệ thông tin
Bản cấu hình ngày 18/10/2026. Cần Hội đồng xác nhận trước khi dùng làm quy định chính thức.

## Phạm vi
Chỉ tiếp nhận hồ sơ sinh viên cá nhân, không xét tập thể Chi đoàn/CLB.
Hội đồng đánh giá từng tiêu chí Đạt / Không đạt, không tự đặt thang điểm hoặc số lượt tham gia tối thiểu.
C1–C6: nhiều mục khai báo, nhiều tệp minh chứng mỗi mục. C7–C9: đúng một mục, một tệp/tiêu chí.

## Chín tiêu chí và minh chứng
- **C1 — Đóng góp nổi bật Đoàn – Hội.** Kê tên hoạt động, thời gian, phần việc do cá nhân thực hiện, kết quả có thể kiểm chứng. Tệp: phân công/xác nhận của đơn vị, báo cáo tổng kết, sản phẩm hoặc tư liệu ghi nhận cá nhân.
- **C2 — Trực tiếp tổ chức/điều phối hoạt động cấp Khoa/Trường trở lên.** Kê chương trình, cấp tổ chức, vai trò, đầu việc phụ trách và kết quả. Tệp: quyết định hoặc danh sách BTC, kế hoạch phân công, xác nhận hoàn thành.
- **C3 — Thành tích, giấy khen và giải thưởng.** Kê tên thành tích, cấp công nhận, ngày cấp, đơn vị cấp, quyết định (nếu có). Tệp: giấy chứng nhận, quyết định, danh sách kết quả chính thức có tên cá nhân.
- **C4 — Tham gia tích cực phong trào và tình nguyện.** Kê từng hoạt động, ngày, đơn vị tổ chức, vai trò và kết quả; đánh giá tính đều đặn, không chỉ số lượt. Tệp: xác nhận, điểm danh, chứng nhận hoặc ảnh có thể đối chiếu.
- **C5 — Vai trò cán bộ Đoàn – Hội, CLB, đội/nhóm.** Kê tổ chức, chức vụ/vai trò, thời gian, trách nhiệm và mức độ hoàn thành. Tệp: quyết định phân công, nhận xét cán bộ, báo cáo công việc có xác nhận.
- **C6 — Sáng kiến, mô hình, giải pháp và sức lan tỏa.** Kê vấn đề, giải pháp, vai trò cá nhân, nơi áp dụng và kết quả cụ thể. Tệp: thuyết minh, sản phẩm, xác nhận triển khai, báo cáo hiệu quả.
- **C7 — Rèn luyện từ Tốt trở lên.** Đối chiếu đúng năm học và MSSV; kết quả Tốt hoặc Xuất sắc. Đúng **01 tệp**: kết quả rèn luyện hoặc xác nhận chính thức.
- **C8 — Học tập đạt yêu cầu.** Đối chiếu GPA **tích lũy hệ 4**, không dùng GPA học kỳ. Mức **2,80/4,00 là đề xuất chưa phê duyệt**. Đúng **01 tệp**: bảng điểm tích lũy hoặc xác nhận chính thức.
- **C9 — Không bị kỷ luật từ khiển trách trở lên, không vi phạm quy chế.** Đối chiếu hồ sơ kỷ luật trong năm học; không duyệt chỉ dựa vào cam kết. Đúng **01 tệp**: xác nhận hoặc cam kết kèm xác minh đơn vị.

## Nguyên tắc xét
Mỗi tài liệu cần xác định được cá nhân, thời điểm, nguồn và kết quả thực tế. Tệp đã upload không tự động được tính Đạt.
Nếu thông tin không đủ, Hội đồng yêu cầu bổ sung. Không tự đặt ngưỡng số hoạt động, số giấy khen hoặc điểm chấm.
Bộ tiêu chí này là cấu hình nghiệp vụ dự án, chưa thay thế quyết định của Nhà trường/Hội đồng.

## Triển khai
Website, màn tiêu chí, API tạo hồ sơ, danh sách, quản lý đợt xét đã chuyển sang cá nhân.
Danh mục Chi đoàn/CLB chỉ lưu thông tin phục vụ hồ sơ sinh viên; API và UI đã ngừng cấp tài khoản nộp hồ sơ tập thể. Các bản ghi tổ chức lịch sử không bị xóa.
Migration 20261018190000_individual_award_only.sql chỉ chặn **tạo mới** dữ liệu tập thể, giữ hồ sơ cũ.
Migration chưa được tự động áp dụng Supabase production; cần sao lưu và kiểm chứng staging.

## Nghiệm thu local
- pnpm run check: 67/67 unit tests PASS; kiểm tra TypeScript PASS.
- pnpm run build: PASS.
- Playwright: 14/14 kiểm thử đăng nhập, nhận diện website, responsive, mặc định sáng và xác thực PASS.
- Next.js local: trang /login trả HTTP 200 tại http://localhost:3000.
- Chưa chạy E2E tạo/xét hồ sơ đăng nhập thật vì local đang kết nối Supabase production và chưa có staging an toàn.
- Vẫn cần Hội đồng quyết định tiêu chí bắt buộc/tiêu chí thành tích đặc thù (nhất là C3, C5, C6) và ngưỡng GPA C8 trước khi mở đợt xét.
