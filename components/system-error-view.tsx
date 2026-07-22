"use client";
import Link from "next/link";
import { ArrowLeft, Home, LogIn, LogOut, RefreshCcw } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
export function SystemErrorView({ code, eyebrow = "HỆ THỐNG XÉT DUYỆT THÀNH TÍCH", title, message, detail, loginHref, homeHref = "/", showSignOut = false, onRetry, }: {
    code: string;
    eyebrow?: string;
    title: string;
    message: string;
    detail?: string;
    loginHref?: string;
    homeHref?: string;
    showSignOut?: boolean;
    onRetry?: () => void;
}) {
    async function signOut() {
        try {
            await fetch("/api/auth/signout", { method: "POST" });
        }
        finally {
            window.location.href = loginHref || "/login";
        }
    }
    return (<main className="system-error-shell">
      <section className="system-error-card">
        <BrandLogo size={88} className="system-error-logo" priority/>
        <div className="system-error-code">{code}</div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{message}</p>
        {detail && <div className="system-error-detail">{detail}</div>}

        <div className="system-error-actions">
          {onRetry && (<button type="button" className="btn primary" onClick={onRetry}>
              <RefreshCcw size={16}/> Thử lại
            </button>)}
          {loginHref && (<Link className="btn primary" href={loginHref}>
              <LogIn size={16}/> Đăng nhập
            </Link>)}
          <Link className="btn" href={homeHref}>
            <Home size={16}/> Trang chính
          </Link>
          <button type="button" className="btn" onClick={() => window.history.back()}>
            <ArrowLeft size={16}/> Quay lại
          </button>
          {showSignOut && (<button type="button" className="btn fail" onClick={signOut}>
              <LogOut size={16}/> Đăng xuất phiên hiện tại
            </button>)}
        </div>
      </section>
    </main>);
}

