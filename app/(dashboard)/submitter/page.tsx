import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getEvaluationPeriods } from "@/lib/periods";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { FilePlus2, Files, Clock, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function SubmitterDashboard() {
  const { supabase, profile } = await requireRole(["submitter"]);
  const periods = await getEvaluationPeriods(supabase);
  const now = Date.now();

  const openPeriod = periods.find((p) =>
    p.status === "open" && now >= new Date(p.starts_at).getTime() && now <= new Date(p.ends_at).getTime()
  );

  const { data: recentApps } = await supabase
    .from("applications")
    .select("id,code,status,updated_at,subject_name")
    .eq("created_by", profile.id)
    .order("updated_at", { ascending: false })
    .limit(3);

  return (
    <>
      {openPeriod && (
        <div className="submitter-banner">
          <Clock size={18} />
          <div>
            <strong>Đợt xét đang mở: {openPeriod.name}</strong>
            <span>Hạn nộp: {formatDate(openPeriod.ends_at)}</span>
          </div>
        </div>
      )}

      <div className="submitter-hero">
        <div className="submitter-hero-text">
          <h2>Xin chào, {profile.full_name}</h2>
          <p>{openPeriod ? "Đợt xét đang mở — nộp hồ sơ ngay." : "Hiện chưa có đợt xét nào đang mở."}</p>
        </div>
        <Link href="/applications/new">
          <Button variant="primary">
            <FilePlus2 size={20} />
            Nộp thành tích mới
          </Button>
        </Link>
      </div>

      <div className="submitter-grid">
        <div className="card submitter-card">
          <div className="submitter-card-header">
            <Files size={20} />
            <h3>Hồ sơ gần đây</h3>
          </div>
          {recentApps?.length ? (
            <div className="submitter-recent-list">
              {recentApps.map((app) => (
                <Link href={`/applications/${app.id}`} className="submitter-recent-item" key={app.id}>
                  <div>
                    <strong>{app.code}</strong>
                    <span>{app.subject_name}</span>
                  </div>
                  <span className={`badge ${app.status === "passed" ? "badge-green" : app.status === "failed" ? "badge-red" : app.status === "draft" ? "badge-gray" : "badge-blue"}`}>
                    {app.status === "submitted" ? "Đã gửi" : app.status === "draft" ? "Nháp" : app.status === "passed" ? "Đạt" : app.status === "failed" ? "Không đạt" : app.status === "review" ? "Đang xét" : app.status === "revision" ? "Bổ sung" : app.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="submitter-empty">
              <CheckCircle2 size={32} />
              <p>Chưa có hồ sơ nào.</p>
            </div>
          )}
          <Link className="submitter-card-link" href="/applications">
            Xem tất cả hồ sơ →
          </Link>
        </div>

        <div className="card submitter-card">
          <div className="submitter-card-header">
            <Clock size={20} />
            <h3>Hướng dẫn nhanh</h3>
          </div>
          <ol className="submitter-guide-list">
            <li>Chuẩn bị MSSV, thông tin thành tích và ảnh minh chứng.</li>
            <li>Nhấn <strong>"Nộp thành tích mới"</strong> và điền theo từng bước.</li>
            <li>Theo dõi trạng thái tại <strong>"Hồ sơ của tôi"</strong>.</li>
            <li>Nếu yêu cầu bổ sung, mở hồ sơ và tải thêm ảnh.</li>
          </ol>
        </div>
      </div>
    </>
  );
}
