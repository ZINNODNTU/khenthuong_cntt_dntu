# Bộ khung 9 tiêu chí xét khen thưởng công tác Đoàn – Hội và phong trào sinh viên

> **Bản khung nghiệp vụ để Khoa/Hội đồng xem xét phê duyệt, không phải quy định chính thức của DNTU.** Nội dung thống nhất với `lib/award-criteria.ts` và màn hình `/criteria`. Ngày 08/10/2026.

## I. Nguyên tắc chung

- Đối tượng: hồ sơ cá nhân; hồ sơ tập thể Chi đoàn/CLB có thể được đánh giá ở C1–C6 theo biểu điểm tập thể riêng. C7–C9 là điều kiện bắt buộc **cho cá nhân** theo nghiệp vụ hiện tại; nếu áp dụng cho tập thể cần văn bản quy định riêng.
- **C1–C6: chấm điểm thực tế theo minh chứng.** Hội đồng phê duyệt điểm tối đa từng tiêu chí (`w1…w6 > 0`, tổng 100), và ngưỡng tỷ lệ đạt cho từng đợt xét/loại hồ sơ. Không có phân bổ điểm mặc định được coi là chính sách của trường.
- **C7–C9: điều kiện đủ/không đủ**, không cho điểm trong tổng 100; phải được cán bộ xác minh ĐẠT trước khi kết luận hồ sơ cá nhân đạt.
- Dữ liệu kê khai không tự động được coi là minh chứng hợp lệ. Cán bộ phải đối chiếu nguồn, chủ thể, thời điểm, đơn vị xác nhận và tránh tính lặp.
- Minh chứng phải nằm trong khoảng thời gian hợp lệ đã cấu hình cho đợt xét. Ngày tổ chức, ngày cấp chứng nhận, và ngày cập nhật hồ sơ là các khái niệm khác nhau.
- Điểm rèn luyện/GPA phải là kết quả chính thức; với C9 phải đối chiếu xác nhận của đơn vị quản lý, không dựa hoàn toàn vào tự khai.
- Mức GPA **2,80/4,00 hiện đã được ứng dụng dùng làm ngưỡng chặn** cho hồ sơ cá nhân. Vì người đề xuất gọi đây là *mức đề xuất*, hội đồng cần quyết định giữ hoặc điều chỉnh trước khi triển khai chính thức; thay đổi không chỉ là sửa chữ, còn phải cập nhật quy tắc kiểm tra trong ứng dụng và PostgreSQL.

## II. Nội dung đánh giá và chứng cứ

| Mã | Tiêu chí | Tiêu điểm khi thẩm định | Minh chứng tham khảo |
|---|---|---|---|
| **C1** | Đóng góp nổi bật cho công tác Đoàn – Hội và phong trào thanh niên trong năm học | Phần việc thực hiện; phạm vi và kết quả; tác động đến phong trào | Báo cáo thành tích có xác nhận, kế hoạch/tổng kết, minh chứng kết quả |
| **C2** | Vai trò trực tiếp trong tổ chức, điều phối hoặc phụ trách hoạt động cấp Khoa, cấp Trường hoặc cao hơn | Vai trò được giao; trách nhiệm điều phối; quy mô và hiệu quả chương trình | Quyết định/thư phân công, kế hoạch, danh sách BTC, biên bản/tổng kết |
| **C3** | Thành tích cụ thể được ghi nhận | Giải thưởng, giấy khen, chứng nhận; đơn vị công nhận; tính hợp lệ, không tính lặp | Giấy khen/bằng khen/chứng nhận, quyết định và kết quả chính thức |
| **C4** | Tham gia thường xuyên, tích cực các hoạt động Đoàn – Hội, tình nguyện, cộng đồng, phong trào sinh viên | Mức độ đều đặn; sự tham gia thực chất; kết quả phần việc | Danh sách/xác nhận tham gia, hình ảnh, báo cáo hoạt động |
| **C5** | Vai trò cán bộ Đoàn – Hội, CLB/đội/nhóm và kết quả hoàn thành nhiệm vụ | Chức danh/nhiệm kỳ, phần việc đảm nhiệm, hiệu quả, đánh giá của đơn vị | Quyết định hoặc phân công, biên bản nhận xét, tổng kết nhiệm kỳ |
| **C6** | Sáng kiến, mô hình, giải pháp hoặc khả năng tập hợp, lan tỏa sinh viên | Tính mới, áp dụng thực tế, mức độ lan tỏa/nhân rộng | Thuyết minh sáng kiến, số liệu hiệu quả, sản phẩm, xác nhận triển khai |
| **C7** | Kết quả rèn luyện loại **Tốt** trở lên | Chỉ công nhận Tốt hoặc Xuất sắc từ nguồn chính thức đúng năm học | Bảng/phiếu rèn luyện, xác nhận của đơn vị quản lý |
| **C8** | Kết quả học tập đạt yêu cầu; **đề xuất GPA tích lũy ≥ 2,80/4,00** | GPA *tích lũy* thang 4, không nhầm GPA học kỳ, tính chính xác của bảng điểm | Bảng điểm tích lũy từ hệ thống đào tạo, xác nhận kết quả học tập |
| **C9** | Không bị kỷ luật từ khiển trách trở lên trong năm học và không vi phạm quy định/quy chế của Nhà trường | Rà soát hồ sơ kỷ luật và xác nhận không có vi phạm theo quy định áp dụng | Cam kết, xác nhận của đơn vị quản lý, biên bản xử lý nếu có |

