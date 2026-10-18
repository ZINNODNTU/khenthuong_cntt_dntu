import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getEvaluationPeriods } from "@/lib/periods";
import { StatusBadge } from "@/components/status-badge";
import type { Application } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

const PAGE_SIZE = 25;
function typeLabel(_a: Pick<Application, "application_type" | "collective_type">) {
  return "Cá nhân";
}

type QueueRow = Pick<Application, "id" | "code" | "evaluation_period_id" | "subject_name" | "branch_code" | "application_type" | "collective_type" | "status" | "updated_at" | "reviewer_id"> & {
  evidences: { count: number }[];
  application_criteria: { status: string }[];
};

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const f = await searchParams;
  const { supabase, profile } = await requireRole(["admin", "reviewer"]);
  const periods = await getEvaluationPeriods(supabase);
  const page = Math.min(1000, Math.max(1, Number.parseInt(f.page || "1", 10) || 1));
  const assignment = ["mine", "unassigned", "all"].includes(f.assignment || "") ? f.assignment : "all";
  const search = (f.q || "").trim().slice(0, 100);

  let query = supabase.from("applications")
    .select("id,code,evaluation_period_id,subject_name,branch_code,application_type,collective_type,status,updated_at,reviewer_id,evidences(count),application_criteria(status)", { count: "exact" })
    .in("status", ["submitted", "review"])
    .eq("application_type", "individual");
  if (f.period && periods.some(period => period.id === f.period)) query = query.eq("evaluation_period_id", f.period);
  if (assignment === "mine") query = query.eq("reviewer_id", profile.id);
  if (assignment === "unassigned") query = query.is("reviewer_id", null);
  if (search) query = query.ilike("subject_name", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
  const { data, count, error } = await query
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const rows = (data || []) as QueueRow[];
  const total = count || 0;
  const pm = new Map(periods.map(period => [period.id, period.name]));
  const urlForPage = (number: number) => {
    const params = new URLSearchParams();
    if (f.period) params.set("period", f.period);
    if (search) params.set("q", search);
    if (assignment && assignment !== "all") params.set("assignment", assignment);
    params.set("page", String(number));
    return `/review?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        eyebrow={profile.role === "reviewer" ? "KHÔNG GIAN CÁN BỘ THẨM ĐỊNH" : "HỘI ĐỒNG XÉT KHEN THƯỞNG"}
        title="Hàng đợi xét duyệt"
        description="Tiếp nhận hồ sơ, kiểm tra minh chứng từng tiêu chí và kết luận Đạt / Không đạt."
      >
        <div className="card" style={{ padding: "12px 18px", textAlign: "center" }}>
          <b style={{ fontSize: "1.45rem", display: "block", color: "var(--color-primary)" }}>{total}</b>
          <span className="text-xs text-secondary">hồ sơ phù hợp</span>
        </div>
      </PageHeader>

      <form className="filter-bar" role="search">
        <div className="field">
          <label className="field-label" htmlFor="queue-search">Đối tượng</label>
          <input id="queue-search" name="q" className="input" placeholder="Tìm theo tên sinh viên" maxLength={100} defaultValue={search} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="queue-period">Đợt xét</label>
          <select id="queue-period" className="select" name="period" defaultValue={f.period || ""}>
            <option value="">Tất cả đợt xét</option>
            {periods.map(period => <option key={period.id} value={period.id}>{period.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="queue-assignment">Phân công</label>
          <select id="queue-assignment" className="select" name="assignment" defaultValue={assignment}>
            <option value="all">Tất cả hồ sơ</option>
            <option value="unassigned">Chưa phân công</option>
            <option value="mine">Tôi phụ trách</option>
          </select>
        </div>
        <div className="filter-bar-actions">
          <Button type="submit">Áp dụng bộ lọc</Button>
          <Link href="/review" className="btn btn-ghost">Xóa lọc</Link>
        </div>
      </form>

      {error && <div className="notice notice-error" role="alert">Không thể tải hàng đợi. Hãy kiểm tra kết nối và migration database.</div>}

      <div className="card card-body">
        <div className="table-wrap table-responsive-card">
          <table className="table">
            <thead>
              <tr>
                <th>Mã hồ sơ</th><th>Đối tượng</th><th>Đợt xét</th><th>Loại</th>
                <th>Minh chứng</th><th>Tiến độ đánh giá</th><th>Phụ trách</th><th>Xử lý</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map(row => {
                const done = row.application_criteria?.filter(item => item.status === "verified" || item.status === "rejected").length || 0;
                const mine = row.reviewer_id === profile.id;
                return (
                  <tr key={row.id}>
                    <td data-label="Mã hồ sơ"><b>{row.code}</b><div className="text-xs text-secondary">{formatDate(row.updated_at)}</div></td>
                    <td data-label="Đối tượng">
                      <Link href={`/review/${row.id}`} style={{ color: "var(--color-primary)", fontWeight: 600 }}>{row.subject_name}</Link>
                      <div className="text-xs text-secondary">{row.branch_code || "Câu lạc bộ"}</div>
                    </td>
                    <td data-label="Đợt xét" className="text-secondary">{pm.get(row.evaluation_period_id) || "—"}</td>
                    <td data-label="Loại">{typeLabel(row)}</td>
                    <td data-label="Minh chứng" className="text-secondary">{row.evidences?.[0]?.count || 0} tệp</td>
                    <td data-label="Tiến độ đánh giá"><strong>{done}/{row.application_type === "individual" ? 9 : 6}</strong><div className="text-xs text-secondary"><StatusBadge status={row.status} /></div></td>
                    <td data-label="Phụ trách">
                      {mine ? "Tôi phụ trách" : row.reviewer_id ? "Cán bộ khác" : "Chưa phân công"}
                    </td>
                    <td data-label="Xử lý">
                      <Link className="btn btn-outline" href={`/review/${row.id}`}>
                        {mine || profile.role === "admin" ? "Mở phiếu xét duyệt" : row.reviewer_id ? "Xem hồ sơ" : "Mở xét duyệt"}
                      </Link>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8}><EmptyState title="Không có hồ sơ phù hợp" description="Thử thay đổi đợt xét hoặc bộ lọc phân công." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {total > PAGE_SIZE && (
          <nav aria-label="Phân trang hồ sơ" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 16 }}>
            <span className="text-sm text-secondary">Trang {page} / {Math.ceil(total / PAGE_SIZE)}</span>
            <div style={{ display: "flex", gap: 8 }}>
              {page > 1 && <Link className="btn btn-outline" href={urlForPage(page - 1)}>Trang trước</Link>}
              {page * PAGE_SIZE < total && <Link className="btn btn-outline" href={urlForPage(page + 1)}>Trang sau</Link>}
            </div>
          </nav>
        )}
      </div>
    </>
  );
}
