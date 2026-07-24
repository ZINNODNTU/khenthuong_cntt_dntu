"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RegisterForm({
  branches,
  senderAddress,
}: {
  branches: string[];
  senderAddress: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setSuccess(false);
    const form = new FormData(event.currentTarget);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(form.get("fullName") || "").trim(),
          branchCode: String(form.get("branchCode") || ""),
          studentId: String(form.get("studentId") || "").trim(),
          password: String(form.get("password") || ""),
          confirmPassword: String(form.get("confirmPassword") || ""),
        }),
      });
      const result = (await r.json().catch(() => ({}))) as { error?: string; requiresConfirmation?: boolean; email?: string };
      if (!r.ok) {
        setMessage(result.error || "Không thể tạo tài khoản. Vui lòng thử lại.");
        return;
      }
      setSuccess(true);
      event.currentTarget.reset();
      setMessage(
        result.requiresConfirmation
          ? senderAddress
            ? `Đăng ký thành công. Email xác nhận được gửi từ ${senderAddress}. Hãy kiểm tra Hộp thư đến và Spam.`
            : "Đăng ký thành công. Hãy kiểm tra Hộp thư đến và Spam để xác nhận tài khoản."
          : "Tài khoản đã được tạo. Bạn có thể quay về trang đăng nhập."
      );
    } catch {
      setMessage("Không thể kết nối máy chủ đăng ký. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-form">
      {message && (
        <div className={success ? "notice notice-success" : "notice notice-error"}>
          {message}
        </div>
      )}

      <form className="login-form" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="register-name">Họ và tên</label>
          <input className="input" id="register-name" name="fullName" required minLength={2} maxLength={200} autoComplete="name" />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="register-branch">Chi đoàn</label>
          <select className="select" id="register-branch" name="branchCode" required defaultValue="">
            <option value="" disabled>Chọn Chi đoàn</option>
            {branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="register-student-id">Mã số sinh viên</label>
          <div className="input" style={{ display: "flex", alignItems: "center", padding: 0, overflow: "hidden", height: 40 }}>
            <input
              id="register-student-id"
              name="studentId"
              type="text"
              required
              minLength={5}
              maxLength={20}
              inputMode="numeric"
              autoComplete="username"
              placeholder="Nhập MSSV"
              pattern="[0-9]+"
              style={{ border: "none", outline: "none", flex: 1, height: "100%", padding: "0 var(--space-3)", fontSize: "inherit" }}
            />
            <span style={{ padding: "0 var(--space-3)", background: "var(--color-muted)", color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", height: "100%", display: "flex", alignItems: "center", borderLeft: "1px solid var(--color-border)" }}>
              @dntu.edu.vn
            </span>
          </div>
          <span className="field-helper">Mỗi MSSV chỉ được tạo một tài khoản duy nhất.</span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="register-password">Mật khẩu</label>
          <input className="input" id="register-password" name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" />
          <span className="field-helper">Tối thiểu 10 ký tự, gồm chữ và số.</span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="register-confirm-password">Xác nhận mật khẩu</label>
          <input className="input" id="register-confirm-password" name="confirmPassword" type="password" required minLength={10} maxLength={128} autoComplete="new-password" />
        </div>

        <Button variant="primary" loading={busy} style={{ width: "100%" }}>
          {busy ? "Đang kiểm tra và tạo tài khoản..." : "Tạo tài khoản"}
        </Button>
      </form>

      <div className="login-footer">
        Đã có tài khoản? <Link href="/">Đăng nhập</Link>
      </div>
    </div>
  );
}
