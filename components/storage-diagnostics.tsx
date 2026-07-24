"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Diagnostic = {
  ok: boolean;
  message: string;
  code?: string;
  folderName?: string;
  version?: string;
};

export function StorageDiagnostics({ initial }: { initial: Diagnostic }) {
  const [result, setResult] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    try {
      const response = await fetch("/api/storage/health", { cache: "no-store" });
      const data = (await response.json()) as Diagnostic;
      setResult(data);
    } catch {
      setResult({ ok: false, message: "Không thể gửi yêu cầu kiểm tra từ trình duyệt." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-body" style={{ marginTop: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <div>
          <h3 className="font-semibold" style={{ fontSize: "var(--font-size-lg)" }}>Kho lưu trữ hình ảnh</h3>
          <p className="text-sm text-secondary">Kiểm tra kết nối trước khi tiếp nhận hồ sơ có ảnh.</p>
        </div>
        <Button variant="outline" size="sm" loading={busy} onClick={retry}>Kiểm tra lại</Button>
      </div>

      <div className={`notice ${result.ok ? "notice-success" : "notice-error"}`}>
        <b>{result.ok ? "Kết nối thành công" : "Kết nối thất bại"}</b>
        <div style={{ marginTop: 6 }}>{result.message}</div>
        {result.ok && result.folderName && <div className="text-xs text-secondary" style={{ marginTop: 6 }}>Thư mục: {result.folderName}</div>}
        {!result.ok && result.code && <div className="text-xs text-secondary" style={{ marginTop: 6 }}>Mã kiểm tra: {result.code}</div>}
      </div>
    </section>
  );
}