## III. Khung chấm điểm C1–C6 (đề xuất cách diễn giải, chưa phê duyệt)

Dùng cùng một cấu trúc đánh giá theo **mức đạt được so với trọng số đã cấu hình**. Reviewer vẫn nhập điểm chi tiết và bắt buộc ghi căn cứ từng tiêu chí:

| Mức độ | Mô tả tham khảo | Tỷ lệ so với điểm tối đa của chính tiêu chí |
|---|---|---|
| Chưa đủ căn cứ | Chưa có minh chứng có thể xác minh | Chưa chấm; yêu cầu bổ sung hoặc xác minh không đạt. Không tự ghi 0 |
| Tối thiểu | Đã xác minh có đóng góp nhưng ở mức cơ bản, ít kết quả nổi bật | Có thể cân nhắc khoảng 0–25% |
| Đáp ứng | Có phần việc và kết quả có thể xác minh, phạm vi phù hợp | Có thể cân nhắc khoảng 26–50% |
| Tích cực | Có vai trò, kết quả và tác động tốt, liên tục | Có thể cân nhắc khoảng 51–75% |
| Nổi bật | Dẫn dắt/đột phá, kết quả rõ rệt, tác động rộng, đủ minh chứng | Có thể cân nhắc khoảng 76–100% |

**Chú ý:** Những khoảng trên chỉ giúp hội đồng thiết kế thang mô tả nếu cần; hiện ứng dụng **không** tự tính điểm theo mức mô tả. Một tiêu chí có thể được xác minh `verified` nhưng vẫn được hội đồng cho 0 điểm *có giải trình* theo quy tắc hiện hành. Muốn đưa ra mức điểm tối thiểu, điểm cộng hay cách xử lý trùng minh chứng, hội đồng phải thống nhất và cấu hình chính thức.

Tỷ lệ điểm = `100 × tổng điểm đã chấm / tổng điểm tối đa của các tiêu chí được xác minh và áp dụng`. Khi một tiêu chí C1–C6 `not_applicable`, trọng số của nó được loại khỏi mẫu số. Không thể kết luận ĐẠT nếu chưa có tiêu chí nào được chấm hợp lệ.

## IV. Quy trình duyệt

1. Admin mở đợt tại `/periods`; phê duyệt và nhập biểu điểm C1–C6 cùng ngưỡng đạt tại `/admin/rubrics` **riêng cho cá nhân và tập thể**.
2. Người nộp đọc `/criteria`, nhập hồ sơ và tải minh chứng; xác thực email `@dntu.edu.vn` và hoàn thiện thông tin cá nhân trước khi nộp (với cá nhân).
3. Reviewer nhận hồ sơ, kiểm tra C1–C9 theo các gợi ý hiển thị ngay trên phiếu chấm; xác minh từng tiêu chí kèm ghi chú. Không tự đánh dấu `verified`.
4. Reviewer chấm số điểm C1–C6 đúng giới hạn và ghi căn cứ. Với C7–C9 của cá nhân: không chấp nhận `not_applicable`.
5. Chỉ cho phép xem xét kết luận **ĐẠT** khi đủ chín tiêu chí đã được giải quyết, chấm đủ điểm C1–C6, đạt ngưỡng điểm và C7–C9 hợp lệ; kết luận cuối cùng vẫn là thao tác có chủ đích của hội đồng.
6. Kết luận, điểm, nhận xét và biểu điểm được lưu trong lịch sử để đối chiếu. Dữ liệu hồ sơ trước đây không tự động bị thay đổi chỉ vì tên/hướng dẫn tiêu chí được cập nhật.

## V. Cần hội đồng thống nhất thêm

- Trọng số `w1..w6` cho từng nhóm hồ sơ và ngưỡng đạt.
- Mức đề xuất **GPA 2,80** có trở thành điều kiện chính thức hay cần điều chỉnh.
- Cách thẩm định C9 khi có vi phạm nhưng chưa có quyết định kỷ luật.
- Quy tắc `Không áp dụng` đối với hồ sơ tập thể và chính sách không tính lặp minh chứng.
- Mẫu giấy xác nhận, thời hạn hiệu lực và vai trò đơn vị cung cấp chứng cứ.
