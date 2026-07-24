"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (password !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp.");
      setBusy(false);
      return;
    }
    const response = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Không thể đổi mật khẩu");
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={submit}>
      {message && <div className="notice notice-error">{message}</div>}

      <div className="notice notice-info">
        Đây là lần đăng nhập đầu tiên hoặc mật khẩu vừa được quản trị viên đặt lại. Hãy tạo mật khẩu riêng trước khi sử dụng hệ thống.
      </div>

      <div className="field">
        <label className="field-label" htmlFor="pw-new">Mật khẩu mới *</label>
        <input className="input" id="pw-new" name="password" type="password" minLength={10} required autoComplete="new-password" />
        <span className="field-helper">Tối thiểu 10 ký tự, có chữ và số; không dùng lại mật khẩu mặc định 123456.</span>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="pw-confirm">Xác nhận mật khẩu mới *</label>
        <input className="input" id="pw-confirm" name="confirmPassword" type="password" minLength={10} required autoComplete="new-password" />
      </div>

      <Button variant="primary" loading={busy} style={{ width: "100%" }}>
        {busy ? "Đang cập nhật..." : "Đổi mật khẩu"}
      </Button>
    </form>
  );
}
