"use client";

import Link from "next/link";
import { useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { loginEmailFromInput } from "@/lib/identity";

function queryMessage(
  errorCode: string | null,
  confirmed: string | null,
) {
  if (confirmed === "1") {
    return {
      type: "success" as const,
      text:
        "Email đã được xác nhận. Bạn có thể đăng nhập vào hệ thống.",
    };
  }

  if (errorCode === "session") {
    return {
      type: "error" as const,
      text:
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    };
  }

  if (errorCode === "inactive") {
    return {
      type: "error" as const,
      text:
        "Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.",
    };
  }

  if (errorCode === "callback") {
    return {
      type: "error" as const,
      text:
        "Liên kết xác nhận không hợp lệ hoặc đã hết hạn.",
    };
  }

  return null;
}

export function LoginForm({
  signupEnabled,
}: {
  signupEnabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const params = useSearchParams();

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const client = createClient();

    const email = loginEmailFromInput(
      String(form.get("email")),
    );

    const { error: loginError } =
      await client.auth.signInWithPassword({
        email,
        password: String(form.get("password")),
      });

    if (loginError) {
      setError(
        loginError.message
          .toLowerCase()
          .includes("email not confirmed")
          ? "Email chưa được xác nhận. Hãy mở thư xác nhận được gửi từ email của hệ thống."
          : "MSSV, mã đơn vị, email hoặc mật khẩu không đúng.",
      );
      setLoading(false);
      return;
    }

    const requested = params.get("next");

    const target =
      requested?.startsWith("/") &&
      !requested.startsWith("//")
        ? requested
        : "/";

    router.replace(target);
    router.refresh();
  }

  const feedback = queryMessage(
    params.get("error"),
    params.get("confirmed"),
  );

  return (
    <div className="stack">
      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      {!error && feedback && (
        <div
          className={
            feedback.type === "success"
              ? "notice success"
              : "notice error"
          }
        >
          {feedback.text}
        </div>
      )}

      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label htmlFor="login-email">
            MSSV, mã đơn vị hoặc email
          </label>

          <input
            id="login-email"
            type="text"
            name="email"
            required
            placeholder="Ví dụ: 12345678 hoặc 22DTH1"
            autoComplete="username"
          />

          <small>
            Có thể nhập phần trước @dntu.edu.vn hoặc nhập đầy đủ email.
          </small>
        </div>

        <div className="field">
          <label htmlFor="login-password">
            Mật khẩu
          </label>

          <input
            id="login-password"
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete="current-password"
          />
        </div>

        <button
          className="btn primary auth-submit"
          disabled={loading}
        >
          {loading
            ? "Đang đăng nhập..."
            : "Đăng nhập"}
        </button>
      </form>

      {signupEnabled && (
        <div className="auth-switch">
          Chưa có tài khoản?{" "}
          <Link href="/register">
            Đăng ký bằng MSSV
          </Link>
        </div>
      )}
    </div>
  );
}
