import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getEvaluationPeriods } from "@/lib/periods";
import { StatusBadge } from "@/components/status-badge";
import type { Application } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const f = await searchParams;
  const { supabase, profile } = await requireRole(["admin", "reviewer", "submitter"]);
  const isSubmitter = profile.role === "submitter";
  const periods = await getEvaluationPeriods(supabase);
  let q = supabase
    .from("applications")
    .select("id,code,evaluation_period_id,subject_name,branch_code,status,review_comment,decided_at")
    .in("status", ["passed", "failed", "revision"])
    .order("decided_at", { ascending: false });
  if (isSubmitter) q = q.eq("created_by", profile.id);
  if (f.period) q = q.eq("evaluation_period_id", f.period);
  const { data } = await q;
  const rows = (data || []) as Pick<Application, "id" | "code" | "evaluation_period_id" | "subject_name" | "branch_code" | "status" | "review_comment" | "decided_at">[];
  const pm = new Map(periods.map((p) => [p.id, p.name]));

  return (
    <>
      <PageHeader
        eyebrow={isSubmitter ? "KẾT QUẢ CỦA TÔI" : "LỊCH SỬ XỬ LÝ"}
        title="Kết quả xét duyệt"
        description={isSubmitter ? "Kết quả hồ sơ đã xử lý." : "Tổng hợp hồ sơ Đạt, Không đạt và Yêu cầu bổ sung."}
      />

      <form className="filter-bar">
        <div className="field">
          <select className="select" name="period" defaultValue={f.period || ""}>
            <option value="">Tất cả đợt xét</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-bar-actions">
          <Button type="submit">Lọc</Button>
        </div>
      </form>

      {isSubmitter ? (
        rows.length ? (
          <div className="app-card-grid">
            {rows.map((a) => {
              const statusText: Record<string, string> = {
                revision: "Chờ bổ sung", passed: "Đạt", failed: "Không đạt",
              };
              const statusBadge: Record<string, string> = {
                revision: "badge-red", passed: "badge-green", failed: "badge-red",
              };
              const st = statusText[a.status] || a.status;
              const bg = statusBadge[a.status] || "badge-gray";
              return (
                <Link href={`/applications/${a.id}`} className="card app-card" key={a.id}>
                  <div className="app-card-top">
                    <span className="app-card-code">{a.code}</span>
                    <span className={`badge ${bg}`}>{st}</span>
                  </div>
                  <div className="app-card-name">{a.subject_name}</div>
                  <div className="app-card-meta">
                    <span>{pm.get(a.evaluation_period_id) || "—"} · {a.branch_code || "CLB"}</span>
                    <span>{formatDate(a.decided_at)}</span>
                  </div>
                  {a.review_comment && (
                    <div className="app-card-comment text-secondary">{a.review_comment}</div>
                  )}
                  <div className="app-card-actions">
                    <span className="app-card-view">Xem chi tiết →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="card card-body">
            <EmptyState title="Chưa có kết quả" description="Hồ sơ của bạn sẽ hiển thị tại đây sau khi được xét duyệt." />
          </div>
        )
      ) : (
        <div className="card card-body">
          <div className="table-wrap table-responsive-card">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Đối tượng</th>
                  <th>Đợt xét</th>
                  <th>Đơn vị</th>
                  <th>Kết quả</th>
                  <th>Nhận xét</th>
                  <th>Ngày xét</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((a) => (
                    <tr key={a.id}>
                      <td data-label="Mã"><b>{a.code}</b></td>
                      <td data-label="Đối tượng">
                        <Link href={`/applications/${a.id}`} style={{ color: "var(--color-primary)", fontWeight: "var(--font-weight-medium)" }}>
                          {a.subject_name}
                        </Link>
                      </td>
                      <td data-label="Đợt xét" className="text-secondary">{pm.get(a.evaluation_period_id) || "—"}</td>
                      <td data-label="Đơn vị" className="text-secondary">{a.branch_code || "CLB"}</td>
                      <td data-label="Kết quả"><StatusBadge status={a.status} /></td>
                      <td data-label="Nhận xét" className="text-secondary">{a.review_comment || "—"}</td>
                      <td data-label="Ngày xét" className="text-secondary">{formatDate(a.decided_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState title="Chưa có kết quả" description="Các hồ sơ đã xét duyệt sẽ hiển thị tại đây." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
