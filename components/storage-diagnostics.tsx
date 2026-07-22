"use client";
import { useState } from "react";
type Diagnostic = {
    ok: boolean;
    message: string;
    code?: string;
    folderName?: string;
    version?: string;
};
export function StorageDiagnostics({ initial }: {
    initial: Diagnostic;
}) {
    const [result, setResult] = useState(initial);
    const [busy, setBusy] = useState(false);
    async function retry() {
        setBusy(true);
        try {
            const response = await fetch("/api/storage/health", { cache: "no-store" });
            const data = (await response.json()) as Diagnostic;
            setResult(data);
        }
        catch {
            setResult({ ok: false, message: "Không thể gửi yêu cầu kiểm tra từ trình duyệt." });
        }
        finally {
            setBusy(false);
        }
    }
    return (<section className="card panel" style={{ marginTop: 16 }}>
      <div className="section-title">
        <div>
          <h3>Kho lưu trữ hình ảnh</h3>
          <p>Kiểm tra kết nối trước khi tiếp nhận hồ sơ có ảnh.</p>
        </div>
        <button type="button" className="btn" disabled={busy} onClick={retry}>
          {busy ? "Đang kiểm tra..." : "Kiểm tra lại"}
        </button>
      </div>
      <div className={`notice ${result.ok ? "success" : "error"}`}>
        <strong>{result.ok ? "Kết nối thành công" : "Kết nối thất bại"}</strong>
        <div style={{ marginTop: 6 }}>{result.message}</div>
        {result.ok && result.folderName && (<div style={{ marginTop: 6, fontSize: 12 }}>Thư mục: {result.folderName}</div>)}
        {!result.ok && result.code && (<div style={{ marginTop: 6, fontSize: 12 }}>Mã kiểm tra: {result.code}</div>)}
      </div>
    </section>);
}

