import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getActiveBranchCodes } from "@/lib/branches";
import { getEvaluationPeriods } from "@/lib/periods";
import { APP_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import type { Application } from "@/lib/types";
import { formatDate } from "@/lib/utils";
function typeLabel(a: Pick<Application, "application_type" | "collective_type">) {
    if (a.application_type === "individual")
        return "Cá nhân";
    return a.collective_type === "club" ? "Tập thể CLB" : "Tập thể Chi đoàn";
}
export default async function ApplicationsPage({ searchParams }: {
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const f = await searchParams;
    const { supabase, profile } = await requireRole(["admin", "submitter"]);
    const admin = profile.role === "admin";
    const [branches, periods] = await Promise.all([admin ? getActiveBranchCodes(supabase) : Promise.resolve([]), getEvaluationPeriods(supabase)]);
    let q = supabase.from("applications").select("id,code,evaluation_period_id,subject_name,branch_code,club_id,application_type,collective_type,status,updated_at,evidences(count)").order("updated_at", { ascending: false });
    if (admin && f.branch)
        q = q.eq("branch_code", f.branch);
    if (f.period)
        q = q.eq("evaluation_period_id", f.period);
    if (f.status)
        q = q.eq("status", f.status);
    if (admin && f.type) {
        if (f.type === "individual")
            q = q.eq("application_type", "individual");
        if (f.type === "branch")
            q = q.eq("collective_type", "branch");
        if (f.type === "club")
            q = q.eq("collective_type", "club");
    }
    if (f.search) {
        const s = f.search.replace(/[%_,]/g, "");
        q = q.or(`subject_name.ilike.%${s}%,code.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error)
        throw new Error(error.message);
    const rows = (data || []) as (Pick<Application, "id" | "code" | "evaluation_period_id" | "subject_name" | "branch_code" | "club_id" | "application_type" | "collective_type" | "status" | "updated_at"> & {
        evidences: {
            count: number;
        }[];
    })[];
    const periodMap = new Map(periods.map(p => [p.id, p.name]));
    return <><div className="page-head"><div><div className="eyebrow">{admin ? "QUẢN LÝ HỒ SƠ" : "TÀI KHOẢN CỦA TÔI"}</div><h1>{admin ? "Toàn bộ hồ sơ" : "Hồ sơ của tôi"}</h1><p>{admin ? "Tra cứu hồ sơ theo đợt xét, đơn vị và trạng thái." : "Theo dõi hồ sơ đã lưu, đã gửi và kết quả xét duyệt."}</p></div>{!admin && <Link className="btn primary" href="/applications/new">Nộp thành tích</Link>}</div><form className="filters"><input name="search" defaultValue={f.search} placeholder="Tìm tên hoặc mã hồ sơ..."/><select name="period" defaultValue={f.period || ""}><option value="">Tất cả đợt xét</option>{periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{admin && <select name="branch" defaultValue={f.branch || ""}><option value="">Tất cả chi đoàn</option>{branches.map(b => <option key={b}>{b}</option>)}</select>}<select name="status" defaultValue={f.status || ""}><option value="">Tất cả trạng thái</option>{APP_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>{admin && <select name="type" defaultValue={f.type || ""}><option value="">Tất cả loại hồ sơ</option><option value="individual">Cá nhân</option><option value="branch">Tập thể Chi đoàn</option><option value="club">Tập thể CLB</option></select>}<button className="btn">Lọc</button></form><div className="card panel"><div className="table-wrap"><table><thead><tr><th>Mã hồ sơ</th><th>Đối tượng</th><th>Đợt xét</th><th>Đơn vị</th><th>Loại</th><th>Ảnh</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead><tbody>{rows.length ? rows.map(a => <tr key={a.id}><td><b>{a.code}</b></td><td><Link className="content-link" href={`/applications/${a.id}`}>{a.subject_name}</Link></td><td>{periodMap.get(a.evaluation_period_id) || "—"}</td><td>{a.branch_code || (a.club_id ? "CLB" : "—")}</td><td>{typeLabel(a)}</td><td>{a.evidences?.[0]?.count || 0}</td><td><StatusBadge status={a.status}/></td><td>{formatDate(a.updated_at)}</td></tr>) : <tr><td colSpan={8}><div className="empty">{admin ? "Không có hồ sơ phù hợp." : "Bạn chưa có hồ sơ nào."}</div></td></tr>}</tbody></table></div></div></>;
}

