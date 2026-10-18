"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SCORED_CODES, isValidWeights, rubricTitles } from "@/lib/award-scoring";
import type { AwardRubric, ScoredCode } from "@/lib/award-scoring";
import type { EvaluationPeriod } from "@/lib/types";

type Props = { periods: EvaluationPeriod[]; initialRubrics: AwardRubric[]; loadError?: string };

export function RubricManager({ periods, initialRubrics, loadError }: Props) {
  const router = useRouter();
  const [periodId, setPeriodId] = useState(periods[0]?.id || "");
  const [kind, setKind] = useState<"individual" | "collective">("individual");
  const current = useMemo(() => initialRubrics.find(item =>
    item.evaluation_period_id === periodId && item.application_type === kind
  ), [initialRubrics, periodId, kind]);

  const [values, setValues] = useState<Record<ScoredCode, string>>(
    () => Object.fromEntries(SCORED_CODES.map(code => [code, ""])) as Record<ScoredCode,string>
  );
  const [threshold, setThreshold] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setValues(Object.fromEntries(SCORED_CODES.map(code => [
      code, current ? String(current.weights[code]) : "",
    ])) as Record<ScoredCode, string>);
    setThreshold(current ? String(current.min_percentage) : "");
    setInstructions(current?.instructions || "");
    setError("");
    setMessage("");
  }, [current, periodId, kind]);

  const weights = Object.fromEntries(SCORED_CODES.map(code => [code, Number(values[code])])) as Record<ScoredCode,number>;
  const total = SCORED_CODES.reduce((sum, code) => sum + (values[code] === "" ? 0 : Number(values[code])), 0);
  const valid = SCORED_CODES.every(code => values[code].trim() !== "") &&
    isValidWeights(weights) && threshold.trim() !== "" &&
    Number.isFinite(Number(threshold)) && Number(threshold) >= 0 && Number(threshold) <= 100;
  const selectedPeriod = periods.find(p => p.id === periodId);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!valid) {
      setError("Cần nhập đủ sáu trọng số lớn hơn 0, tổng đúng 100 điểm và ngưỡng đạt từ 0 đến 100%.");
      return;
    }
    if (!window.confirm("Lưu biểu điểm này cho đợt xét? Khi đã có điểm chấm hoặc kết luận, biểu điểm sẽ bị khóa.")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/rubrics", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId, applicationType: kind, weights,
          minPercentage: Number(threshold), instructions,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Không thể lưu biểu điểm.");
      setMessage("Đã lưu biểu điểm; thay đổi được ghi trong nhật ký quản trị.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể kết nối máy chủ.");
    } finally { setBusy(false); }
  }

  return (
    <div className="card card-body">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Cấu hình biểu điểm của hội đồng</h2>
        <Link href="/criteria" className="btn btn-outline">Xem khung tiêu chí C1–C9 →</Link>
      </div>
      <p className="text-sm text-secondary">
        Sáu tiêu chí C1–C6 được chấm điểm thực tế theo mức tối đa do quản trị viên thiết lập; C7–C9 là điều kiện bắt buộc với cá nhân.
        Hệ thống không tự chọn trọng số, ngưỡng đạt hoặc kết luận thay hội đồng.
      </p>
      {loadError && <div className="notice notice-error" role="alert">{loadError}</div>}
      <form onSubmit={save}>
        <div className="form-grid">
          <div className="field">
            <label className="field-label" htmlFor="rubric-period">Đợt xét</label>
            <select className="select" id="rubric-period" value={periodId} onChange={e => setPeriodId(e.target.value)} required>
              {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rubric-kind">Loại hồ sơ</label>
            <select className="select" id="rubric-kind" value={kind} onChange={e => setKind(e.target.value as typeof kind)}>
              <option value="individual">Cá nhân</option>
              <option value="collective">Tập thể Chi đoàn / CLB</option>
            </select>
          </div>
        </div>
        {selectedPeriod && <p className="text-sm text-secondary">
          Trạng thái đợt xét: <strong>{selectedPeriod.status}</strong>. {current
            ? "Đã cấu hình biểu điểm. Không thể chỉnh sửa sau khi phát sinh điểm chấm hoặc kết luận."
            : "Chưa có biểu điểm. Hội đồng cần phê duyệt trước khi sử dụng."}
        </p>}
        <div className="form-grid">
          {SCORED_CODES.map(code => <div className="field" key={code}>
            <label className="field-label" htmlFor={`rubric-${code}`}>{code}. {rubricTitles[code]}</label>
            <input className="input" type="number" min="0.01" max="100" step="0.01"
              id={`rubric-${code}`} value={values[code]} placeholder="Nhập số điểm tối đa"
              onChange={e => setValues(old => ({ ...old, [code]: e.target.value }))} required />
          </div>)}
        </div>
        <p className="text-sm"><strong>Tổng biểu điểm: {Number.isFinite(total) ? total.toLocaleString("vi-VN") : "—"} / 100</strong>
          {Math.abs(total - 100) >= 0.001 && " — Cần đúng 100 điểm để lưu."}
        </p>
        <div className="form-grid">
          <div className="field">
            <label className="field-label" htmlFor="rubric-threshold">Ngưỡng điểm tối thiểu để xem xét ĐẠT (%)</label>
            <input className="input" id="rubric-threshold" type="number" min="0" max="100" step="0.01"
              placeholder="Theo quy định được phê duyệt" value={threshold} onChange={e => setThreshold(e.target.value)} required />
          </div>
          <div className="field span-2">
            <label className="field-label" htmlFor="rubric-instructions">Căn cứ / quyết định áp dụng biểu điểm</label>
            <textarea className="textarea" id="rubric-instructions" rows={3} maxLength={3000}
              placeholder="Số văn bản, cách đối chiếu minh chứng, quy tắc không áp dụng..." value={instructions}
              onChange={e => setInstructions(e.target.value)} />
          </div>
        </div>
        <p className="text-sm text-secondary">
          Với tiêu chí được xác nhận “Không áp dụng”, điểm tối đa của tiêu chí đó không tính vào mẫu số;
          tỷ lệ đạt được tính trên những tiêu chí có thể chấm. Quy tắc này cần được hội đồng thống nhất.
        </p>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {message && <div className="notice notice-success" role="status">{message}</div>}
        <button className="btn btn-primary" type="submit" disabled={!valid || busy || !periodId}>
          {busy ? "Đang lưu..." : "Lưu biểu điểm cho đợt xét"}
        </button>
      </form>
    </div>
  );
}
