"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EvaluationPeriod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/input";
import { Trash2, Pencil } from "lucide-react";

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function PeriodManager({ periods }: { periods: EvaluationPeriod[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState<EvaluationPeriod | null>(null);
  const [evidenceRanges, setEvidenceRanges] = useState<Record<string, { start: string; end: string }>>({});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(editing ? editing.id : "new");
    setMessage("");
    const f = new FormData(e.currentTarget);
    const payload = {
      ...(editing ? { id: editing.id } : {}),
      name: f.get("name"),
      description: f.get("description"),
      startsAt: new Date(String(f.get("startsAt"))).toISOString(),
      endsAt: new Date(String(f.get("endsAt"))).toISOString(),
      evidenceStartsOn: f.get("evidenceStartsOn"),
      evidenceEndsOn: f.get("evidenceEndsOn"),
      status: f.get("status"),
      allowIndividual: f.get("allowIndividual") === "on",
      allowBranchCollective: f.get("allowBranchCollective") === "on",
      allowClubCollective: f.get("allowClubCollective") === "on",
    };
    const r = await fetch("/api/admin/periods", {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    setMessage(r.ok ? (editing ? "Đã lưu thay đổi đợt xét." : "Đã tạo đợt xét thành tích.") : d.error || "Không thể lưu đợt xét");
    setBusy("");
    if (r.ok) {
      e.currentTarget.reset();
      setEditing(null);
      router.refresh();
    }
  }

  async function update(p: EvaluationPeriod, status: EvaluationPeriod["status"], range?: { start: string; end: string }) {
    setBusy(p.id);
    setMessage("");
    const evidenceStartsOn = range?.start || p.evidence_starts_on;
    const evidenceEndsOn = range?.end || p.evidence_ends_on;
    if (evidenceEndsOn < evidenceStartsOn) {
      setMessage("Ngày kết thúc minh chứng phải từ ngày bắt đầu trở đi.");
      setBusy("");
      return;
    }
    const r = await fetch("/api/admin/periods", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: p.id,
        name: p.name,
        description: p.description || "",
        startsAt: p.starts_at,
        endsAt: p.ends_at,
        evidenceStartsOn,
        evidenceEndsOn,
        status,
        allowIndividual: p.allow_individual,
        allowBranchCollective: p.allow_branch_collective,
        allowClubCollective: p.allow_club_collective,
      }),
    });
    const d = await r.json();
    setMessage(r.ok ? (range ? "Đã cập nhật thời gian minh chứng." : "Đã cập nhật trạng thái đợt xét.") : d.error || "Không thể cập nhật");
    setBusy("");
    if (r.ok) router.refresh();
  }

  async function remove(p: EvaluationPeriod) {
    const ok = window.confirm(`Xóa vĩnh viễn đợt xét “${p.name}”?\n\nHành động này không thể hoàn tác.`);
    if (!ok) return;
    setBusy(p.id); setMessage("");
    const response = await fetch("/api/admin/periods", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: p.id, confirmationName: p.name }) });
    const data = await response.json();
    setMessage(response.ok ? "Đã xóa đợt xét." : data.error || "Không thể xóa đợt xét");
    setBusy("");
    if (response.ok) {
      if (editing?.id === p.id) setEditing(null);
      router.refresh();
    }
  }

  const formKey = editing ? `edit-${editing.id}` : "new";

  return (
    <>
      {message && <div className={`notice ${message.startsWith("Đã") ? "notice-success" : "notice-error"} mb-4`}>{message}</div>}

      <form className="card card-body mb-4" onSubmit={submit} key={formKey}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{editing ? "Chỉnh sửa đợt xét" : "Tạo đợt xét thành tích"}</h3>
            <p className="text-sm text-secondary">{editing ? "Cập nhật thông tin đợt xét hiện có." : "Quy định thời gian nhận hồ sơ và loại hồ sơ được phép nộp."}</p>
          </div>
          {editing && (
            <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(null)}>Hủy chỉnh sửa</Button>
          )}
        </div>

        <div className="form-grid">
          <div className="field">
            <label className="field-label">Tên đợt xét *</label>
            <input className="input" name="name" required placeholder="Ví dụ: Xét thành tích năm học 2026–2027" defaultValue={editing?.name || ""} />
          </div>
          <div className="field">
            <label className="field-label">Trạng thái {editing ? "" : "ban đầu"}</label>
            <select className="select" name="status" defaultValue={editing?.status || "draft"}>
              <option value="draft">Bản nháp</option>
              <option value="open">Đang nhận hồ sơ</option>
              <option value="closed">Đã đóng</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">Bắt đầu *</label>
            <input className="input" name="startsAt" type="datetime-local" required defaultValue={editing ? toLocalInput(editing.starts_at) : ""} />
          </div>
          <div className="field">
            <label className="field-label">Kết thúc *</label>
            <input className="input" name="endsAt" type="datetime-local" required defaultValue={editing ? toLocalInput(editing.ends_at) : ""} />
          </div>
          <div className="field">
            <label className="field-label">Minh chứng từ ngày *</label>
            <input className="input" name="evidenceStartsOn" type="date" required defaultValue={editing?.evidence_starts_on || ""} />
            <span className="field-helper">Ngày hoạt động hoặc ngày cấp sớm nhất được chấp nhận.</span>
          </div>
          <div className="field">
            <label className="field-label">Minh chứng đến ngày *</label>
            <input className="input" name="evidenceEndsOn" type="date" required defaultValue={editing?.evidence_ends_on || ""} />
            <span className="field-helper">Ngày hoạt động hoặc ngày cấp muộn nhất được chấp nhận.</span>
          </div>
          <div className="field span-2">
            <label className="field-label">Mô tả</label>
            <textarea className="textarea" name="description" defaultValue={editing?.description || ""} />
          </div>
          <div className="field span-2">
            <label className="field-label">Loại hồ sơ được tiếp nhận</label>
            <div className="flex gap-3 flex-wrap mt-2">
              <Checkbox id="allowIndividual" name="allowIndividual" defaultChecked={editing?.allow_individual ?? true} label="Cá nhân" />
              <Checkbox id="allowBranchCollective" name="allowBranchCollective" defaultChecked={editing?.allow_branch_collective ?? true} label="Tập thể Chi đoàn" />
              <Checkbox id="allowClubCollective" name="allowClubCollective" defaultChecked={editing?.allow_club_collective ?? true} label="Tập thể CLB" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="primary" loading={busy === (editing ? editing.id : "new")}>
            {editing ? "Lưu thay đổi" : "Tạo đợt xét"}
          </Button>
          {editing && (
            <Button variant="outline" type="button" onClick={() => setEditing(null)}>Hủy</Button>
          )}
        </div>
      </form>

      <div className="card card-body">
        <div className="table-wrap table-responsive-card">
          <table className="table">
            <thead>
              <tr>
                <th>Đợt xét</th>
                <th>Thời gian</th>
                <th>Loại hồ sơ</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id}>
                  <td data-label="Đợt xét">
                    <b>{p.name}</b>
                    <br />
                    <span className="text-xs text-secondary">{p.description || "—"}</span>
                  </td>
                  <td data-label="Thời gian" className="text-sm">
                    {new Date(p.starts_at).toLocaleString("vi-VN")}
                    <br />
                    đến {new Date(p.ends_at).toLocaleString("vi-VN")}
                    <br />
                    <div className="period-evidence-editor">
                      <label>Từ <input className="input" type="date" value={evidenceRanges[p.id]?.start ?? p.evidence_starts_on} onChange={(e) => setEvidenceRanges((ranges) => ({ ...ranges, [p.id]: { start: e.target.value, end: ranges[p.id]?.end ?? p.evidence_ends_on } }))} /></label>
                      <label>Đến <input className="input" type="date" value={evidenceRanges[p.id]?.end ?? p.evidence_ends_on} onChange={(e) => setEvidenceRanges((ranges) => ({ ...ranges, [p.id]: { start: ranges[p.id]?.start ?? p.evidence_starts_on, end: e.target.value } }))} /></label>
                      <Button size="sm" variant="outline" loading={busy === p.id} onClick={() => update(p, p.status, evidenceRanges[p.id] || { start: p.evidence_starts_on, end: p.evidence_ends_on })}>Lưu ngày minh chứng</Button>
                    </div>
                  </td>
                  <td data-label="Loại hồ sơ" className="text-sm text-secondary">
                    {[p.allow_individual && "Cá nhân", p.allow_branch_collective && "Chi đoàn", p.allow_club_collective && "CLB"].filter(Boolean).join(" · ")}
                  </td>
                  <td data-label="Trạng thái">
                    <span className={`badge ${p.status === "open" ? "badge-green" : p.status === "closed" ? "badge-red" : "badge-gray"}`}>
                      {p.status === "open" ? "Đang nhận" : p.status === "closed" ? "Đã đóng" : "Bản nháp"}
                    </span>
                  </td>
                  <td data-label="Thao tác">
                    <div className="flex gap-2">
                      {p.status !== "open" && (
                        <Button size="sm" variant="primary" loading={busy === p.id} onClick={() => update(p, "open")}>
                          Mở nhận hồ sơ
                        </Button>
                      )}
                      {p.status !== "closed" && (
                        <Button size="sm" variant="danger" loading={busy === p.id} onClick={() => update(p, "closed")}>
                          Đóng đợt
                        </Button>
                      )}
                      <Button size="sm" variant="outline" loading={busy === p.id} onClick={() => setEditing(p)} aria-label={`Sửa đợt ${p.name}`}>
                        <Pencil size={14} /> Sửa
                      </Button>
                      <Button size="sm" variant="danger" loading={busy === p.id} onClick={() => remove(p)} aria-label={`Xóa đợt ${p.name}`}>
                        <Trash2 size={14} /> Xóa
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!periods.length && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state"><p className="text-sm text-secondary">Chưa có đợt xét.</p></div>
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
