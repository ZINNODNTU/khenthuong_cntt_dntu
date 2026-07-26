"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Sparkles, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { loginEmailFromInput } from "@/lib/identity";
import { Button } from "@/components/ui/button";

function queryMessage(errorCode: string | null, confirmed: string | null) {
  if (confirmed === "1") return { type: "success" as const, text: "Email đã được xác nhận. Bạn có thể đăng nhập." };
  if (errorCode === "session") return { type: "error" as const, text: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
  if (errorCode === "inactive") return { type: "error" as const, text: "Tài khoản đang bị khóa." };
  if (errorCode === "callback") return { type: "error" as const, text: "Liên kết xác nhận không hợp lệ." };
  return null;
}

export function LoginVariantB({ signupEnabled }: { signupEnabled: boolean }) {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useSearchParams();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const client = createClient();
    const email = loginEmailFromInput(String(form.get("email")));
    const { error: loginError } = await client.auth.signInWithPassword({
      email,
      password: String(form.get("password")),
    });
    if (loginError) {
      setError(
        loginError.message.toLowerCase().includes("email not confirmed")
          ? "Email chưa được xác nhận."
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
    <div className="login-variant-b">
      <div className="varB-bg">
        <div className="varB-blob varB-blob-1" />
        <div className="varB-blob varB-blob-2" />
        <div className="varB-blob varB-blob-3" />
        <div className="varB-grid" />
      </div>

      <div className="varB-card">
        <div className="varB-badge">
          <Sparkles size={14} />
          <span>Xét duyệt thành tích</span>
        </div>

        <div className="varB-logo-row">
          <div className="varB-logo-icon">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><rect width="36" height="36" rx="10" fill="#2563EB"/><text x="18" y="23" textAnchor="middle" fill="white" fontSize="18" fontWeight="700">V</text></svg>
          </div>
          <div>
            <span className="varB-logo-text">CNTT DNTU</span>
            <span className="varB-logo-sub">Khoa Công nghệ thông tin</span>
          </div>
        </div>

        <h1 className="varB-title">Đăng nhập hệ thống</h1>
        <p className="varB-desc">Sử dụng MSSV hoặc email được cấp để tiếp tục</p>

        {error && <div className="notice notice-error varB-notice" role="alert">{error}</div>}
        {!error && feedback && (
          <div className={"notice " + (feedback.type === "success" ? "notice-success" : "notice-error") + " varB-notice"} role="alert">
            {feedback.text}
          </div>
        )}

        <form className="varB-form" onSubmit={submit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="vb-email">Tên đăng nhập / MSSV</label>
            <div className="varB-input-group">
              <input id="vb-email" name="email" className="varB-input" placeholder="Nhập MSSV hoặc email" autoComplete="username" />
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="vb-password">Mật khẩu</label>
            <div className="varB-input-group varB-pw-wrap">
              <input id="vb-password" name="password" className="varB-input varB-input-pw" type={showPw ? "text" : "password"} placeholder="Nhập mật khẩu" autoComplete="current-password" />
              <button type="button" className="varB-pw-btn" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Ẩn" : "Hiện"}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button variant="primary" className="varB-submit" type="submit" loading={loading}>
            <LogIn size={16} />
            Đăng nhập
          </Button>
        </form>

        {signupEnabled && (
          <>
            <div className="varB-divider"><span>hoặc</span></div>
            <Link href="/register" className="varB-register">Tạo tài khoản mới</Link>
          </>
        )}

        <div className="varB-footer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          <span>Trường Đại học DNTU</span>
        </div>
      </div>
    </div>
  );
}
