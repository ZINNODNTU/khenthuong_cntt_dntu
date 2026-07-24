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
  const { supabase } = await requireRole(["admin", "reviewer"]);
  const periods = await getEvaluationPeriods(supabase);
  let q = supabase
    .from("applications")
    .select("id,code,evaluation_period_id,subject_name,branch_code,status,review_comment,decided_at")
    .in("status", ["passed", "failed", "revision"])
    .order("decided_at", { ascending: false });
  if (f.period) q = q.eq("evaluation_period_id", f.period);
  const { data } = await q;
  const rows = (data || []) as Pick<Application, "id" | "code" | "evaluation_period_id" | "subject_name" | "branch_code" | "status" | "review_comment" | "decided_at">[];
  const pm = new Map(periods.map((p) => [p.id, p.name]));

  return (
    <>
      <PageHeader
        eyebrow="LỊCH SỬ XỬ LÝ"
        title="Kết quả xét duyệt"
        description="Tổng hợp hồ sơ Đạt, Không đạt và Yêu cầu bổ sung."
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
    </>
  );
}
