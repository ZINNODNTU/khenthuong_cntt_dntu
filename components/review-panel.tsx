"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ReviewPanel({ applicationId, initialComment }: {
    applicationId: string;
    initialComment: string;
}) {
    const [comment, setComment] = useState(initialComment), [busy, setBusy] = useState(false), [error, setError] = useState("");
    const router = useRouter();
    async function decide(status: "passed" | "failed" | "revision") {
        setBusy(true);
        setError("");
        const r = await fetch(`/api/applications/${applicationId}/decision`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, comment }) });
        const data = await r.json();
        if (!r.ok) {
            setError(data.error || "Không thể lưu kết luận");
            setBusy(false);
            return;
        }
        router.refresh();
        router.push("/review");
    }
    return <aside className="review-side"><div className="card decision-card"><h3>Kết luận xét duyệt</h3><p>Không chấm điểm. Chọn một kết quả và ghi nhận xét cụ thể.</p>{error && <div className="notice error">{error}</div>}<div className="field"><label>Nhận xét của hội đồng</label><textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Nêu lý do hoặc nội dung cần bổ sung..."/></div><div className="decision-list" style={{ marginTop: 12 }}><button className="decision-btn pass" disabled={busy} onClick={() => decide("passed")}>✓ ĐẠT</button><button className="decision-btn revision" disabled={busy} onClick={() => decide("revision")}>! YÊU CẦU BỔ SUNG</button><button className="decision-btn fail" disabled={busy} onClick={() => decide("failed")}>× KHÔNG ĐẠT</button></div></div></aside>;
}

