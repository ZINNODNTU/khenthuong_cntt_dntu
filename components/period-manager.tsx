"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EvaluationPeriod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/input";
import { Trash2, Pencil } from "lucide-react";
import {
  formatDateOnly, formatVietnamDatetime, isoToVietnamInput,
  validDateOnly, vietnamInputToIso,
} from "@/lib/period-dates";

type EvidenceRange = { start: string; end: string };

function validRange(start: string, end: string): boolean {
  return validDateOnly(start) && validDateOnly(end) && end >= start;
}

async function readResponse(response: Response): Promise<{ period?: EvaluationPeriod; error?: string }> {
  return response.json().catch(() => ({ error: "Máy chủ trả về dữ liệu không hợp lệ." }));
}

export function PeriodManager({ periods }: { periods: EvaluationPeriod[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState<EvaluationPeriod | null>(null);
  const [formRevision, setFormRevision] = useState(0);
  const [currentPeriods, setCurrentPeriods] = useState(periods);
  const [evidenceRanges, setEvidenceRanges] = useState<Record<string, EvidenceRange>>({});

  // Keep the list in sync with fresh Server Component data after router.refresh(),
  // while also showing a successful save immediately (without stale form values).
  useEffect(() => setCurrentPeriods(periods), [periods]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    // React's currentTarget is cleared after the first await. Capture the
    // element now or form.reset() will throw and the edit view stays stale.
    const form = event.currentTarget;
    const fields = new FormData(form);
    const evidenceStartsOn = String(fields.get("evidenceStartsOn") || "");
    const evidenceEndsOn = String(fields.get("evidenceEndsOn") || "");
    if (!validRange(evidenceStartsOn, evidenceEndsOn)) {
      setMessage("Ngày minh chứng phải hợp lệ và ngày đến không được trước ngày từ.");
      return;
    }

    let startsAt: string;
    let endsAt: string;
    try {
      // The portal operates in Vietnam: convert civil time (UTC+07) to
      // UTC explicitly; do not depend on the machine/browser timezone.
      startsAt = vietnamInputToIso(String(fields.get("startsAt") || ""));
      endsAt = vietnamInputToIso(String(fields.get("endsAt") || ""));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ngày giờ không hợp lệ.");
      return;
    }
    if (endsAt <= startsAt) {
      setMessage("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }

    const currentEditing = editing;
    const payload = {
      ...(currentEditing ? { id: currentEditing.id } : {}),
      name: String(fields.get("name") || "").trim(),
      description: String(fields.get("description") || "").trim(),
      startsAt,
      endsAt,
      evidenceStartsOn,
      evidenceEndsOn,
      status: fields.get("status"),
      allowIndividual: fields.get("allowIndividual") === "on",
      allowBranchCollective: false,
      allowClubCollective: false,
    };
    const busyKey = currentEditing?.id || "new";
    setBusy(busyKey);
    setMessage("");

    try {
      const response = await fetch("/api/admin/periods", {
        method: currentEditing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readResponse(response);
      if (!response.ok || !result.period) {
        setMessage(result.error || "Không thể lưu đợt xét. Vui lòng thử lại.");
        return;
      }

      const saved = result.period;
      setCurrentPeriods((all) => currentEditing
        ? all.map((p) => p.id === saved.id ? saved : p)
        : [saved, ...all]);
      setEvidenceRanges((ranges) => {
        const next = { ...ranges };
        delete next[saved.id];
        return next;
      });
      form.reset();
      setEditing(null);
      setFormRevision((n) => n + 1);
      setMessage(currentEditing ? "Đã lưu đầy đủ ngày giờ và thông tin đợt xét." : "Đã tạo đợt xét thành tích.");
      router.refresh();
    } catch {
      setMessage("Không kết nối được máy chủ. Vui lòng thử lưu lại.");
    } finally {
      setBusy("");
    }
  }

  async function update(p: EvaluationPeriod, status: EvaluationPeriod["status"], range?: EvidenceRange) {
    if (busy) return;
    const evidenceStartsOn = range?.start ?? p.evidence_starts_on;
    const evidenceEndsOn = range?.end ?? p.evidence_ends_on;
    if (!validRange(evidenceStartsOn, evidenceEndsOn)) {
      setMessage("Ngày minh chứng không hợp lệ: ngày đến phải bằng hoặc sau ngày từ.");
      return;
    }

    setBusy(p.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/periods", {
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
          allowBranchCollective: false,
          allowClubCollective: false,
        }),
      });
      const result = await readResponse(response);
      if (!response.ok || !result.period) {
        setMessage(result.error || "Không thể cập nhật đợt xét.");
        return;
      }

      const saved = result.period;
      setCurrentPeriods((all) => all.map((item) => item.id === saved.id ? saved : item));
      if (range) {
        setEvidenceRanges((ranges) => {
          const next = { ...ranges };
          delete next[saved.id];
          return next;
        });
      }
      // An open edit form must not retain an older date while the table shows
      // the saved date: remount inputs from the newly returned DB row.
      if (editing?.id === saved.id) {
        setEditing(saved);
        setFormRevision((n) => n + 1);
      }
      setMessage(range ? "Đã lưu ngày minh chứng và đồng bộ biểu mẫu." : "Đã cập nhật trạng thái đợt xét.");
      router.refresh();
    } catch {
      setMessage("Không kết nối được máy chủ. Vui lòng thử lại.");
    } finally {
      setBusy("");
    }
  }

  async function remove(p: EvaluationPeriod) {
    const ok = window.confirm(`Xóa vĩnh viễn đợt xét “${p.name}”?\n\nHành động này không thể hoàn tác.`);
    if (!ok || busy) return;
    setBusy(p.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/periods", {
        method: "DELETE", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: p.id, confirmationName: p.name }),
      });
      const result = await readResponse(response);
      if (!response.ok) {
        setMessage(result.error || "Không thể xóa đợt xét.");
        return;
      }
      setCurrentPeriods((all) => all.filter((item) => item.id !== p.id));
      setEvidenceRanges((ranges) => {
        const next = { ...ranges };
        delete next[p.id];
        return next;
      });
      if (editing?.id === p.id) setEditing(null);
      setMessage("Đã xóa đợt xét.");
      router.refresh();
    } catch {
      setMessage("Không kết nối được máy chủ. Vui lòng thử lại.");
    } finally {
      setBusy("");
    }
  }

  const formKey = editing ? `edit-${editing.id}-${formRevision}` : `new-${formRevision}`;

  return (
    <>
      {message && <div role="status" className={`notice ${message.startsWith("Đã") ? "notice-success" : "notice-error"} mb-4`}>{message}</div>}

      <form className="card card-body mb-4" onSubmit={submit} key={formKey}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{editing ? "Chỉnh sửa đợt xét" : "Tạo đợt xét thành tích"}</h3>
            <p className="text-sm text-secondary">{editing ? "Cập nhật ngày giờ theo múi giờ Việt Nam (GMT+7)." : "Quy định thời gian tiếp nhận hồ sơ khen thưởng cá nhân (GMT+7)."}</p>
          </div>
          {editing && (
            <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(null)}>Hủy chỉnh sửa</Button>
          )}
        </div>

        <div className="form-grid">
          <div className="field">
            <label className="field-label" htmlFor="period-name">Tên đợt xét *</label>
            <input className="input" id="period-name" name="name" required placeholder="Ví dụ: Xét thành tích năm học 2026–2027" defaultValue={editing?.name || ""} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="period-status">Trạng thái {editing ? "" : "ban đầu"}</label>
            <select className="select" id="period-status" name="status" defaultValue={editing?.status || "draft"}>
              <option value="draft">Bản nháp</option>
              <option value="open">Đang nhận hồ sơ</option>
              <option value="closed">Đã đóng</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="period-start">Bắt đầu * (GMT+7)</label>
            <input className="input" id="period-start" name="startsAt" type="datetime-local" required defaultValue={editing ? isoToVietnamInput(editing.starts_at) : ""} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="period-end">Kết thúc * (GMT+7)</label>
            <input className="input" id="period-end" name="endsAt" type="datetime-local" required defaultValue={editing ? isoToVietnamInput(editing.ends_at) : ""} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="period-evidence-start">Minh chứng từ ngày *</label>
            <input className="input" id="period-evidence-start" name="evidenceStartsOn" type="date" required defaultValue={editing?.evidence_starts_on || ""} />
            <span className="field-helper">Ngày hoạt động hoặc ngày cấp sớm nhất được chấp nhận.</span>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="period-evidence-end">Minh chứng đến ngày *</label>
            <input className="input" id="period-evidence-end" name="evidenceEndsOn" type="date" required defaultValue={editing?.evidence_ends_on || ""} />
            <span className="field-helper">Ngày hoạt động hoặc ngày cấp muộn nhất được chấp nhận.</span>
          </div>
          <div className="field span-2">
            <label className="field-label" htmlFor="period-description">Mô tả</label>
            <textarea className="textarea" id="period-description" name="description" defaultValue={editing?.description || ""} />
          </div>
          <div className="field span-2">
            <label className="field-label">Phạm vi xét khen thưởng</label>
            <div className="flex gap-3 flex-wrap mt-2">
              <Checkbox id="allowIndividual" name="allowIndividual" defaultChecked={editing?.allow_individual ?? true} label="Chỉ hồ sơ cá nhân Đoàn – Hội" />

            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="primary" loading={busy === (editing?.id || "new")}>
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
                <th>Thời gian (GMT+7)</th>
                <th>Loại hồ sơ</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {currentPeriods.map((p) => {
                const inputRange = evidenceRanges[p.id];
                const changed = !!inputRange && (
                  inputRange.start !== p.evidence_starts_on ||
                  inputRange.end !== p.evidence_ends_on
                );
                return (
                  <tr key={p.id}>
                    <td data-label="Đợt xét">
                      <b>{p.name}</b>
                      <br />
                      <span className="text-xs text-secondary">{p.description || "—"}</span>
                    </td>
                    <td data-label="Thời gian" className="text-sm">
                      {formatVietnamDatetime(p.starts_at)}
                      <br />
                      đến {formatVietnamDatetime(p.ends_at)}
                      <br />
                      <div className="period-evidence-editor">
                        <label htmlFor={`period-evidence-row-start-${p.id}`}>Từ
                          <input id={`period-evidence-row-start-${p.id}`} className="input" type="date"
                            value={inputRange?.start ?? p.evidence_starts_on}
                            onChange={(e) => setEvidenceRanges((ranges) => ({
                              ...ranges, [p.id]: { start: e.target.value, end: ranges[p.id]?.end ?? p.evidence_ends_on },
                            }))} />
                        </label>
                        <label htmlFor={`period-evidence-row-end-${p.id}`}>Đến
                          <input id={`period-evidence-row-end-${p.id}`} className="input" type="date"
                            value={inputRange?.end ?? p.evidence_ends_on}
                            onChange={(e) => setEvidenceRanges((ranges) => ({
                              ...ranges, [p.id]: { start: ranges[p.id]?.start ?? p.evidence_starts_on, end: e.target.value },
                            }))} />
                        </label>
                        <span className="text-xs text-secondary">Đã lưu: {formatDateOnly(p.evidence_starts_on)} – {formatDateOnly(p.evidence_ends_on)}</span>
                        {changed && <span className="text-xs" style={{ color: "var(--color-warning-text, #c4770a)" }}>Có thay đổi chưa lưu</span>}
                        <Button type="button" size="sm" variant="outline" disabled={!changed}
                          loading={busy === p.id} onClick={() => update(p, p.status, inputRange)}>
                          Lưu ngày minh chứng
                        </Button>
                      </div>
                    </td>
                    <td data-label="Loại hồ sơ" className="text-sm text-secondary">
                      Cá nhân
                    </td>
                    <td data-label="Trạng thái">
                      <span className={`badge ${p.status === "open" ? "badge-green" : p.status === "closed" ? "badge-red" : "badge-gray"}`}>
                        {p.status === "open" ? "Đang nhận" : p.status === "closed" ? "Đã đóng" : "Bản nháp"}
                      </span>
                    </td>
                    <td data-label="Thao tác">
                      <div className="flex gap-2">
                        {p.status !== "open" && (
                          <Button type="button" size="sm" variant="primary" loading={busy === p.id} onClick={() => update(p, "open")}>
                            Mở nhận hồ sơ
                          </Button>
                        )}
                        {p.status !== "closed" && (
                          <Button type="button" size="sm" variant="danger" loading={busy === p.id} onClick={() => update(p, "closed")}>
                            Đóng đợt
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="outline" loading={busy === p.id}
                          onClick={() => { setEditing(p); setFormRevision((n) => n + 1); }}
                          aria-label={`Sửa đợt ${p.name}`}>
                          <Pencil size={14} /> Sửa
                        </Button>
                        <Button type="button" size="sm" variant="danger" loading={busy === p.id}
                          onClick={() => remove(p)} aria-label={`Xóa đợt ${p.name}`}>
                          <Trash2 size={14} /> Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!currentPeriods.length && (
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
