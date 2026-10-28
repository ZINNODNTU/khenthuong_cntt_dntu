"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function AuditHealthButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [ok, setOk] = useState(false);
  async function verify() {
    if (busy) return;
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch("/api/admin/audit-health", { method: "POST", cache: "no-store" });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Không thể kiểm tra ghi nhật ký.");
      setOk(true);
      setFeedback("Đã ghi một sự kiện kiểm tra. Danh sách bên dưới sẽ hiển thị sự kiện mới.");
      router.refresh();
    } catch (error) {
      setOk(false);
      setFeedback(error instanceof Error ? error.message : "Không thể kết nối máy chủ.");
    } finally { setBusy(false); }
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 15 }}>
      <button type="button" className="btn btn-outline" disabled={busy} onClick={verify}>
        <RefreshCw size={16} aria-hidden="true" /> {busy ? "Đang kiểm tra..." : "Kiểm tra ghi nhật ký"}
      </button>
      {feedback && <span role={ok ? "status" : "alert"} style={{ fontSize: 12, color: ok ? "#177047" : "#ad3026" }}>{feedback}</span>}
    </div>
  );
}
