import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getEvaluationPeriods } from "@/lib/periods";
import { StatusBadge } from "@/components/status-badge";
import type { Application } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

function typeLabel(a: Pick<Application, "application_type" | "collective_type">) {
  if (a.application_type === "individual") return "Cá nhân";
  return a.collective_type === "club" ? "Tập thể CLB" : "Tập thể Chi đoàn";
}

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const f = await searchParams;
  const { supabase, profile } = await requireRole(["admin", "reviewer"]);
  const periods = await getEvaluationPeriods(supabase);
  let q = supabase
    .from("applications")
    .select("id,code,evaluation_period_id,subject_name,branch_code,application_type,collective_type,status,updated_at,evidences(count)")
    .in("status", ["submitted", "review"])
    .order("updated_at", { ascending: false });
  if (f.period) q = q.eq("evaluation_period_id", f.period);
  const { data } = await q;
  const rows = (data || []) as (Pick<Application, "id" | "code" | "evaluation_period_id" | "subject_name" | "branch_code" | "application_type" | "collective_type" | "status" | "updated_at"> & { evidences: { count: number }[] })[];
  const pm = new Map(periods.map((p) => [p.id, p.name]));

  return (
    <>
      <PageHeader
        eyebrow={profile.role === "reviewer" ? "CỔNG XÉT DUYỆT" : "HỘI ĐỒNG XÉT DUYỆT"}
        title="Hồ sơ cần xét"
        description="Kiểm tra nội dung và minh chứng trước khi kết luận."
      >
        <div className="card" style={{ padding: "var(--space-3) var(--space-4)", textAlign: "center", background: "var(--color-info-bg)", borderColor: "var(--color-info-border)" }}>
          <b style={{ fontSize: "var(--font-size-2xl)", display: "block", color: "var(--color-primary)" }}>{rows.length}</b>
          <span className="text-xs text-secondary">hồ sơ đang chờ</span>
        </div>
      </PageHeader>

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
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Đối tượng</th>
                <th>Đợt xét</th>
                <th>Đơn vị</th>
                <th>Loại</th>
                <th>Ảnh</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((a) => (
                  <tr key={a.id}>
                    <td><b>{a.code}</b></td>
                    <td>
                      <Link href={`/review/${a.id}`} style={{ color: "var(--color-primary)", fontWeight: "var(--font-weight-medium)" }}>
                        {a.subject_name}
                      </Link>
                    </td>
                    <td className="text-secondary">{pm.get(a.evaluation_period_id) || "—"}</td>
                    <td className="text-secondary">{a.branch_code || "CLB"}</td>
                    <td className="text-secondary">{typeLabel(a)}</td>
                    <td className="text-secondary">{a.evidences?.[0]?.count || 0}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="text-secondary">{formatDate(a.updated_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <EmptyState title="Không có hồ sơ chờ xét duyệt" description="Tất cả hồ sơ đã được xử lý." />
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
