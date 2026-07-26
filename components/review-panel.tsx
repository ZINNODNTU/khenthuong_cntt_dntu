"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function ReviewPanel({
  applicationId,
  initialComment,
}: {
  applicationId: string;
  initialComment: string;
}) {
  const [comment, setComment] = useState(initialComment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function decide(status: "passed" | "failed" | "revision") {
    setBusy(true);
    setError("");
    const r = await fetch(`/api/applications/${applicationId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, comment }),
    });
    const data = await r.json();
    if (!r.ok) {
      setError(data.error || "Không thể lưu kết luận");
      setBusy(false);
      return;
    }
    router.refresh();
    router.push("/review");
  }

  return (
    <aside className="review-sidebar">
      <div className="card decision-section">
        <h3>Kết luận xét duyệt</h3>
        <p>Không chấm điểm. Chọn một kết quả và ghi nhận xét cụ thể.</p>

        {error && <div className="notice notice-error mb-3">{error}</div>}

        <div className="field mb-3">
          <label className="field-label" htmlFor="review-comment">Nhận xét của hội đồng</label>
          <textarea
            id="review-comment"
            className="textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Nêu lý do hoặc nội dung cần bổ sung..."
          />
        </div>

        <div className="decision-buttons">
          <Button
            variant="primary"
            className="btn-passed"
            loading={busy}
            onClick={() => decide("passed")}
          >
            ✓ ĐẠT
          </Button>
          <Button
            variant="outline"
            className="btn-revision"
            loading={busy}
            onClick={() => decide("revision")}
          >
            ! YÊU CẦU BỔ SUNG
          </Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={() => decide("failed")}
          >
            × KHÔNG ĐẠT
          </Button>
        </div>
      </div>
    </aside>
  );
}
