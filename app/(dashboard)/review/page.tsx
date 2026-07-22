import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getEvaluationPeriods } from "@/lib/periods";
import { StatusBadge } from "@/components/status-badge";
import type { Application } from "@/lib/types";
import { formatDate } from "@/lib/utils";
function typeLabel(a: Pick<Application, "application_type" | "collective_type">) {
    if (a.application_type === "individual")
        return "Cá nhân";
    return a.collective_type === "club" ? "Tập thể CLB" : "Tập thể Chi đoàn";
}
export default async function ReviewQueuePage({ searchParams }: {
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const f = await searchParams;
    const { supabase, profile } = await requireRole(["admin", "reviewer"]);
    const periods = await getEvaluationPeriods(supabase);
    let q = supabase.from("applications").select("id,code,evaluation_period_id,subject_name,branch_code,application_type,collective_type,status,updated_at,evidences(count)").in("status", ["submitted", "review"]).order("updated_at", { ascending: false });
    if (f.period)
        q = q.eq("evaluation_period_id", f.period);
    const { data } = await q;
    const rows = (data || []) as (Pick<Application, "id" | "code" | "evaluation_period_id" | "subject_name" | "branch_code" | "application_type" | "collective_type" | "status" | "updated_at"> & {
        evidences: {
            count: number;
        }[];
    })[];
    const pm = new Map(periods.map(p => [p.id, p.name]));
    return <><div className="page-head"><div><div className="eyebrow">{profile.role === "reviewer" ? "CỔNG XÉT DUYỆT" : "HỘI ĐỒNG XÉT DUYỆT"}</div><h1>Hồ sơ cần xét</h1><p>Kiểm tra nội dung và minh chứng trước khi kết luận.</p></div><div className="queue-count"><b>{rows.length}</b><span>hồ sơ đang chờ</span></div></div><form className="filters"><select name="period" defaultValue={f.period || ""}><option value="">Tất cả đợt xét</option>{periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="btn">Lọc</button></form><div className="card panel"><div className="table-wrap"><table><thead><tr><th>Mã</th><th>Đối tượng</th><th>Đợt xét</th><th>Đơn vị</th><th>Loại</th><th>Ảnh</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead><tbody>{rows.length ? rows.map(a => <tr key={a.id}><td><b>{a.code}</b></td><td><Link className="content-link" href={`/review/${a.id}`}>{a.subject_name}</Link></td><td>{pm.get(a.evaluation_period_id) || "—"}</td><td>{a.branch_code || "CLB"}</td><td>{typeLabel(a)}</td><td>{a.evidences?.[0]?.count || 0}</td><td><StatusBadge status={a.status}/></td><td>{formatDate(a.updated_at)}</td></tr>) : <tr><td colSpan={8}><div className="empty">Không có hồ sơ chờ xét duyệt.</div></td></tr>}</tbody></table></div></div></>;
}

