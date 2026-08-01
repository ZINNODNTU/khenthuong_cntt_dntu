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
    const currentPassword = String(form.get("currentPassword") || "");
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
      body: JSON.stringify({ currentPassword, password, confirmPassword }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error?.message || "Không thể đổi mật khẩu");
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
        Xác minh mật khẩu hiện tại trước khi thiết lập mật khẩu mới.
      </div>

      <div className="field">
        <label className="field-label" htmlFor="pw-current">Mật khẩu hiện tại *</label>
        <input className="input" id="pw-current" name="currentPassword" type="password" required maxLength={128} autoComplete="current-password" />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="pw-new">Mật khẩu mới *</label>
        <input className="input" id="pw-new" name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" />
        <span className="field-helper">Tối thiểu 12 ký tự. Cho phép passphrase.</span>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="pw-confirm">Xác nhận mật khẩu mới *</label>
        <input className="input" id="pw-confirm" name="confirmPassword" type="password" minLength={12} maxLength={128} required autoComplete="new-password" />
      </div>

      <Button variant="primary" loading={busy} className="w-full">
        {busy ? "Đang xác minh..." : "Đổi mật khẩu"}
      </Button>
    </form>
  );
}
