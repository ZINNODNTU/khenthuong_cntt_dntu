import Link from "next/link";
import { CalendarRange, Files, Clock3, CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { getActiveBranchCodes } from "@/lib/branches";
import { getEvaluationPeriods } from "@/lib/periods";
import type { Application } from "@/lib/types";
import { formatDate } from "@/lib/utils";
export default async function DashboardPage() {
    const { supabase } = await requireRole(["admin"]);
    const periods = await getEvaluationPeriods(supabase);
    const open = periods.find(p => p.status === "open" && Date.now() >= new Date(p.starts_at).getTime() && Date.now() <= new Date(p.ends_at).getTime());
    const statuses = ["submitted", "review", "revision", "passed", "failed"] as const;
    const countQuery = (status?: string) => {
        let q = supabase.from("applications").select("id", { count: "exact", head: true });
        if (open)
            q = q.eq("evaluation_period_id", open.id);
        if (status)
            q = q.eq("status", status);
        return q;
    };
    const [counts, totalResult, appsResult, branches] = await Promise.all([Promise.all(statuses.map(async (s) => (await countQuery(s)).count || 0)), countQuery(), (() => {
            let q = supabase.from("applications").select("id,code,subject_name,branch_code,application_type,collective_type,status,updated_at").order("updated_at", { ascending: false }).limit(8);
            if (open)
                q = q.eq("evaluation_period_id", open.id);
            return q;
        })(), getActiveBranchCodes(supabase)]);
    const rows = (appsResult.data || []) as Pick<Application, "id" | "code" | "subject_name" | "branch_code" | "application_type" | "collective_type" | "status" | "updated_at">[];
    const branchCounts = new Map<string, number>();
    rows.forEach(a => {
        if (a.branch_code)
            branchCounts.set(a.branch_code, (branchCounts.get(a.branch_code) || 0) + 1);
    });
    return <><div className="page-head"><div><div className="eyebrow">QUẢN TRỊ HỆ THỐNG</div><h1>Tổng quan vận hành</h1><p>{open ? `Đợt đang mở: ${open.name}` : "Hiện chưa có đợt xét đang mở."}</p></div><div className="actions"><Link className="btn" href="/periods"><CalendarRange size={16}/>Quản lý đợt xét</Link><Link className="btn" href="/review">Mở hàng đợi xét duyệt</Link></div></div><div className="stats"><StatCard label="Tổng hồ sơ" value={totalResult.count || 0} note={open ? "Trong đợt đang mở" : "Chưa chọn đợt"} icon={Files}/><StatCard label="Chờ xét duyệt" value={counts[0] + counts[1]} note="Cần hội đồng xử lý" icon={Clock3}/><StatCard label="Yêu cầu bổ sung" value={counts[2]} note="Đang chờ người nộp" icon={CircleAlert}/><StatCard label="Đạt" value={counts[3]} note="Đã hoàn thành" icon={CircleCheck}/><StatCard label="Không đạt" value={counts[4]} note="Đã kết luận" icon={CircleX}/></div><div className="grid-2"><section className="card panel"><h3>Chi đoàn có hồ sơ gần đây</h3><div className="panel-sub">Mức độ phát sinh hồ sơ trong danh sách mới nhất</div><div className="branch-grid">{branches.slice(0, 8).map(b => <div className="branch-card" key={b}><strong>{b}</strong><span>{branchCounts.get(b) || 0} hồ sơ gần đây</span><div className="progress"><i style={{ width: `${Math.min(100, (branchCounts.get(b) || 0) * 32 + 10)}%` }}/></div></div>)}</div></section><section className="card panel"><h3>Quy tắc nộp hồ sơ</h3><div className="panel-sub">Kiểm soát trùng lặp theo từng đợt xét</div><div className="process-list"><div><span>01</span><p><b>Cá nhân</b><small>Mỗi cá nhân có 01 hồ sơ trong một đợt.</small></p></div><div><span>02</span><p><b>Chi đoàn</b><small>Mỗi Chi đoàn có 01 hồ sơ tập thể trong một đợt.</small></p></div><div><span>03</span><p><b>Câu lạc bộ</b><small>Mỗi CLB có 01 hồ sơ tập thể trong một đợt.</small></p></div></div></section></div><section className="card panel" style={{ marginTop: 16 }}><h3>Hồ sơ mới nhất</h3><div className="table-wrap"><table><thead><tr><th>Mã</th><th>Đối tượng</th><th>Đơn vị</th><th>Loại</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead><tbody>{rows.map(a => <tr key={a.id}><td><b>{a.code}</b></td><td><Link className="content-link" href={`/applications/${a.id}`}>{a.subject_name}</Link></td><td>{a.branch_code || "CLB"}</td><td>{a.application_type === "individual" ? "Cá nhân" : a.collective_type === "club" ? "Tập thể CLB" : "Tập thể Chi đoàn"}</td><td><StatusBadge status={a.status}/></td><td>{formatDate(a.updated_at)}</td></tr>)}</tbody></table></div></section></>;
}

