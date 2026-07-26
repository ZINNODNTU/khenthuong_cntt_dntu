"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LogIn, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { loginEmailFromInput } from "@/lib/identity";

function queryMessage(errorCode: string | null, confirmed: string | null) {
  if (confirmed === "1") return { type: "success" as const, text: "Email đã được xác nhận. Bạn có thể đăng nhập." };
  if (errorCode === "session") return { type: "error" as const, text: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
  if (errorCode === "inactive") return { type: "error" as const, text: "Tài khoản đang bị khóa." };
  if (errorCode === "callback") return { type: "error" as const, text: "Liên kết xác nhận không hợp lệ." };
  return null;
}

export function LoginVariantC({ signupEnabled }: { signupEnabled: boolean }) {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const router = useRouter();
  const params = useSearchParams();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const client = createClient();
    const email = loginEmailFromInput(String(form.get("email")));
    const { error: loginError } = await client.auth.signInWithPassword({ email, password: String(form.get("password")) });
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
    <div className="varC-root">
      {/* Animated nebula orbs */}
      <div className="varC-orb varC-orb-1" />
      <div className="varC-orb varC-orb-2" />
      <div className="varC-orb varC-orb-3" />
      <div className="varC-orb varC-orb-4" />
      <div className="varC-stars" />

      <div className="varC-container">
        <div className="varC-card">
          <div className="varC-card-glow" />
          <div className="varC-card-content">
            <div className="varC-badge">
              <Sparkles size={12} />
              <span>Hệ thống xét duyệt thành tích</span>
            </div>

            <div className="varC-header">
              <div className="varC-logo-ring">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <rect width="44" height="44" rx="12" fill="url(#vc-grad)" />
                  <text x="22" y="28" textAnchor="middle" fill="white" fontSize="20" fontWeight="700">C</text>
                  <defs>
                    <linearGradient id="vc-grad" x1="0" y1="0" x2="44" y2="44">
                      <stop stopColor="#6366f1" /><stop offset="1" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h1 className="varC-title">Đăng nhập</h1>
              <p className="varC-desc">Nhập thông tin tài khoản để tiếp tục</p>
            </div>

            {error && <div className="varC-notice varC-notice-error" role="alert">{error}</div>}
            {!error && feedback && (
              <div className={`varC-notice ${feedback.type === "success" ? "varC-notice-success" : "varC-notice-error"}`} role="alert">
                {feedback.text}
              </div>
            )}

            <form className="varC-form" onSubmit={submit} noValidate>
              <div className="varC-field">
                <label className="varC-label" htmlFor="vc-email">MSSV / Email</label>
                <div className={`varC-input-wrap ${focused === "email" ? "varC-input-focused" : ""}`}>
                  <input
                    id="vc-email"
                    name="email"
                    className="varC-input"
                    placeholder=" "
                    autoComplete="username"
                    required
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                  />
                  <span className="varC-input-placeholder">Nhập MSSV hoặc email</span>
                  <div className="varC-input-border" />
                </div>
              </div>

              <div className="varC-field">
                <label className="varC-label" htmlFor="vc-password">Mật khẩu</label>
                <div className={`varC-input-wrap ${focused === "password" ? "varC-input-focused" : ""}`}>
                  <input
                    id="vc-password"
                    name="password"
                    className="varC-input"
                    type={showPw ? "text" : "password"}
                    placeholder=" "
                    autoComplete="current-password"
                    required
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                  />
                  <span className="varC-input-placeholder">Nhập mật khẩu</span>
                  <div className="varC-input-border" />
                  <button
                    type="button"
                    className="varC-pw-btn"
                    onClick={() => setShowPw(!showPw)}
                    aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="varC-submit" disabled={loading}>
                {loading ? (
                  <span className="varC-spinner" />
                ) : (
                  <LogIn size={16} />
                )}
                <span>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</span>
              </button>
            </form>

            {signupEnabled && (
              <div className="varC-footer">
                <span>Chưa có tài khoản?</span>
                <Link href="/register">Đăng ký ngay</Link>
              </div>
            )}

            <div className="varC-bottom-text">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              Khoa CNTT — Trường Đại học DNTU
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .varC-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #0a0a1a 0%, #1a1040 40%, #0d0d2b 100%);
        }
        [data-theme="light"] .varC-root {
          background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #f0eeff 100%);
        }

        /* Floating orbs */
        .varC-orb {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(100px);
          animation: varC-float 15s ease-in-out infinite;
        }
        .varC-orb-1 { width: 600px; height: 600px; background: rgba(99,102,241,.3); top: -200px; right: -150px; animation-delay: 0s; }
        .varC-orb-2 { width: 500px; height: 500px; background: rgba(168,85,247,.25); bottom: -180px; left: -100px; animation-delay: -5s; }
        .varC-orb-3 { width: 350px; height: 350px; background: rgba(59,130,246,.2); top: 40%; left: 10%; animation-delay: -10s; }
        .varC-orb-4 { width: 250px; height: 250px; background: rgba(236,72,153,.15); top: 20%; right: 20%; animation-delay: -3s; }
        [data-theme="light"] .varC-orb-1 { background: rgba(99,102,241,.12); }
        [data-theme="light"] .varC-orb-2 { background: rgba(168,85,247,.08); }
        [data-theme="light"] .varC-orb-3 { background: rgba(59,130,246,.06); }
        [data-theme="light"] .varC-orb-4 { background: rgba(236,72,153,.04); }

        /* Stars */
        .varC-stars {
          position: fixed; inset: 0; pointer-events: none;
          background-image:
            radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,.6), transparent),
            radial-gradient(1px 1px at 20% 40%, rgba(255,255,255,.4), transparent),
            radial-gradient(1.5px 1.5px at 30% 10%, rgba(255,255,255,.5), transparent),
            radial-gradient(1px 1px at 45% 70%, rgba(255,255,255,.3), transparent),
            radial-gradient(1px 1px at 60% 30%, rgba(255,255,255,.5), transparent),
            radial-gradient(1.5px 1.5px at 75% 50%, rgba(255,255,255,.4), transparent),
            radial-gradient(1px 1px at 85% 80%, rgba(255,255,255,.3), transparent),
            radial-gradient(1px 1px at 90% 15%, rgba(255,255,255,.5), transparent);
        }
        [data-theme="light"] .varC-stars { display: none; }

        @keyframes varC-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(40px, -40px) scale(1.05); }
          50% { transform: translate(-20px, 30px) scale(0.95); }
          75% { transform: translate(30px, 20px) scale(1.02); }
        }

        .varC-container {
          width: 100%; max-width: 420px; position: relative; z-index: 1;
          animation: varC-appear .7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes varC-appear {
          from { opacity: 0; transform: translateY(24px) scale(.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .varC-card {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
        }
        .varC-card-glow {
          position: absolute; inset: 0;
          border-radius: 20px;
          background: rgba(255,255,255,.06);
          box-shadow: 0 0 60px rgba(99,102,241,.15), inset 0 1px 0 rgba(255,255,255,.12);
        }
        [data-theme="light"] .varC-card-glow {
          background: #fff;
          box-shadow: 0 8px 40px rgba(15,23,42,.08), 0 1px 3px rgba(15,23,42,.04);
          border: 1px solid #e2e8f0;
        }
        .varC-card-content {
          position: relative; z-index: 1;
          padding: 40px 36px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        [data-theme="light"] .varC-card-content {
          backdrop-filter: none;
        }

        .varC-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 12px; border-radius: 999px;
          background: rgba(99,102,241,.15);
          color: #a5b4fc;
          font-size: 11px; font-weight: 600;
          margin-bottom: 28px;
        }
        [data-theme="light"] .varC-badge {
          background: rgba(99,102,241,.1);
          color: #6366f1;
        }

        .varC-header { text-align: center; margin-bottom: 32px; }
        .varC-logo-ring { margin-bottom: 20px; display: flex; justify-content: center; }
        .varC-logo-ring svg { filter: drop-shadow(0 4px 12px rgba(99,102,241,.4)); transition: transform .4s ease; }
        .varC-logo-ring:hover svg { transform: scale(1.05) rotate(-4deg); }

        .varC-title { font-size: 26px; font-weight: 700; color: #f1f5f9; margin-bottom: 6px; letter-spacing: -.03em; }
        .varC-desc { font-size: 14px; color: #94a3b8; line-height: 1.5; }
        [data-theme="light"] .varC-title { color: #0f172a; }
        [data-theme="light"] .varC-desc { color: #64748b; }

        .varC-notice {
          padding: 10px 14px; border-radius: 10px;
          font-size: 13px; margin-bottom: 20px;
          animation: varC-shake .4s ease;
        }
        @keyframes varC-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .varC-notice-error { background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.2); color: #fca5a5; }
        .varC-notice-success { background: rgba(34,197,94,.12); border: 1px solid rgba(34,197,94,.2); color: #86efac; }
        [data-theme="light"] .varC-notice-error { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
        [data-theme="light"] .varC-notice-success { background: #f0fdf4; border-color: #bbf7d0; color: #16a34a; }

        .varC-form { display: flex; flex-direction: column; gap: 20px; }

        .varC-field { display: flex; flex-direction: column; gap: 6px; }
        .varC-label {
          font-size: 13px; font-weight: 500; color: #94a3b8;
          padding-left: 2px;
        }
        [data-theme="light"] .varC-label { color: #475569; }

        .varC-input-wrap {
          position: relative;
          transition: all .2s ease;
        }
        .varC-input {
          width: 100%; height: 48px;
          padding: 16px 14px 4px;
          background: rgba(255,255,255,.05);
          border: 1.5px solid rgba(255,255,255,.1);
          border-radius: 12px;
          color: #f1f5f9;
          font-size: 14px;
          outline: none;
          transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
        }
        [data-theme="light"] .varC-input {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #0f172a;
        }
        .varC-input:focus { border-color: #818cf8; background: rgba(255,255,255,.08); }
        [data-theme="light"] .varC-input:focus { border-color: #6366f1; background: #fff; }
        .varC-input-focused .varC-input { border-color: #818cf8; }
        [data-theme="light"] .varC-input-focused .varC-input { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }

        .varC-input-wrap.varC-input-focused .varC-input {
          box-shadow: 0 0 20px rgba(99,102,241,.08);
        }
        [data-theme="light"] .varC-input-wrap.varC-input-focused .varC-input {
          box-shadow: 0 0 0 3px rgba(99,102,241,.1);
        }

        .varC-input-pw { padding-right: 44px; }

        .varC-pw-btn {
          position: absolute; right: 8px; bottom: 10px;
          width: 32px; height: 32px;
          display: grid; place-items: center;
          background: none; border: none;
          color: #64748b; cursor: pointer;
          border-radius: 8px;
          transition: color .15s, background .15s;
        }
        .varC-pw-btn:hover { color: #94a3b8; background: rgba(255,255,255,.05); }
        [data-theme="light"] .varC-pw-btn:hover { background: #f1f5f9; color: #334155; }

        .varC-submit {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; height: 48px;
          margin-top: 4px;
          border: none; border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          font-size: 15px; font-weight: 600;
          cursor: pointer;
          transition: all .25s ease;
          position: relative; overflow: hidden;
        }
        .varC-submit::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          opacity: 0;
          transition: opacity .25s ease;
        }
        .varC-submit:hover:not(:disabled)::before { opacity: 1; }
        .varC-submit:active:not(:disabled) { transform: scale(.98); }
        .varC-submit:disabled { opacity: .6; cursor: not-allowed; }
        .varC-submit > * { position: relative; z-index: 1; }

        .varC-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: varC-spin .6s linear infinite;
        }
        @keyframes varC-spin { to { transform: rotate(360deg); } }

        .varC-footer {
          display: flex; align-items: center; justify-content: center; gap: 4px;
          margin-top: 24px;
          font-size: 13px; color: #64748b;
        }
        .varC-footer a {
          color: #a5b4fc; text-decoration: none; font-weight: 500;
          transition: color .15s;
        }
        .varC-footer a:hover { color: #c7d2fe; }
        [data-theme="light"] .varC-footer a { color: #6366f1; }
        [data-theme="light"] .varC-footer a:hover { color: #4f46e5; }

        .varC-bottom-text {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          margin-top: 28px; padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,.06);
          font-size: 11px; color: #475569;
        }
        [data-theme="light"] .varC-bottom-text { border-top-color: #e2e8f0; color: #94a3b8; }

        @media (max-width: 480px) {
          .varC-card-content { padding: 28px 20px; }
          .varC-title { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}
