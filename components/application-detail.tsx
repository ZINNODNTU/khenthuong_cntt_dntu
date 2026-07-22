import Link from "next/link";
import { EvidenceGallery } from "@/components/evidence-gallery";
import { StatusBadge } from "@/components/status-badge";
import type { Application } from "@/lib/types";
import { formatDate } from "@/lib/utils";
function typeLabel(a: Application) {
    if (a.application_type === "individual")
        return "Cá nhân";
    return a.collective_type === "club" ? "Tập thể CLB" : "Tập thể Chi đoàn";
}
function unitLabel(a: Application) { return a.collective_type === "club" ? a.club_name || "CLB" : a.branch_code || "—"; }
export function ApplicationDetail({ app, canReview, canSupplement = false }: {
    app: Application;
    canReview: boolean;
    canSupplement?: boolean;
}) { const faculty = (app.activities || []).filter(a => a.level === "faculty"), university = (app.activities || []).filter(a => a.level === "university"), portrait = (app.evidences || []).filter(e => e.parent_type === "application" && e.category === "portrait"), main = (app.evidences || []).filter(e => e.parent_type === "application" && e.category !== "portrait"); return <><div className="page-head"><div><div className="eyebrow">{app.period_name}</div><h1>{app.subject_name}</h1><p>{app.code} · {unitLabel(app)} · {typeLabel(app)}</p></div><div className="actions"><StatusBadge status={app.status}/>{canSupplement && <Link className="btn revision" href={`/applications/${app.id}/supplement`}>{app.status === "draft" ? "Tiếp tục hồ sơ" : "Bổ sung hồ sơ"}</Link>}{canReview && <Link className="btn primary" href={`/review/${app.id}`}>Mở xét duyệt</Link>}</div></div>{app.review_comment && <div className={`notice ${app.status === "passed" ? "success" : "error"}`}><b>Nhận xét hội đồng:</b> {app.review_comment}</div>}<section className="card profile-overview"><div className="portrait-panel"><h3>{app.application_type === "individual" ? "Ảnh chân dung" : "Tập thể"}</h3>{app.application_type === "individual" ? <EvidenceGallery items={portrait} compact/> : <div className="collective-mark">{app.collective_type === "club" ? "CLB" : "CHI ĐOÀN"}<br />{unitLabel(app)}</div>}</div><div className="profile-facts"><div><span>Đợt xét</span><b>{app.period_name || "—"}</b></div><div><span>Loại hồ sơ</span><b>{typeLabel(app)}</b></div><div><span>Đối tượng</span><b>{app.subject_name}</b></div><div><span>Đơn vị</span><b>{unitLabel(app)}</b></div><div><span>Mã số sinh viên</span><b>{app.student_id || "—"}</b></div><div><span>Ngày sinh</span><b>{formatDate(app.birth_date)}</b></div><div><span>Chức vụ</span><b>{app.position || "—"}</b></div><div><span>Email</span><b>{app.email || "—"}</b></div></div></section><section className="card review-section"><h3>Báo cáo thành tích</h3><p style={{ lineHeight: 1.7 }}>{app.achievements}</p><EvidenceDisclosure title="Thành tích nổi bật" items={main}/></section><ActivitySection title="Hoạt động cấp khoa" items={faculty}/><ActivitySection title="Hoạt động cấp trường" items={university}/><section className="card review-section"><h3>Thành tích đã được khen thưởng</h3>{(app.prior_awards || []).length ? (app.prior_awards || []).map(a => <div className="record" key={a.id}><p>{a.award_type === "certificate" ? "Giấy chứng nhận" : "Bằng khen"} · Số {a.decision_number} · {a.issuer} · {formatDate(a.issued_date)}</p><EvidenceDisclosure title={a.title} items={a.evidences || []}/></div>) : <div className="empty">Chưa kê khai.</div>}</section><section className="card review-section"><h3>Bản tóm tắt</h3><div className="summary-box">{app.summary || "—"}</div></section></>; }
function ActivitySection({ title, items }: {
    title: string;
    items: NonNullable<Application["activities"]>;
}) { return <section className="card review-section"><h3>{title}</h3>{items.length ? items.map(a => <div className="record" key={a.id}><p>{a.organizer || "—"} · {formatDate(a.activity_date)} · {a.role || "—"}</p>{a.contribution && <p>{a.contribution}</p>}<EvidenceDisclosure title={a.name} items={a.evidences || []}/></div>) : <div className="empty">Chưa kê khai.</div>}</section>; }
function EvidenceDisclosure({ title, items }: {
    title: string;
    items: NonNullable<Application["evidences"]>;
}) { return <details open={items.length > 0}><summary className="content-link" style={{ cursor: "pointer", marginBottom: 10 }}>{title} · {items.length} ảnh minh chứng</summary><EvidenceGallery items={items}/></details>; }

