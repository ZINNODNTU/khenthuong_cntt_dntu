"use client";

import { Clock } from "lucide-react";

const STATUS_STEPS = [
  { key: "draft", label: "Tạo hồ sơ" },
  { key: "submitted", label: "Đã gửi" },
  { key: "review", label: "Đang xét duyệt" },
  { key: "revision", label: "Bổ sung" },
  { key: "final", label: "Kết quả" },
];

function statusStepIndex(status: string, hadRevision: boolean): number {
  if (status === "draft") return 0;
  if (status === "submitted") return 1;
  if (status === "review") return hadRevision ? 2 : 2;
  if (status === "revision") return 2;
  if (status === "passed" || status === "failed") return 4;
  return 0;
}

export function ApplicationTimeline({
  status, createdAt, submittedAt,
}: {
  status: string; createdAt?: string; submittedAt?: string;
}) {
  const current = statusStepIndex(status, false);
  const dates = [createdAt, submittedAt, undefined, undefined, undefined];

  return (
    <section className="card card-body mb-4">
      <div className="flex items-center gap-2 mb-3 font-semibold text-sm">
        <Clock size={16} /> Tiến trình xét duyệt
      </div>
      <ol className="timeline-list">
        {STATUS_STEPS.map((s, i) => {
          const state = i < current ? "complete" : i === current ? "active" : "pending";
          return (
            <li key={s.key} className={`timeline-item timeline-${state}`}>
              <div className="timeline-dot" aria-hidden />
              <div className="timeline-content">
                <span className="timeline-label">{s.label}</span>
                {dates[i] && <span className="timeline-date">{dates[i]}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
