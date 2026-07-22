"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EvaluationPeriod } from "@/lib/types";
export function PeriodManager({ periods }: {
    periods: EvaluationPeriod[];
}) {
    const router = useRouter();
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState("");
    async function create(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy("new");
        setMessage("");
        const f = new FormData(e.currentTarget);
        const payload = { name: f.get("name"), description: f.get("description"), startsAt: new Date(String(f.get("startsAt"))).toISOString(), endsAt: new Date(String(f.get("endsAt"))).toISOString(), status: f.get("status"), allowIndividual: f.get("allowIndividual") === "on", allowBranchCollective: f.get("allowBranchCollective") === "on", allowClubCollective: f.get("allowClubCollective") === "on" };
        const r = await fetch("/api/admin/periods", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
        const d = await r.json();
        setMessage(r.ok ? "Đã tạo đợt xét thành tích." : d.error || "Không thể tạo đợt xét");
        setBusy("");
        if (r.ok) {
            e.currentTarget.reset();
            router.refresh();
        }
    }
    async function update(p: EvaluationPeriod, status: EvaluationPeriod["status"]) {
        setBusy(p.id);
        setMessage("");
        const r = await fetch("/api/admin/periods", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: p.id, name: p.name, description: p.description || "", startsAt: p.starts_at, endsAt: p.ends_at, status, allowIndividual: p.allow_individual, allowBranchCollective: p.allow_branch_collective, allowClubCollective: p.allow_club_collective }) });
        const d = await r.json();
        setMessage(r.ok ? "Đã cập nhật trạng thái đợt xét." : d.error || "Không thể cập nhật");
        setBusy("");
        if (r.ok)
            router.refresh();
    }
    return <><form className="card section" onSubmit={create}><div className="section-title"><div><h3>Tạo đợt xét thành tích</h3><p>Quy định thời gian nhận hồ sơ và loại hồ sơ được phép nộp.</p></div></div>{message && <div className={message.startsWith("Đã") ? "notice success" : "notice error"}>{message}</div>}<div className="form-grid"><div className="field"><label>Tên đợt xét *</label><input name="name" required placeholder="Ví dụ: Xét thành tích năm học 2026–2027"/></div><div className="field"><label>Trạng thái ban đầu</label><select name="status" defaultValue="draft"><option value="draft">Bản nháp</option><option value="open">Đang nhận hồ sơ</option><option value="closed">Đã đóng</option></select></div><div className="field"><label>Bắt đầu *</label><input name="startsAt" type="datetime-local" required/></div><div className="field"><label>Kết thúc *</label><input name="endsAt" type="datetime-local" required/></div><div className="field span-2"><label>Mô tả</label><textarea name="description"/></div><div className="field span-2"><label>Loại hồ sơ được tiếp nhận</label><div className="option-grid"><label className="option-card"><input type="checkbox" name="allowIndividual" defaultChecked/> Cá nhân</label><label className="option-card"><input type="checkbox" name="allowBranchCollective" defaultChecked/> Tập thể Chi đoàn</label><label className="option-card"><input type="checkbox" name="allowClubCollective" defaultChecked/> Tập thể CLB</label></div></div></div><button className="btn primary" disabled={busy === "new"} style={{ marginTop: 14 }}>{busy === "new" ? "Đang tạo..." : "Tạo đợt xét"}</button></form><div className="card panel" style={{ marginTop: 16 }}><div className="table-wrap"><table><thead><tr><th>Đợt xét</th><th>Thời gian</th><th>Loại hồ sơ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{periods.map(p => <tr key={p.id}><td><b>{p.name}</b><br /><small>{p.description || "—"}</small></td><td>{new Date(p.starts_at).toLocaleString("vi-VN")}<br />đến {new Date(p.ends_at).toLocaleString("vi-VN")}</td><td>{[p.allow_individual && "Cá nhân", p.allow_branch_collective && "Chi đoàn", p.allow_club_collective && "CLB"].filter(Boolean).join(" · ")}</td><td><span className={`status ${p.status === "open" ? "status-passed" : p.status === "closed" ? "status-failed" : "status-draft"}`}>{p.status === "open" ? "Đang nhận" : p.status === "closed" ? "Đã đóng" : "Bản nháp"}</span></td><td><div className="actions">{p.status !== "open" && <button className="btn pass" disabled={busy === p.id} onClick={() => update(p, "open")}>Mở nhận hồ sơ</button>}{p.status !== "closed" && <button className="btn fail" disabled={busy === p.id} onClick={() => update(p, "closed")}>Đóng đợt</button>}</div></td></tr>)}{!periods.length && <tr><td colSpan={5}><div className="empty">Chưa có đợt xét.</div></td></tr>}</tbody></table></div></div></>;
}

