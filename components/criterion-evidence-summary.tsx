import { getApplicationCriterionCodes, getCriterionDefinition, getCriterionDisplayCode } from "@/lib/award-criteria-scope";
import { criterionCategory } from "@/lib/criterion-evidence";
import type { Application } from "@/lib/types";
import styles from "./criterion-evidence-summary.module.css";

export function CriterionEvidenceSummary({ app }: { app: Application }) {
  const allowedCodes = getApplicationCriterionCodes(app.application_type, app.criteria?.map(row => row.code));
  const criteria = (app.criteria || []).filter(row => allowedCodes.includes(row.code));
  return <section className="card card-body mb-4">
    <div className="activity-section-heading">
      <h4>Thông tin và minh chứng theo tiêu chí</h4>
      <span className="activity-section-count">Đạt / Không đạt</span>
    </div>
    <div className="table-wrap table-responsive-card">
      <table className="table activity-table">
        <thead><tr><th>Tiêu chí</th><th>Thông tin kê khai và tệp đính kèm</th><th>Kết quả</th><th>Nhận xét</th></tr></thead>
        <tbody>{criteria.map(row => {
          const evidence = (app.evidences || []).filter(item => item.category === criterionCategory(row.code));
          const entries = (app.evidence_entries || []).filter(item => item.criterion_code === row.code);
          const legacy = evidence.filter(file => !file.evidence_entry_id || !entries.some(item => item.id === file.evidence_entry_id));
          const definition = getCriterionDefinition(app.application_type, row.code, row.title);
          const title = app.application_type === "collective" && row.title !== definition.title ? row.title : definition.shortTitle;
          const displayCode = getCriterionDisplayCode(app.application_type, row.code, row.title);
          return <tr key={row.code}>
            <td><strong>{displayCode}</strong> · {title}</td>
            <td data-label="Thông tin minh chứng">
              {entries.length > 0 && <div className={styles.entryList}>
                {entries.map((entry, index) => {
                  const attachments = evidence.filter(file => file.evidence_entry_id === entry.id);
                  return <div key={entry.id} className={styles.entry}>
                    <strong>{index + 1}. {entry.title}</strong>
                    {entry.description && <p>{entry.description}</p>}
                    {attachments.length > 0 ? <ul className={styles.files}>
                      {attachments.map(file => <li key={file.id}>
                        <a href={"/api/evidence/" + file.id} target="_blank" rel="noopener noreferrer">{file.file_name} ↗</a>
                      </li>)}
                    </ul> : <small>Chưa đính kèm tệp.</small>}
                  </div>;
                })}
              </div>}
              {legacy.length > 0 && <div className={styles.legacy}>
                {entries.length > 0 && <strong>Tệp nộp từ trước</strong>}
                <ul className={styles.files}>{legacy.map(file => <li key={file.id}>
                  <a href={"/api/evidence/" + file.id} target="_blank" rel="noopener noreferrer">{file.file_name} ↗</a>
                </li>)}</ul>
              </div>}
              {!entries.length && !legacy.length && <span>Chưa có minh chứng</span>}
            </td>
            <td data-label="Kết quả">{row.status === "verified" ? "Đạt" : row.status === "rejected" ? "Không đạt" : "Chưa đánh giá"}</td>
            <td data-label="Nhận xét">{row.reviewer_note || "—"}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}
