"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { loginEmailFromInput } from "@/lib/identity";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

function queryMessage(errorCode: string | null, confirmed: string | null) {
  if (confirmed === "1") {
    return { type: "success" as const, text: "Email đã được xác nhận. Bạn có thể đăng nhập." };
  }
  if (errorCode === "session") {
    return { type: "error" as const, text: "Phiên đã hết hạn. Vui lòng đăng nhập lại." };
  }
  if (errorCode === "inactive") {
    return { type: "error" as const, text: "Tài khoản đang bị khóa. Liên hệ quản trị viên." };
  }
  if (errorCode === "callback") {
    return { type: "error" as const, text: "Liên kết xác nhận không hợp lệ hoặc đã hết hạn." };
  }
  return null;
}

function LoginFormInner({ signupEnabled }: { signupEnabled: boolean }) {
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
          ? "Email chưa được xác nhận. Hãy kiểm tra hộp thư."
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
      {(error || feedback) && (
        <div
          className={`alert ${error || feedback?.type === "error" ? "alert-error" : "alert-success"}`}
          role="alert"
        >
          {error || feedback?.text}
        </div>
      )}

      <form onSubmit={submit} noValidate>
        <Field label="MSSV / Mã đơn vị / Email" htmlFor="login-email" required>
          <Input
            id="login-email"
            type="text"
            name="email"
            required
            placeholder="Nhập MSSV, mã Chi đoàn hoặc email"
            autoComplete="username"
          />
        </Field>

        <Field label="Mật khẩu" htmlFor="login-password" required>
          <div className="password-wrap">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={6}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        <Button variant="primary" loading={loading} className="login-submit">
          {!loading && <LogIn size={16} />}
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>

      {signupEnabled && (
        <div className="login-register-link">
          Chưa có tài khoản? <Link href="/register">Đăng ký bằng MSSV</Link>
        </div>
      )}
    </div>
  );
}

export function LoginScreen({ signupEnabled }: { signupEnabled: boolean }) {
  return (
    <main className="login-page">
      <div className="login-bg-shape" aria-hidden="true" />

      <div className="login-container">
        <div className="login-card">
          <div className="login-card-inner">
            <div className="login-head">
              <span className="login-eyebrow">
                <Sparkles size={12} />
                Xét duyệt thành tích
              </span>
              <h1 className="login-title">Đăng nhập</h1>
              <p className="login-desc">
                Sinh viên nhập MSSV. Chi đoàn / CLB nhập mã đơn vị.
              </p>
            </div>

            <Suspense fallback={<div className="text-center text-sm text-secondary">Đang tải...</div>}>
              <LoginFormInner signupEnabled={signupEnabled} />
            </Suspense>
          </div>
        </div>

        <p className="login-footer-text">
          Khoa Công nghệ thông tin — Trường Đại học DNTU
        </p>
      </div>
    </main>
  );
}
