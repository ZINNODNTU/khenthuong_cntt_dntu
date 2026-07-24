"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { loginEmailFromInput } from "@/lib/identity";
import { Button } from "@/components/ui/button";

function queryMessage(errorCode: string | null, confirmed: string | null) {
  if (confirmed === "1") {
    return { type: "success" as const, text: "Email đã được xác nhận. Bạn có thể đăng nhập vào hệ thống." };
  }
  if (errorCode === "session") {
    return { type: "error" as const, text: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
  }
  if (errorCode === "inactive") {
    return { type: "error" as const, text: "Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên." };
  }
  if (errorCode === "callback") {
    return { type: "error" as const, text: "Liên kết xác nhận không hợp lệ hoặc đã hết hạn." };
  }
  return null;
}

export function LoginForm({ signupEnabled }: { signupEnabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const params = useSearchParams();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const client = createClient();
    const email = loginEmailFromInput(String(form.get("email")));
    const { error: loginError } = await client.auth.signInWithPassword({
      email,
      password: String(form.get("password")),
    });

    if (loginError) {
      setError(
        loginError.message.toLowerCase().includes("email not confirmed")
          ? "Email chưa được xác nhận. Hãy mở thư xác nhận được gửi từ email của hệ thống."
          : "MSSV, mã đơn vị, email hoặc mật khẩu không đúng."
      );
      setLoading(false);
      return;
    }

    const requested = params.get("next");
    const target = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
    router.replace(target);
    router.refresh();
  }

  const feedback = queryMessage(params.get("error"), params.get("confirmed"));

  return (
    <div className="login-form">
      {error && <div className="notice notice-error">{error}</div>}
      {!error && feedback && (
        <div className={feedback.type === "success" ? "notice notice-success" : "notice notice-error"}>
          {feedback.text}
        </div>
      )}

      <form className="login-form" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="login-email">
            MSSV, mã đơn vị hoặc email
          </label>
          <input
            id="login-email"
            className="input"
            type="text"
            name="email"
            required
            placeholder="Ví dụ: 12345678 hoặc 22DTH1"
            autoComplete="username"
          />
          <span className="field-helper">
            Có thể nhập phần trước @dntu.edu.vn hoặc nhập đầy đủ email.
          </span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="login-password">
            Mật khẩu
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="login-password"
              className="input"
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={6}
              autoComplete="current-password"
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              style={{ position: "absolute", right: 4, top: 4, width: 32, height: 32 }}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <Button variant="primary" loading={loading} style={{ width: "100%" }}>
          {!loading && <LogIn size={16} />}
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>

      {signupEnabled && (
        <div className="login-footer">
          Chưa có tài khoản?{" "}
          <Link href="/register">Đăng ký bằng MSSV</Link>
        </div>
      )}
    </div>
  );
}
