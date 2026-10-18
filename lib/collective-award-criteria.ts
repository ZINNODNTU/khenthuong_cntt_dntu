import type { AwardCriterionDefinition } from "@/lib/award-criteria";

/**
 * Khung ĐỀ XUẤT cho tập thể Chi đoàn/CLB.
 * T1–T6 là mã lưu trữ riêng cho hồ sơ tập thể mới sau migration 08.
 * Hồ sơ tập thể lịch sử vẫn giữ nguyên C-code để bảo toàn minh chứng và kết quả.
 * Không phải quy định đã được Nhà trường chính thức phê duyệt.
 */
export const COLLECTIVE_AWARD_CRITERIA: readonly AwardCriterionDefinition[] = [
  {
    code: "C1",
    title: "Kết quả thực hiện kế hoạch và nhiệm vụ của tập thể trong năm học",
    shortTitle: "Hoàn thành kế hoạch và nhiệm vụ",
    description: "Đánh giá Chi đoàn hoặc CLB theo nhiệm vụ và kế hoạch đã đăng ký; xét mức độ hoàn thành, sản phẩm và kết quả được đơn vị phụ trách xác nhận. Không lấy thành tích riêng của một thành viên thay cho thành tích của tập thể.",
    reviewChecks: [
      "Có kế hoạch/chương trình hoạt động hoặc nhiệm vụ được giao trong năm học xét.",
      "Có kết quả thực hiện, sản phẩm hoặc số liệu rõ ràng; nêu việc chưa hoàn thành nếu có.",
      "Có xác nhận, nhận xét hoặc báo cáo gửi đơn vị quản lý.",
    ],
    evidence: ["Kế hoạch công tác được duyệt", "Báo cáo tổng kết hoặc biên bản đánh giá", "Xác nhận hoàn thành nhiệm vụ của Khoa/Đoàn – Hội/đơn vị phụ trách"],
    category: "multiple",
  },
  {
    code: "C2",
    title: "Năng lực tổ chức, phối hợp và triển khai các chương trình, hoạt động",
    shortTitle: "Tổ chức và phối hợp hoạt động",
    description: "Xem xét trách nhiệm của tập thể trong việc chủ trì hoặc phối hợp tổ chức; ưu tiên hoạt động có phân công, triển khai, tổng kết và kết quả kiểm chứng được.",
    reviewChecks: [
      "Xác định tập thể chủ trì, đồng tổ chức hay phối hợp, không chỉ tham gia.",
      "Đối chiếu quy mô, số lần triển khai và sản phẩm/kết quả hoạt động.",
      "Đánh giá việc tuân thủ tiến độ, trách nhiệm, phối hợp với các đơn vị.",
    ],
    evidence: ["Kế hoạch và thư mời/phân công phối hợp", "Biên bản tổ chức, chương trình và danh sách tham gia", "Báo cáo tổng kết, xác nhận của đơn vị phối hợp"],
    category: "multiple",
  },
  {
    code: "C3",
    title: "Mức độ tham gia và khả năng huy động đoàn viên, hội viên, thành viên",
    shortTitle: "Huy động và gắn kết thành viên",
    description: "Đánh giá khả năng duy trì hoạt động thường xuyên và sự tham gia thực chất của các thành viên; không chỉ tính tổng số người hoặc số lượng lượt điểm danh.",
    reviewChecks: [
      "Nêu số thành viên, tỷ lệ hoặc mức độ tham gia theo từng hoạt động khi có nguồn xác nhận.",
      "Có phân công nhiệm vụ và kết quả tham gia thực tế của thành viên.",
      "Thể hiện tính liên tục, gắn kết và tinh thần chủ động của tập thể.",
    ],
    evidence: ["Danh sách thành viên và bảng tham gia hoạt động", "Biên bản sinh hoạt, phân công, điểm danh", "Báo cáo tỷ lệ tham gia và kết quả hoạt động"],
    category: "multiple",
  },
  {
    code: "C4",
    title: "Đóng góp của tập thể cho phong trào thanh niên, tình nguyện và cộng đồng",
    shortTitle: "Đóng góp cho phong trào và cộng đồng",
    description: "Ghi nhận hoạt động vì cộng đồng, hỗ trợ sinh viên và phong trào do tập thể thực hiện hoặc phối hợp thực hiện; cần chứng minh kết quả và đối tượng hưởng lợi.",
    reviewChecks: [
      "Hoạt động thuộc năm học xét, đúng phạm vi nhiệm vụ và đối tượng.",
      "Có bằng chứng phần việc của tập thể, kết quả thực hiện và tác động thực tế.",
      "Phân biệt hoạt động độc lập của tập thể với việc một vài thành viên tham gia cá nhân.",
    ],
    evidence: ["Kế hoạch, biên bản hoặc giấy xác nhận hoạt động tình nguyện", "Báo cáo số người tham gia, kết quả và đối tượng thụ hưởng", "Hình ảnh có bối cảnh, ngày và đơn vị xác nhận"],
    category: "multiple",
  },
  {
    code: "C5",
    title: "Kết quả hoạt động, thành tích hoặc đóng góp được đơn vị có thẩm quyền ghi nhận",
    shortTitle: "Kết quả và thành tích được ghi nhận",
    description: "Đánh giá kết quả hoạt động được xác nhận chính thức. Giấy khen, giải thưởng là minh chứng mạnh nhưng không bắt buộc phải có giải thưởng nếu tập thể có kết quả đã được đơn vị quản lý xác nhận.",
    reviewChecks: [
      "Thành tích/kết quả đứng tên hoặc gắn trực tiếp với tập thể, không chỉ cá nhân.",
      "Có văn bản xác nhận kết quả, công nhận hoặc báo cáo được phê duyệt.",
      "Không ghi nhận trùng một kết quả; đối chiếu thời gian và đơn vị xác nhận.",
    ],
    evidence: ["Giấy khen, chứng nhận hoặc quyết định công nhận tập thể (nếu có)", "Văn bản nhận xét, xác nhận kết quả từ đơn vị quản lý", "Báo cáo thành tích có chữ ký hoặc xác nhận hợp lệ"],
    category: "multiple",
  },
  {
    code: "C6",
    title: "Cải tiến phương thức hoạt động, duy trì mô hình hiệu quả và tạo sức lan tỏa",
    shortTitle: "Cải tiến, hiệu quả và sức lan tỏa",
    description: "Đánh giá cách làm, giải pháp hoặc mô hình đã triển khai giúp tập thể hoạt động hiệu quả hơn và có tác động tích cực; không yêu cầu mọi tập thể phải có đề tài nghiên cứu hay giải thưởng sáng kiến.",
    reviewChecks: [
      "Nêu cách làm hoặc cải tiến cụ thể đã áp dụng, không chỉ trình bày ý tưởng.",
      "Có kết quả hoặc thay đổi thực tế so với trước, được tài liệu hỗ trợ.",
      "Thể hiện khả năng duy trì, áp dụng lại hoặc lan tỏa tới thành viên/cộng đồng.",
    ],
    evidence: ["Thuyết minh mô hình hoặc biên bản sinh hoạt triển khai", "Báo cáo hiệu quả, sản phẩm và kết quả thực tế", "Minh chứng tiếp tục áp dụng, phối hợp, phản hồi hoặc nhân rộng"],
    category: "multiple",
  },
];
