import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getApplication } from "@/lib/application-query";
import { criterionCategory } from "@/lib/criterion-evidence";
import { getApplicationCriterionCodes, getCriterionDisplayCode } from "@/lib/award-criteria-scope";
import { PrintReportButton } from "@/components/print-report-button";
import type { ApplicationCriterion } from "@/lib/types";
import "./report-print.css";

const decisions: Record<string, string> = {
  passed: "ĐẠT ĐIỀU KIỆN ĐỀ XUẤT KHEN THƯỞNG",
  failed: "KHÔNG ĐẠT ĐIỀU KIỆN",
  revision: "YÊU CẦU BỔ SUNG HỒ SƠ",
};
const statusText: Record<string, string> = {
  verified: "Đạt", rejected: "Không đạt", pending: "Chưa đánh giá", not_applicable: "Không áp dụng",
};

function asCriterionList(snapshot: unknown): ApplicationCriterion[] {
  if (!Array.isArray(snapshot)) return [];
  return snapshot.filter((item): item is ApplicationCriterion =>
    Boolean(item) && typeof item === "object" &&
    typeof item.code === "string" && typeof item.status === "string" &&
    typeof item.title === "string");
}

export default async function AssessmentReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const app = await getApplication(supabase, id);
  if (!app || !["passed", "failed", "revision"].includes(app.status) || !app.decided_at) notFound();

  // Preserve the status/review-note snapshot at the time of the decision.
  const { data: history } = await supabase.from("review_history")
    .select("decision,comment,criteria_snapshot,created_at")
    .eq("application_id", app.id).order("created_at", { ascending: false }).limit(30);
  const lastDecision = (history || []).find(row => row.decision === app.status) || null;
  const snapshot = asCriterionList(lastDecision?.criteria_snapshot);
  const snapshotCriteria = snapshot.length ? snapshot : app.criteria || [];
  const allowedCodes = getApplicationCriterionCodes(app.application_type, snapshotCriteria.map(item => item.code));
  const criteria = snapshotCriteria.filter(item => allowedCodes.includes(item.code));
  const printedAt = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const decidedAt = new Date(app.decided_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const unit = app.collective_type === "club" ? app.club_name || "Câu lạc bộ" : app.branch_code || "—";

  return <div className="assessment-report">
    <div className="assessment-toolbar report-hide-print">
      <Link href={`/applications/${app.id}`} className="btn btn-outline">← Trở về hồ sơ</Link>
      <PrintReportButton />
    </div>
    <article className="assessment-sheet">
      <header className="assessment-letterhead">
        <div><b>KHOA CÔNG NGHỆ THÔNG TIN</b><span>HỘI ĐỒNG XÉT KHEN THƯỞNG</span></div>
        <div><b>PHIẾU THẨM ĐỊNH</b><span>Mã hồ sơ: {app.code}</span></div>
      </header>
      <div className="assessment-heading">
        <h1>PHIẾU TỔNG HỢP KẾT QUẢ XÉT HỒ SƠ KHEN THƯỞNG</h1>
        <p>Đợt xét: {app.period_name} · Lập phiếu: {printedAt}</p>
      </div>

      <section>
        <h2>I. Thông tin hồ sơ</h2>
        <dl className="assessment-facts">
          <div><dt>Đối tượng</dt><dd>{app.subject_name}</dd></div>
          <div><dt>Loại hồ sơ</dt><dd>{app.application_type === "individual" ? "Cá nhân" : "Tập thể"}</dd></div>
          <div><dt>MSSV</dt><dd>{app.student_id || "—"}</dd></div>
          <div><dt>Đơn vị</dt><dd>{unit}</dd></div>
          <div><dt>Mã hồ sơ</dt><dd>{app.code}</dd></div>
          <div><dt>Thời gian kết luận</dt><dd>{decidedAt}</dd></div>
        </dl>
      </section>

      <section>
        <h2>II. Kết quả xét minh chứng</h2>
        <table className="assessment-table">
          <thead><tr><th>Mã</th><th>Nội dung tiêu chí</th><th>Minh chứng đã nộp</th><th>Kết quả</th><th>Nhận xét hội đồng</th></tr></thead>
          <tbody>{criteria.map(item => {
            const files = (app.evidences || []).filter(file => file.category === criterionCategory(item.code));
            return <tr key={item.code}>
              <td>{getCriterionDisplayCode(app.application_type, item.code, item.title)}</td>
              <td>{item.title}</td>
              <td>{files.length ? files.map(file => <div key={file.id}>
                <a href={`/api/evidence/${file.id}`} target="_blank" rel="noopener noreferrer">{file.file_name}</a>
              </div>) : "Chưa có minh chứng theo tiêu chí"}</td>
              <td><strong>{statusText[item.status] || "Chưa đánh giá"}</strong></td>
              <td>{item.reviewer_note || "—"}</td>
            </tr>;
          })}</tbody>
        </table>
        <p className="assessment-footnote">Kết quả từng tiêu chí chỉ được xét Đạt hoặc Không đạt từ minh chứng. Không áp dụng thang điểm, trọng số hoặc ngưỡng phần trăm.</p>
      </section>

      <section>
        <h2>III. Kết luận của hội đồng</h2>
        <div className="assessment-decision">
          <b>{decisions[app.status] || app.status}</b>
          <p><strong>Nhận xét:</strong> {lastDecision?.comment || app.review_comment || "Không có nhận xét bổ sung."}</p>
        </div>
      </section>

      <footer className="assessment-signature">
        <p>Phiếu được kết xuất từ hệ thống tại {printedAt}. Đối chiếu lịch sử kết luận với hồ sơ trên hệ thống.</p>
        <div><strong>ĐẠI DIỆN HỘI ĐỒNG</strong><span>(Ký, ghi rõ họ tên khi xác nhận bản giấy)</span></div>
      </footer>
      <p className="assessment-disclaimer">Phiếu tổng hợp kết quả thẩm định, không thay thế quyết định khen thưởng chính thức của đơn vị có thẩm quyền.</p>
    </article>
  </div>;
}
