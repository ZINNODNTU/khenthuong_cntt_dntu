import { formatDate } from "@/lib/utils";

type DecisionEvent = {
  id: string;
  decision: "passed" | "failed" | "revision";
  comment: string | null;
  created_at: string;
};
type CriterionEvent = {
  id: number;
  code: string;
  previous_status: string | null;
  next_status: string;
  reviewer_note: string | null;
  changed_at: string;
};
type ScoreEvent = {
  id: number;
  code: string;
  previous_points: number | null;
  next_points: number | null;
  next_note: string | null;
  changed_at: string;
};
const decisionNames = { passed: "Đạt", failed: "Không đạt", revision: "Yêu cầu bổ sung" };
const criteriaNames: Record<string, string> = { verified: "Đạt", rejected: "Không đạt", pending: "Chờ đánh giá", not_applicable: "Không áp dụng" };

export function ReviewHistory({ decisions, changes, scores = [] }: {
  decisions: DecisionEvent[]; changes: CriterionEvent[]; scores?: ScoreEvent[];
}) {
  const events = [
    ...decisions.map(item => ({ key: `d-${item.id}`, date: item.created_at, label: `Kết luận: ${decisionNames[item.decision]}`, note: item.comment })),
    ...changes.map(item => ({ key: `c-${item.id}`, date: item.changed_at, label: `${item.code}: ${criteriaNames[item.next_status] || item.next_status}`, note: item.reviewer_note })),
    ...scores.map(item => ({ key: `s-${item.id}`, date: item.changed_at,
      label: `${item.code}: ${item.next_points === null ? "Hủy điểm đã nhập" : `Lưu ${item.next_points} điểm`}`,
      note: item.next_note })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

  return (
    <section className="card card-body mb-4" aria-labelledby="review-history-heading">
      <h3 id="review-history-heading">Lịch sử đánh giá và kết luận</h3>
      <p className="text-sm text-secondary">Ghi nhận các thay đổi tiêu chí và kết luận để hội đồng đối chiếu khi cần.</p>
      {!events.length ? <p className="text-sm text-secondary">Chưa có lần thẩm định nào được ghi nhận.</p> : (
        <ol style={{ paddingLeft: "18px", display: "grid", gap: "14px" }}>
          {events.map(event => (
            <li key={event.key}>
              <strong>{event.label}</strong>
              <span className="text-sm text-secondary"> · {formatDate(event.date)}</span>
              {event.note && <p style={{ margin: "4px 0", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{event.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
