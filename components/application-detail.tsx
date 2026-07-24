import Link from "next/link";
import { EvidenceGallery } from "@/components/evidence-gallery";
import { StatusBadge } from "@/components/status-badge";
import type { Application } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DeleteApplicationButton } from "@/components/delete-application-button";

function typeLabel(a: Application) {
  if (a.application_type === "individual") return "Cá nhân";
  return a.collective_type === "club" ? "Tập thể CLB" : "Tập thể Chi đoàn";
}
function unitLabel(a: Application) {
  return a.collective_type === "club" ? a.club_name || "CLB" : a.branch_code || "—";
}

function ActivityTable({ items, title }: { items: Application["activities"]; title: string }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="card card-body mb-4">
      <div className="activity-section-heading"><h4>{title}</h4><span className="activity-section-count">{items.length} hoạt động</span></div>
      <div className="table-wrap table-responsive-card">
        <table className="table activity-table">
          <thead><tr><th>Tổ chức</th><th>Ngày</th><th>Vai trò</th><th>Đóng góp</th><th>Minh chứng</th></tr></thead>
          <tbody>
            {items.map((a: any) => (
              <tr key={a.id}>
                <td data-label="Tổ chức"><span className="activity-cell-label">{a.organizer || "—"}</span></td>
                <td data-label="Ngày" className="text-secondary">{formatDate(a.activity_date)}</td>
                <td data-label="Vai trò" className="text-secondary">{a.role || "—"}</td>
                <td data-label="Đóng góp" className="text-cell-content">{a.contribution || "—"}</td>
                <td data-label="Minh chứng">
                  {(a.evidences || []).length > 0 ? (
                    <details className="activity-evidence-toggle"><summary>{(a.evidences || []).length} ảnh</summary><EvidenceGallery items={a.evidences || []} /></details>
                  ) : <span className="text-secondary">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ApplicationDetail({ app, canReview, canSupplement = false, canDelete = false }: { app: Application; canReview: boolean; canSupplement?: boolean; canDelete?: boolean }) {
  const faculty = (app.activities || []).filter((a) => a.level === "faculty");
  const university = (app.activities || []).filter((a) => a.level === "university");
  const portrait = (app.evidences || []).filter((e) => e.parent_type === "application" && e.category === "portrait");
  const main = (app.evidences || []).filter((e) => e.parent_type === "application" && e.category !== "portrait");
  const awards = app.prior_awards || [];
  const totalActivities = faculty.length + university.length;

  return (
    <>
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-header-eyebrow">{app.period_name}</div>
          <h1>{app.subject_name}</h1>
          <p>{app.code} · {unitLabel(app)} · {typeLabel(app)}</p>
        </div>
        <div className="page-header-actions">
          <StatusBadge status={app.status} />
          {canSupplement && (<Link href={`/applications/${app.id}/supplement`}><Button variant="outline">{app.status === "draft" ? "Tiếp tục hồ sơ" : "Bổ sung hồ sơ"}</Button></Link>)}
          {canReview && (<Link href={`/review/${app.id}`}><Button variant="primary">Mở xét duyệt</Button></Link>)}
          {canDelete && <DeleteApplicationButton id={app.id} code={app.code} subjectName={app.subject_name} status={app.status} />}
        </div>
      </div>

      {app.review_comment && (<div className={"notice mb-4 " + (app.status === "passed" ? "notice-success" : "notice-error")}><b>Nhận xét hội đồng:</b> {app.review_comment}</div>)}

      <section className="card detail-overview-card">
        <div className="detail-grid">
          <div className="detail-sidebar">
            <h3>{app.application_type === "individual" ? "Ảnh chân dung" : "Tập thể"}</h3>
            {app.application_type === "individual" ? (<EvidenceGallery items={portrait} compact />) : (
              <div className="detail-collective-placeholder"><div className="font-semibold">{app.collective_type === "club" ? "CLB" : "CHI ĐOÀN"}</div><div className="text-sm text-secondary">{unitLabel(app)}</div></div>
            )}
          </div>
          <div className="detail-main">
            <div className="fact-grid">
              {[["Đợt xét", app.period_name || "—"], ["Loại hồ sơ", typeLabel(app)], ["Đối tượng", app.subject_name], ["Đơn vị", unitLabel(app)], ["Mã số sinh viên", app.student_id || "—"], ["Ngày sinh", formatDate(app.birth_date)], ["Chức vụ", app.position || "—"], ["Email", app.email || "—"]].map(([label, value]) => (
                <div className="fact-item" key={label as string}><div className="fact-item-label">{label}</div><div className="fact-item-value">{value}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {(totalActivities > 0 || main.length > 0 || awards.length > 0) && (
        <div className="activity-stats-bar">
          {main.length > 0 && <div><b>{main.length}</b><span>Minh chứng</span></div>}
          {totalActivities > 0 && <div><b>{totalActivities}</b><span>Hoạt động</span></div>}
          {awards.length > 0 && <div><b>{awards.length}</b><span>Thành tích</span></div>}
        </div>
      )}

      <section className="card card-body mb-4">
        <div className="activity-section-heading"><h4>Báo cáo thành tích</h4></div>
        <div className="achievement-text">{app.achievements}</div>
        {main.length > 0 && (<details open className="achievement-evidence-detail"><summary className="achievement-evidence-summary">Ảnh minh chứng · {main.length} ảnh</summary><EvidenceGallery items={main} /></details>)}
      </section>

      <ActivityTable items={faculty} title="Hoạt động cấp khoa" />
      <ActivityTable items={university} title="Hoạt động cấp trường" />

      <section className="card card-body mb-4">
        <div className="activity-section-heading"><h4>Thành tích đã được khen thưởng</h4>{awards.length > 0 && <span className="activity-section-count">{awards.length} thành tích</span>}</div>
        {awards.length > 0 ? (
          <div className="table-wrap table-responsive-card">
            <table className="table activity-table">
              <thead><tr><th>Loại</th><th>Số QĐ</th><th>Cơ quan</th><th>Ngày</th><th>Tiêu đề</th><th>Minh chứng</th></tr></thead>
              <tbody>
                {awards.map((a: any) => (
                  <tr key={a.id}>
                    <td data-label="Loại"><span className="activity-cell-label">{a.award_type === "certificate" ? "Giấy chứng nhận" : "Bằng khen"}</span></td>
                    <td data-label="Số QĐ" className="text-secondary">{a.decision_number || "—"}</td>
                    <td data-label="Cơ quan" className="text-cell-content">{a.issuer || "—"}</td>
                    <td data-label="Ngày" className="text-secondary">{formatDate(a.issued_date)}</td>
                    <td data-label="Tiêu đề" className="text-cell-content">{a.title || "—"}</td>
                    <td data-label="Minh chứng">{(a.evidences || []).length > 0 ? (<details className="activity-evidence-toggle"><summary>{(a.evidences || []).length} ảnh</summary><EvidenceGallery items={a.evidences || []} /></details>) : <span className="text-secondary">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (<p className="text-sm text-secondary">Chưa kê khai.</p>)}
      </section>

      <section className="card card-body">
        <div className="activity-section-heading"><h4>Bản tóm tắt</h4></div>
        <div className="summary-box">{app.summary || "—"}</div>
      </section>
    </>
  );
}
