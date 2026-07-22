import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getEvaluationPeriods } from "@/lib/periods";
import { StatusBadge } from "@/components/status-badge";
import type { Application } from "@/lib/types";
import { formatDate } from "@/lib/utils";
export default async function ResultsPage({ searchParams }: {
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const f = await searchParams;
    const { supabase } = await requireRole(["admin", "reviewer"]);
    const periods = await getEvaluationPeriods(supabase);
    let q = supabase.from("applications").select("id,code,evaluation_period_id,subject_name,branch_code,status,review_comment,decided_at").in("status", ["passed", "failed", "revision"]).order("decided_at", { ascending: false });
    if (f.period)
        q = q.eq("evaluation_period_id", f.period);
    const { data } = await q;
    const rows = (data || []) as Pick<Application, "id" | "code" | "evaluation_period_id" | "subject_name" | "branch_code" | "status" | "review_comment" | "decided_at">[];
    const pm = new Map(periods.map(p => [p.id, p.name]));
    return <><div className="page-head"><div><div className="eyebrow">LỊCH SỬ XỬ LÝ</div><h1>Kết quả xét duyệt</h1><p>Tổng hợp hồ sơ Đạt, Không đạt và Yêu cầu bổ sung.</p></div></div><form className="filters"><select name="period" defaultValue={f.period || ""}><option value="">Tất cả đợt xét</option>{periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="btn">Lọc</button></form><div className="card panel"><div className="table-wrap"><table><thead><tr><th>Mã</th><th>Đối tượng</th><th>Đợt xét</th><th>Đơn vị</th><th>Kết quả</th><th>Nhận xét</th><th>Ngày xét</th></tr></thead><tbody>{rows.length ? rows.map(a => <tr key={a.id}><td><b>{a.code}</b></td><td><Link className="content-link" href={`/applications/${a.id}`}>{a.subject_name}</Link></td><td>{pm.get(a.evaluation_period_id) || "—"}</td><td>{a.branch_code || "CLB"}</td><td><StatusBadge status={a.status}/></td><td>{a.review_comment || "—"}</td><td>{formatDate(a.decided_at)}</td></tr>) : <tr><td colSpan={7}><div className="empty">Chưa có kết quả.</div></td></tr>}</tbody></table></div></div></>;
}

