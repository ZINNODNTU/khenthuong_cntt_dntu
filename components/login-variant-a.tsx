"use client";

import { useState } from "react";
import { Eye, EyeOff, LogIn, User, GraduationCap, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LoginVariantA() {
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="login-variant-a">
      {/* Left panel — branding */}
      <div className="varA-brand">
        <div className="varA-brand-content">
          <div className="varA-logo">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect width="44" height="44" rx="12" fill="#2563EB"/><text x="22" y="28" textAnchor="middle" fill="white" fontSize="22" fontWeight="700">V</text></svg>
          </div>
          <h1 className="varA-title">CNTT DNTU</h1>
          <p className="varA-subtitle">Hệ thống xét duyệt thành tích</p>

          <div className="varA-features">
            <div className="varA-feature">
              <GraduationCap size={18} />
              <span>Quản lý hồ sơ khen thưởng</span>
            </div>
            <div className="varA-feature">
              <ChevronRight size={18} />
              <span>Xét duyệt trực tuyến</span>
            </div>
            <div className="varA-feature">
              <ChevronRight size={18} />
              <span>Minh chứng số hóa</span>
            </div>
          </div>

          <div className="varA-brand-footer">
            <p>Khoa Công nghệ thông tin<br/>Trường Đại học DNTU</p>
          </div>
        </div>
      </div>

      {/* Right panel — form với background có họa tiết */}
      <div className="varA-form">
        {/* Decorative shapes */}
        <div className="varA-bg-shape varA-bg-shape-1" />
        <div className="varA-bg-shape varA-bg-shape-2" />
        <div className="varA-bg-shape varA-bg-shape-3" />
        <div className="varA-bg-dots" />

        <div className="varA-form-card">
          <div className="varA-form-header">
            <h2 className="varA-form-title">Đăng nhập</h2>
            <p className="varA-form-desc">Sử dụng MSSV hoặc email được cấp</p>
          </div>

          <form className="varA-form-fields" onSubmit={(e) => e.preventDefault()}>
            <div className="field">
              <label className="field-label" htmlFor="va-username">Tên đăng nhập / MSSV</label>
              <div className="varA-input-wrap">
                <User size={16} className="varA-input-icon" />
                <input id="va-username" className="varA-input" placeholder="Nhập MSSV hoặc email" autoComplete="username" />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="va-password">Mật khẩu</label>
              <div className="varA-input-wrap">
                <button type="button" className="varA-pw-toggle" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Ẩn" : "Hiện"}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <input id="va-password" className="varA-input" type={showPw ? "text" : "password"} placeholder="Nhập mật khẩu" autoComplete="current-password" />
              </div>
            </div>

            <Button variant="primary" className="varA-submit">
              <LogIn size={16} /> Đăng nhập
            </Button>
          </form>

          <div className="varA-links">
            <Link href="/register">Đăng ký tài khoản</Link>
            <Link href="/">Quên mật khẩu?</Link>
          </div>
        </div>
      </div>

      <style>{`
        .login-variant-a{display:flex;min-height:100vh;font-family:Inter,system-ui,sans-serif}
        .varA-brand{flex:0 0 400px;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;padding:56px 48px;position:relative;overflow:hidden}
        .varA-brand::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 50%,rgba(37,99,235,.18),transparent 60%),radial-gradient(ellipse at 70% 80%,rgba(99,102,241,.08),transparent 50%);pointer-events:none}
        .varA-brand::after{content:'';position:absolute;inset:0;opacity:.04;background-image:linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px);background-size:48px 48px;pointer-events:none}
        .varA-brand-content{position:relative;z-index:1;display:flex;flex-direction:column;gap:16px;max-width:300px}
        .varA-logo{margin-bottom:12px}
        .varA-title{font-size:30px;font-weight:700;letter-spacing:-.03em;line-height:1.2}
        .varA-subtitle{font-size:14px;color:#94a3b8;line-height:1.5;margin-bottom:8px}
        .varA-features{display:flex;flex-direction:column;gap:12px;margin-top:24px}
        .varA-feature{display:flex;align-items:center;gap:10px;font-size:13px;color:#cbd5e1;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,.04)}
        .varA-feature svg{color:#60a5fa;flex-shrink:0}
        .varA-brand-footer{margin-top:48px;font-size:12px;color:#475569;border-top:1px solid rgba(255,255,255,.06);padding-top:24px}

        /* Right panel — form với background có họa tiết */
        .varA-form{flex:1;display:flex;align-items:center;justify-content:center;padding:32px;position:relative;overflow:hidden;background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)}
        .varA-bg-shape{position:absolute;border-radius:50%;pointer-events:none;opacity:.5}
        .varA-bg-shape-1{width:400px;height:400px;background:radial-gradient(circle,rgba(37,99,235,.08),transparent 70%);top:-120px;right:-80px}
        .varA-bg-shape-2{width:300px;height:300px;background:radial-gradient(circle,rgba(99,102,241,.06),transparent 70%);bottom:-60px;left:-60px}
        .varA-bg-shape-3{width:180px;height:180px;background:radial-gradient(circle,rgba(37,99,235,.05),transparent 70%);bottom:30%;right:10%}
        .varA-bg-dots{position:absolute;inset:0;pointer-events:none;opacity:.35;background-image:radial-gradient(circle,#94a3b8 .8px,transparent .8px);background-size:24px 24px}
        @media(prefers-color-scheme:dark){.varA-form{background:linear-gradient(135deg,#0f172a 0%,#0b1120 100%)}.varA-bg-dots{opacity:.12}.varA-bg-shape-1{background:radial-gradient(circle,rgba(37,99,235,.12),transparent 70%)}.varA-bg-shape-2{background:radial-gradient(circle,rgba(99,102,241,.1),transparent 70%)}.varA-bg-shape-3{background:radial-gradient(circle,rgba(37,99,235,.08),transparent 70%)}.varA-form-card{background:#1e293b;border-color:#334155}}

        .varA-form-card{width:100%;max-width:400px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:40px;position:relative;z-index:1;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .varA-form-header{margin-bottom:28px}
        .varA-form-title{font-size:24px;font-weight:600;color:#0f172a;margin-bottom:4px}
        .varA-form-desc{font-size:14px;color:#64748b}
        .varA-form-fields{display:flex;flex-direction:column;gap:20px}
        .varA-input-wrap{position:relative;display:flex;align-items:center}
        .varA-input-icon{position:absolute;left:14px;color:#94a3b8;pointer-events:none}
        .varA-pw-toggle{position:absolute;right:12px;color:#94a3b8;background:none;border:none;cursor:pointer;z-index:1;display:grid;place-items:center;width:28px;height:28px}
        .varA-pw-toggle:hover{color:#475569}
        .varA-input{width:100%;height:46px;padding:0 44px 0 42px;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;font-size:14px;color:#0f172a;outline:none;transition:border-color .15s,box-shadow .15s}
        .varA-input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.1)}
        .varA-input::placeholder{color:#94a3b8}
        .varA-submit{width:100%;height:46px;font-size:15px;margin-top:4px;border-radius:10px}
        .varA-links{display:flex;justify-content:space-between;margin-top:24px;font-size:13px}
        .varA-links a{color:#64748b;text-decoration:none;transition:color .15s}
        .varA-links a:hover{color:#2563eb}
        @media(max-width:1024px){.varA-brand{flex:0 0 320px;padding:40px 32px}}
        @media(max-width:768px){.varA-brand{display:none}.varA-form{padding:24px 16px}.varA-form-card{padding:28px 20px;border-radius:12px}.varA-bg-shape{opacity:.3}}
      `}</style>
    </div>
  );
}
