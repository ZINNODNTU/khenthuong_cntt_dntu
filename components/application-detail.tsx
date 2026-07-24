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

export function ApplicationDetail({
  app,
  canReview,
  canSupplement = false,
  canDelete = false,
}: {
  app: Application;
  canReview: boolean;
  canSupplement?: boolean;
  canDelete?: boolean;
}) {
  const faculty = (app.activities || []).filter((a) => a.level === "faculty");
  const university = (app.activities || []).filter((a) => a.level === "university");
  const portrait = (app.evidences || []).filter((e) => e.parent_type === "application" && e.category === "portrait");
  const main = (app.evidences || []).filter((e) => e.parent_type === "application" && e.category !== "portrait");

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
          {canSupplement && (
            <Link href={`/applications/${app.id}/supplement`}>
              <Button variant="outline">
                {app.status === "draft" ? "Tiếp tục hồ sơ" : "Bổ sung hồ sơ"}
              </Button>
            </Link>
          )}
          {canReview && (
            <Link href={`/review/${app.id}`}>
              <Button variant="primary">Mở xét duyệt</Button>
            </Link>
          )}
          {canDelete && <DeleteApplicationButton id={app.id} code={app.code} subjectName={app.subject_name} status={app.status} />}
        </div>
      </div>

      {app.review_comment && (
        <div className={`notice ${app.status === "passed" ? "notice-success" : "notice-error"} mb-4`}>
          <b>Nhận xét hội đồng:</b> {app.review_comment}
        </div>
      )}

      {/* Profile Overview */}
      <section className="card" style={{ padding: 0, marginBottom: "var(--space-4)" }}>
        <div className="detail-grid">
          <div className="detail-sidebar">
            <h3>{app.application_type === "individual" ? "Ảnh chân dung" : "Tập thể"}</h3>
            {app.application_type === "individual" ? (
              <EvidenceGallery items={portrait} compact />
            ) : (
              <div className="card" style={{ padding: "var(--space-6)", textAlign: "center", background: "var(--color-muted)" }}>
                <div className="font-semibold">{app.collective_type === "club" ? "CLB" : "CHI ĐOÀN"}</div>
                <div className="text-sm text-secondary">{unitLabel(app)}</div>
              </div>
            )}
          </div>
          <div className="detail-main">
            <div className="fact-grid">
              <div className="fact-item">
                <div className="fact-item-label">Đợt xét</div>
                <div className="fact-item-value">{app.period_name || "—"}</div>
              </div>
              <div className="fact-item">
                <div className="fact-item-label">Loại hồ sơ</div>
                <div className="fact-item-value">{typeLabel(app)}</div>
              </div>
              <div className="fact-item">
                <div className="fact-item-label">Đối tượng</div>
                <div className="fact-item-value">{app.subject_name}</div>
              </div>
              <div className="fact-item">
                <div className="fact-item-label">Đơn vị</div>
                <div className="fact-item-value">{unitLabel(app)}</div>
              </div>
              <div className="fact-item">
                <div className="fact-item-label">Mã số sinh viên</div>
                <div className="fact-item-value">{app.student_id || "—"}</div>
              </div>
              <div className="fact-item">
                <div className="fact-item-label">Ngày sinh</div>
                <div className="fact-item-value">{formatDate(app.birth_date)}</div>
              </div>
              <div className="fact-item">
                <div className="fact-item-label">Chức vụ</div>
                <div className="fact-item-value">{app.position || "—"}</div>
              </div>
              <div className="fact-item">
                <div className="fact-item-label">Email</div>
                <div className="fact-item-value">{app.email || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="card card-body mb-4">
        <h3 className="font-semibold" style={{ fontSize: "var(--font-size-lg)", marginBottom: "var(--space-2)" }}>Báo cáo thành tích</h3>
        <p style={{ lineHeight: "var(--line-height-relaxed)" }}>{app.achievements}</p>
        {main.length > 0 && (
          <details open style={{ marginTop: "var(--space-3)" }}>
            <summary style={{ cursor: "pointer", color: "var(--color-primary)", fontWeight: "var(--font-weight-medium)", fontSize: "var(--font-size-sm)" }}>
              Ảnh minh chứng · {main.length} ảnh
            </summary>
            <EvidenceGallery items={main} />
          </details>
        )}
      </section>

      {/* Activities */}
      {faculty.length > 0 && (
        <section className="card card-body mb-4">
          <h3 className="font-semibold" style={{ fontSize: "var(--font-size-lg)", marginBottom: "var(--space-3)" }}>Hoạt động cấp khoa</h3>
          {faculty.map((a) => (
            <div className="record" key={a.id}>
              <p style={{ fontSize: "var(--font-size-sm)" }}>{a.organizer || "—"} · {formatDate(a.activity_date)} · {a.role || "—"}</p>
              {a.contribution && <p style={{ fontSize: "var(--font-size-sm)", marginTop: "var(--space-1)" }}>{a.contribution}</p>}
              {(a.evidences || []).length > 0 && (
                <details open style={{ marginTop: "var(--space-2)" }}>
                  <summary style={{ cursor: "pointer", color: "var(--color-primary)", fontWeight: "var(--font-weight-medium)", fontSize: "var(--font-size-sm)" }}>
                    {a.name} · {(a.evidences || []).length} ảnh
                  </summary>
                  <EvidenceGallery items={a.evidences || []} />
                </details>
              )}
            </div>
          ))}
        </section>
      )}

      {university.length > 0 && (
        <section className="card card-body mb-4">
          <h3 className="font-semibold" style={{ fontSize: "var(--font-size-lg)", marginBottom: "var(--space-3)" }}>Hoạt động cấp trường</h3>
          {university.map((a) => (
            <div className="record" key={a.id}>
              <p style={{ fontSize: "var(--font-size-sm)" }}>{a.organizer || "—"} · {formatDate(a.activity_date)} · {a.role || "—"}</p>
              {a.contribution && <p style={{ fontSize: "var(--font-size-sm)", marginTop: "var(--space-1)" }}>{a.contribution}</p>}
              {(a.evidences || []).length > 0 && (
                <details open style={{ marginTop: "var(--space-2)" }}>
                  <summary style={{ cursor: "pointer", color: "var(--color-primary)", fontWeight: "var(--font-weight-medium)", fontSize: "var(--font-size-sm)" }}>
                    {a.name} · {(a.evidences || []).length} ảnh
                  </summary>
                  <EvidenceGallery items={a.evidences || []} />
                </details>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Prior Awards */}
      <section className="card card-body mb-4">
        <h3 className="font-semibold" style={{ fontSize: "var(--font-size-lg)", marginBottom: "var(--space-3)" }}>Thành tích đã được khen thưởng</h3>
        {(app.prior_awards || []).length > 0 ? (
          (app.prior_awards || []).map((a) => (
            <div className="record" key={a.id}>
              <p style={{ fontSize: "var(--font-size-sm)" }}>
                {a.award_type === "certificate" ? "Giấy chứng nhận" : "Bằng khen"} · Số {a.decision_number} · {a.issuer} · {formatDate(a.issued_date)}
              </p>
              <details open style={{ marginTop: "var(--space-2)" }}>
                <summary style={{ cursor: "pointer", color: "var(--color-primary)", fontWeight: "var(--font-weight-medium)", fontSize: "var(--font-size-sm)" }}>
                  {a.title} · {(a.evidences || []).length} ảnh
                </summary>
                <EvidenceGallery items={a.evidences || []} />
              </details>
            </div>
          ))
        ) : (
          <p className="text-sm text-secondary">Chưa kê khai.</p>
        )}
      </section>

      {/* Summary */}
      <section className="card card-body">
        <h3 className="font-semibold" style={{ fontSize: "var(--font-size-lg)", marginBottom: "var(--space-2)" }}>Bản tóm tắt</h3>
        <div className="summary-box">{app.summary || "—"}</div>
      </section>
    </>
  );
}
