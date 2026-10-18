"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleHelp, CircleX, ClipboardCheck, LockKeyhole, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CRITERION_CODES, validateCriteria } from "@/lib/criteria-rules";
import { criterionCategory, validateCriterionEvidence } from "@/lib/criterion-evidence";
import { displayCriterionMessage, getApplicationCriterionCodes, getCriterionDefinition, getCriterionDisplayCode } from "@/lib/award-criteria-scope";
import type { ApplicationCriterion, CriterionCode, CriterionStatus, Evidence, UserRole } from "@/lib/types";
import "./review-scorecard.css";
import "./review-scorecard-enhancements.css";

export type ReviewPanelProps = {
  applicationId: string;
  applicationType: "individual" | "collective";
  applicationStatus: string;
  reviewerId: string | null;
  currentUserId: string;
  currentUserRole: UserRole;
  initialComment: string;
  criteria?: ApplicationCriterion[];
  evidences?: Evidence[];
  rubric?: unknown;
  scores?: unknown;
  onInspectEvidence?: (id: string) => void;
};

export function ReviewPanel({
  applicationId, applicationType, applicationStatus, reviewerId,
  currentUserId, currentUserRole, initialComment, criteria = [], evidences = [], onInspectEvidence,
}: ReviewPanelProps) {
  const router = useRouter();
  const [comment, setComment] = useState(initialComment);
  const [criterionFilter, setCriterionFilter] = useState<"all" | "pending" | "verified" | "rejected">("all");
  const [notes, setNotes] = useState<Record<string, string>>(
    () => Object.fromEntries(criteria.map(row => [row.code, row.reviewer_note || ""])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const active = ["submitted", "review"].includes(applicationStatus);
  const isAdmin = currentUserRole === "admin";
  const mine = reviewerId === currentUserId;
  const canReview = active && (isAdmin || mine);
  const canClaim = active && (!reviewerId || (isAdmin && !mine));
  const canRelease = active && mine;
  const applicableCodes = [...getApplicationCriterionCodes(applicationType, criteria.map(row => row.code))];
  const ordered = useMemo(() => [...criteria].filter(row => applicableCodes.includes(row.code))
    .sort((a, b) => applicableCodes.indexOf(a.code) - applicableCodes.indexOf(b.code)), [criteria, applicableCodes.join(",")]);
  const issues = useMemo(() => [
    ...validateCriteria(criteria, applicationType, "pass"),
    ...validateCriterionEvidence(evidences.map(item => item.category), applicationType, criteria.map(row => row.code)),
  ], [criteria, applicationType, evidences]);
  const canPass = canReview && issues.length === 0;
  const resolved = ordered.filter(row => ["verified", "rejected"].includes(row.status)).length;
  const filteredCriteria = criterionFilter === "all" ? ordered : ordered.filter(row => row.status === criterionFilter);
  const filterOptions = [
    { key: "all", text: "Tất cả", count: ordered.length },
    { key: "pending", text: "Chưa xét", count: ordered.filter(row => row.status === "pending").length },
    { key: "verified", text: "Đạt", count: ordered.filter(row => row.status === "verified").length },
    { key: "rejected", text: "Không đạt", count: ordered.filter(row => row.status === "rejected").length },
  ] as const;

  async function post(url: string, payload: object): Promise<boolean> {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(url, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Không thể lưu thao tác.");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể kết nối máy chủ.");
      return false;
    } finally { setBusy(false); }
  }

  async function assignment(action: "claim" | "release") {
    if (action === "release" && !window.confirm("Trả hồ sơ về hàng đợi?")) return;
    if (await post(`/api/applications/${applicationId}/assignment`, { action })) {
      setMessage(action === "claim" ? "Đã nhận phụ trách hồ sơ." : "Đã trả hồ sơ về hàng đợi.");
      router.refresh();
    }
  }

  async function verify(code: CriterionCode, status: Extract<CriterionStatus, "pending" | "verified" | "rejected">) {
    const reviewerNote = (notes[code] || "").trim();
    if (status === "rejected" && reviewerNote.length < 5) {
      setError(`${code}: Cần ghi lý do Không đạt (ít nhất 5 ký tự).`);
      return;
    }
    if (await post(`/api/applications/${applicationId}/criteria`, { code, status, reviewerNote })) {
      setMessage(`Đã lưu kết quả tiêu chí ${code}.`);
      router.refresh();
    }
  }

  async function decide(status: "passed" | "failed" | "revision") {
    if (status !== "passed" && comment.trim().length < 5) {
      setError("Hãy nêu rõ lý do (ít nhất 5 ký tự).");
      return;
    }
    if (!window.confirm(`Xác nhận ${status === "passed" ? "ĐẠT" : status === "failed" ? "KHÔNG ĐẠT" : "YÊU CẦU BỔ SUNG"} cho hồ sơ?`)) return;
    if (await post(`/api/applications/${applicationId}/decision`, { status, comment: comment.trim() })) {
      router.push("/review"); router.refresh();
    }
  }

  return (
    <aside className="review-sidebar scorecard">
      <section className="card scorecard-summary">
        <div className="scorecard-eyebrow"><ClipboardCheck size={17} /> XÉT MINH CHỨNG</div>
        <h2>Đánh giá Đạt / Không đạt</h2>
        <p className="scorecard-intro">Đối chiếu từng minh chứng trên Google Drive. Không chấm điểm, không xếp hạng theo thang điểm.</p>
        <div className="scorecard-metrics">
          <div><strong>{resolved}/{applicableCodes.length}</strong><span>Đã đánh giá</span></div>
          <div><strong>{ordered.filter(row => row.status === "verified").length}</strong><span>Đạt</span></div>
          <div><strong>{ordered.filter(row => row.status === "rejected").length}</strong><span>Không đạt</span></div>
        </div>
        <div className="scorecard-progress" role="progressbar" aria-valuemin={0} aria-valuemax={applicableCodes.length}
          aria-valuenow={resolved} aria-label="Tiến độ xét duyệt">
          <span style={{ width: `${resolved / applicableCodes.length * 100}%` }} />
        </div>
        <div id="review-assignment" className="scorecard-assignment">
          {canReview ? <p><UserRoundCheck size={17} /> Bạn có quyền xét hồ sơ này</p>
            : <p><LockKeyhole size={17} /> {active ? "Cần nhận phụ trách hồ sơ." : "Hồ sơ không còn trong trạng thái xét duyệt."}</p>}
          <div className="scorecard-assignment-actions">
            {canClaim && <Button variant="primary" loading={busy} onClick={() => assignment("claim")}>Nhận phụ trách</Button>}
            {canRelease && <Button variant="outline" loading={busy} onClick={() => assignment("release")}>Trả hồ sơ</Button>}
          </div>
        </div>
      </section>

      {error && <div className="notice notice-error" role="alert">{displayCriterionMessage(applicationType, error, Object.fromEntries(criteria.map(row => [row.code, row.title])))}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}

      <section className="card scorecard-criteria">
        <div className="scorecard-section-head"><h3>Kiểm tra minh chứng</h3><span>{resolved}/{applicableCodes.length} tiêu chí</span></div>
        <div className="scorecard-filter-tabs" role="group" aria-label="Lọc tiêu chí theo kết quả">
          {filterOptions.map(option => <button key={option.key} type="button"
            className={criterionFilter === option.key ? "is-active" : ""}
            aria-pressed={criterionFilter === option.key}
            onClick={() => setCriterionFilter(option.key)}>
            {option.text} <span>{option.count}</span>
          </button>)}
        </div>
        {!filteredCriteria.length && <div className="scorecard-filter-empty" role="status">Không có tiêu chí ở trạng thái đã chọn.</div>}
        {filteredCriteria.map(row => {
          const items = evidences.filter(item => item.category === criterionCategory(row.code));
          return <div key={row.code} className={`scorecard-criterion scorecard-criterion--${row.status}`}>
            <div className="scorecard-criterion-top">
              <span className="scorecard-code">{getCriterionDisplayCode(applicationType, row.code, row.title)}</span>
              <span className={`scorecard-status scorecard-status--${row.status}`}>
                {row.status === "verified" ? <CheckCircle2 size={14} /> : row.status === "rejected" ? <CircleX size={14} /> : <CircleHelp size={14} />}
                {row.status === "verified" ? "Đạt" : row.status === "rejected" ? "Không đạt" : "Chưa đánh giá"}
              </span>
            </div>
            <h4>{row.title || getCriterionDefinition(applicationType, row.code).title}</h4>
            <p className="text-sm text-secondary">{items.length} minh chứng đã nộp</p>
            {items.length ? <ul className="flex flex-col gap-2">
              {items.map(item => <li key={item.id}>
                {onInspectEvidence && <button className="scorecard-preview-button" type="button" disabled={!isAdmin && !mine} onClick={() => onInspectEvidence(item.id)}>Xem trước</button>}
                {(isAdmin || mine) && <a href={`/api/evidence/${item.id}`} target="_blank" rel="noopener noreferrer">
                  {item.file_name} ({Math.ceil(item.size_bytes / 1024)} KB) ↗
                </a>}
              </li>)}
            </ul> : <p className="scorecard-warning">Chưa có minh chứng cho tiêu chí này.</p>}
            <label className="field-label" htmlFor={`note-${row.code}`}>Nhận xét (bắt buộc khi Không đạt)</label>
            <textarea className="textarea scorecard-note" id={`note-${row.code}`} rows={2} maxLength={3000}
              value={notes[row.code] || ""} disabled={!canReview || busy}
              onChange={event => setNotes(current => ({ ...current, [row.code]: event.target.value }))}
              placeholder="Ghi rõ minh chứng không hợp lệ hoặc nội dung cần bổ sung..." />
            <div className="scorecard-criterion-actions">
              <Button variant="outline" size="sm" disabled={!canReview || busy || items.length === 0}
                onClick={() => verify(row.code, "verified")}><CheckCircle2 size={15} /> Đạt</Button>
              <Button variant="outline" size="sm" disabled={!canReview || busy}
                onClick={() => verify(row.code, "rejected")}><CircleX size={15} /> Không đạt</Button>
              {row.status !== "pending" && <Button variant="ghost" size="sm" disabled={!canReview || busy}
                onClick={() => verify(row.code, "pending")}>Bỏ đánh giá</Button>}
            </div>
          </div>;
        })}
      </section>

      <section className="card scorecard-decision">
        <h3>Kết luận hồ sơ</h3>
        {canPass ? <div className="scorecard-success"><CheckCircle2 size={18} /> Tất cả tiêu chí áp dụng đã được đánh giá Đạt.</div>
          : <div className="scorecard-checklist"><b>Chưa đủ điều kiện kết luận Đạt</b>
            {issues.slice(0, 6).map((issue, index) => <p key={index}>• {displayCriterionMessage(applicationType, issue, Object.fromEntries(criteria.map(row => [row.code, row.title])))}</p>)}
          </div>}
        <div className="field mb-3">
          <label className="field-label" htmlFor="review-comment">Nhận xét hội đồng</label>
          <textarea id="review-comment" className="textarea" rows={3} maxLength={5000}
            value={comment} onChange={event => setComment(event.target.value)}
            disabled={!canReview || busy} />
        </div>
        <div className="scorecard-decision-actions">
          <Button variant="primary" disabled={!canPass || busy} onClick={() => decide("passed")}>Kết luận ĐẠT</Button>
          <Button variant="outline" disabled={!canReview || busy} onClick={() => decide("revision")}>Yêu cầu bổ sung</Button>
          <Button variant="danger" disabled={!canReview || busy} onClick={() => decide("failed")}>Kết luận KHÔNG ĐẠT</Button>
        </div>
        <p className="scorecard-footer">Hệ thống lưu trạng thái từng tiêu chí và lịch sử kết luận; không sử dụng điểm số.</p>
      </section>
    </aside>
  );
}
