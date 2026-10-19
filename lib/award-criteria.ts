import type { CriterionCode } from "@/lib/types";

export type AwardCriterionDefinition = {
  code: CriterionCode;
  title: string;
  shortTitle: string;
  description: string;
  reviewChecks: readonly string[];
  evidence: readonly string[];
  category: "multiple" | "single";
  condition?: string;
};

/**
 * Bộ tiêu chí xét khen thưởng cá nhân Đoàn – Hội Khoa CNTT.
 * Mỗi tiêu chí được đánh giá ĐẠT / KHÔNG ĐẠT dựa trên minh chứng có thể đối chiếu;
 * không tự đặt điểm số, số hoạt động tối thiểu hoặc cấp giải bắt buộc.
 * C1–C6: nhiều mục thành tích và nhiều tệp mỗi mục.
 * C7–C8: mỗi tiêu chí một tệp; C9: tích cam kết điện tử, không yêu cầu tệp.
 * Ngưỡng GPA 2,80/4,00 là đề xuất, cần hội đồng phê duyệt.
 */
export const AWARD_CRITERIA: readonly AwardCriterionDefinition[] = [
  {
    code: "C1",
    title: "Đóng góp nổi bật của cá nhân cho công tác Đoàn – Hội và phong trào thanh niên trong năm học",
    shortTitle: "Đóng góp nổi bật",
    description: "Kê khai từng hoạt động hoặc nhiệm vụ mà bản thân trực tiếp đóng góp trong năm học xét. Ưu tiên sản phẩm, phần việc đã hoàn thành và tác động thực tế; không coi việc có tên trong danh sách là đủ.",
    reviewChecks: [
      "Ghi tên hoạt động, thời gian, đơn vị tổ chức và nhiệm vụ cá nhân trực tiếp thực hiện.",
      "Nêu sản phẩm/kết quả cụ thể: khối lượng công việc, đối tượng hưởng lợi, hiệu quả hoặc ghi nhận của đơn vị.",
      "Hội đồng đối chiếu vai trò cá nhân với tài liệu có nguồn xác nhận; không dùng thành tích chung thay cho đóng góp riêng.",
    ],
    evidence: ["Phân công nhiệm vụ hoặc xác nhận của Bí thư/ban tổ chức", "Báo cáo kết quả, biên bản tổng kết có ghi nhận vai trò cá nhân", "Sản phẩm, hình ảnh hoạt động kèm thông tin xác thực"],
    category: "multiple",
  },
  {
    code: "C2",
    title: "Vai trò trực tiếp tổ chức, điều phối hoặc phụ trách hoạt động cấp Khoa, cấp Trường hoặc cao hơn",
    shortTitle: "Tổ chức và điều phối hoạt động",
    description: "Kê khai từng hoạt động mà cá nhân tham gia ban tổ chức, điều phối hoặc phụ trách một phần việc; phân biệt trách nhiệm tổ chức với tham dự thông thường.",
    reviewChecks: [
      "Ghi rõ cấp tổ chức, tên chương trình, thời điểm và vị trí trong ban tổ chức.",
      "Mô tả đầu việc chịu trách nhiệm: xây dựng kế hoạch, điều phối nhân sự, hậu cần, truyền thông hoặc triển khai.",
      "Đối chiếu nhiệm vụ được phân công và kết quả hoàn thành từ tài liệu do đơn vị tổ chức xác nhận.",
    ],
    evidence: ["Quyết định hoặc danh sách ban tổ chức, văn bản phân công", "Kế hoạch, kịch bản, bảng phân nhiệm có tên cá nhân", "Xác nhận hoàn thành, biên bản tổng kết hoặc hình ảnh triển khai"],
    category: "multiple",
  },
  {
    code: "C3",
    title: "Giải thưởng, giấy khen, chứng nhận hoặc thành tích cá nhân được công nhận trong năm học",
    shortTitle: "Thành tích và khen thưởng",
    description: "Kê khai từng danh hiệu, giải thưởng, giấy khen hoặc chứng nhận liên quan công tác Đoàn – Hội, tình nguyện và phong trào sinh viên; ghi rõ thời gian và cơ quan công nhận.",
    reviewChecks: [
      "Ghi tên thành tích, cấp tổ chức/công nhận, ngày cấp và đơn vị cấp.",
      "Kiểm tra giấy tờ có tên người được xét; nếu là giải tập thể cần chứng minh đóng góp của cá nhân.",
      "Đối chiếu số quyết định, đường dẫn công bố hoặc danh sách chính thức (nếu có), không ghi trùng một thành tích.",
    ],
    evidence: ["Giấy khen, bằng khen hoặc giấy chứng nhận có tên cá nhân", "Quyết định công nhận, thông báo trao giải, kết quả cuộc thi", "Danh sách được công bố chính thức hoặc xác nhận của đơn vị cấp"],
    category: "multiple",
  },
  {
    code: "C4",
    title: "Tham gia thường xuyên, tích cực hoạt động Đoàn – Hội, tình nguyện, cộng đồng và phong trào sinh viên",
    shortTitle: "Tham gia hoạt động phong trào",
    description: "Liệt kê các hoạt động cá nhân trực tiếp tham gia trong năm học: tên, ngày, đơn vị tổ chức, vai trò và phần việc; không đặt số lượt tham gia tối thiểu khi chưa có quy định được duyệt.",
    reviewChecks: [
      "Ghi danh sách từng hoạt động theo trình tự thời gian và chỉ rõ vai trò thực tế.",
      "Đối chiếu việc tham gia và phần việc đã hoàn thành bằng điểm danh, xác nhận hoặc tài liệu sự kiện.",
      "Hội đồng xem tính đều đặn, tinh thần chủ động và chất lượng đóng góp, không chỉ đếm lượt có mặt.",
    ],
    evidence: ["Giấy xác nhận tham gia, giấy chứng nhận tình nguyện", "Danh sách điểm danh hoặc phân công có tên cá nhân", "Ảnh hoạt động kèm thời gian và xác nhận của đơn vị tổ chức"],
    category: "multiple",
  },
  {
    code: "C5",
    title: "Thực hiện nhiệm vụ cán bộ Đoàn – Hội, câu lạc bộ, đội hoặc nhóm và kết quả hoàn thành",
    shortTitle: "Trách nhiệm cán bộ, đội nhóm",
    description: "Kê khai chức vụ chính thức hoặc nhiệm vụ phụ trách được đơn vị giao trong năm học, nêu phạm vi trách nhiệm, thời gian đảm nhiệm và kết quả đánh giá.",
    reviewChecks: [
      "Ghi tổ chức, chức danh/vai trò phụ trách, nhiệm kỳ hoặc khoảng thời gian đảm nhiệm.",
      "Nêu công việc định kỳ và kết quả hoàn thành, không trùng nội dung điều phối sự kiện đã kê ở C2.",
      "Đối chiếu quyết định phân công hoặc nhận xét/xác nhận của người phụ trách tổ chức.",
    ],
    evidence: ["Quyết định công nhận, bầu cử, bổ nhiệm hoặc phân công nhiệm vụ", "Nhận xét, đánh giá mức hoàn thành công tác của tổ chức", "Báo cáo công việc hoặc kết quả phụ trách có xác nhận"],
    category: "multiple",
  },
  {
    code: "C6",
    title: "Sáng kiến, mô hình, giải pháp hoặc hoạt động tập hợp, lan tỏa sinh viên do cá nhân thực hiện",
    shortTitle: "Sáng kiến và khả năng lan tỏa",
    description: "Nêu sáng kiến/giải pháp có triển khai thực tế, vai trò của bản thân và kết quả có thể kiểm chứng; chỉ ý tưởng chưa thực hiện cần làm rõ trạng thái và xác nhận.",
    reviewChecks: [
      "Mô tả vấn đề, nội dung sáng kiến/mô hình, điểm mới và vai trò cá nhân xây dựng/triển khai.",
      "Nêu thời gian, phạm vi triển khai, kết quả đo được hoặc phản hồi của người tham gia.",
      "Hội đồng xác minh sản phẩm, kết quả áp dụng, mức lan tỏa từ tài liệu của đơn vị phụ trách.",
    ],
    evidence: ["Bản thuyết minh, kế hoạch hoặc sản phẩm sáng kiến", "Biên bản triển khai, xác nhận nghiệm thu/áp dụng", "Báo cáo kết quả, số liệu tham gia, tài liệu truyền thông có thể kiểm chứng"],
    category: "multiple",
  },
  {
    code: "C7",
    title: "Kết quả rèn luyện năm học đạt loại Tốt trở lên",
    shortTitle: "Điều kiện rèn luyện",
    description: "Tải đúng một tệp thể hiện kết quả rèn luyện chính thức trong năm học xét. Kết quả đủ điều kiện là Tốt hoặc Xuất sắc; không thay bằng tự kê khai.",
    reviewChecks: ["Đối chiếu họ tên/MSSV, năm học và nguồn công bố của Nhà trường.", "Chỉ đánh dấu Đạt khi xếp loại rèn luyện Tốt hoặc Xuất sắc."],
    evidence: ["Ảnh/PDF kết quả rèn luyện từ cổng sinh viên thể hiện đầy đủ MSSV, năm học và xếp loại", "Giấy xác nhận kết quả rèn luyện do đơn vị quản lý sinh viên cấp"],
    category: "single",
    condition: "Cá nhân: Rèn luyện Tốt hoặc Xuất sắc; 01 tệp minh chứng chính thức.",
  },
  {
    code: "C8",
    title: "Kết quả học tập đáp ứng yêu cầu; đề xuất điểm trung bình tích lũy từ 2,80/4,00 trở lên",
    shortTitle: "Điều kiện học tập",
    description: "Tải đúng một tệp bảng điểm tích lũy thang 4,00. Mức từ 2,80/4,00 là đề xuất cần đơn vị có thẩm quyền phê duyệt, không tự động quy thành điểm xét khen thưởng.",
    reviewChecks: [
      "Xác nhận điểm trung bình tích lũy toàn khóa, không nhầm với điểm học kỳ hoặc điểm thang 10.",
      "Đối chiếu họ tên/MSSV và kết quả từ cổng đào tạo hoặc xác nhận chính thức.",
      "Áp dụng ngưỡng do hội đồng phê duyệt cho đợt xét (mức đề xuất: 2,80/4,00).",
    ],
    evidence: ["PDF/ảnh bảng điểm tích lũy từ cổng đào tạo có MSSV và GPA hệ 4", "Giấy xác nhận điểm tích lũy chính thức do Nhà trường cấp"],
    category: "single",
    condition: "Cá nhân: 01 tệp minh chứng GPA tích lũy hệ 4; 2,80/4,00 là ngưỡng đề xuất.",
  },
  {
    code: "C9",
    title: "Không bị kỷ luật từ mức khiển trách trở lên trong năm học và không vi phạm quy định, quy chế Nhà trường",
    shortTitle: "Điều kiện kỷ luật",
    description: "Sinh viên tích ô cam kết trực tiếp khi gửi hồ sơ, không phải tải tệp. Hội đồng đối chiếu thông tin kỷ luật và vi phạm theo quy định trước khi kết luận.",
    reviewChecks: [
      "Đối chiếu thông tin cá nhân, năm học và tình trạng bị xử lý kỷ luật từ mức khiển trách trở lên.",
      "Kiểm tra thông tin vi phạm quy định, quy chế theo nguồn có thẩm quyền.",
      "Không kết luận Đạt chỉ dựa trên tự cam kết; trường hợp chưa rõ cần yêu cầu bổ sung/xác nhận.",
    ],
    evidence: ["Tích ô cam kết điện tử tại biểu mẫu nộp hồ sơ", "Hội đồng có thể yêu cầu xác minh với đơn vị quản lý khi cần"],
    category: "single",
    condition: "Cá nhân: Bắt buộc tích cam kết không bị kỷ luật từ khiển trách trở lên và không vi phạm quy chế; không cần tải tệp.",
  },
];

export const AWARD_CRITERIA_BY_CODE: Record<CriterionCode, AwardCriterionDefinition> =
  Object.fromEntries(AWARD_CRITERIA.map((criterion) => [criterion.code, criterion])) as Record<CriterionCode, AwardCriterionDefinition>;
