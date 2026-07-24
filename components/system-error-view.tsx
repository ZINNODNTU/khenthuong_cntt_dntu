"use client";
import Link from "next/link";
import { ArrowLeft, Home, LogIn, LogOut, RefreshCcw } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export function SystemErrorView({
  code,
  eyebrow = "HỆ THỐNG XÉT DUYỆT THÀNH TÍCH",
  title,
  message,
  detail,
  loginHref,
  homeHref = "/",
  showSignOut = false,
  onRetry,
}: {
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
    } finally {
      window.location.href = loginHref || "/login";
    }
  }

  return (
    <main className="error-page">
      <section className="card error-card">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-4)" }}>
          <BrandLogo size={64} priority />
        </div>
        <div className="error-code">{code}</div>
        <div className="page-header-eyebrow" style={{ marginBottom: "var(--space-2)" }}>{eyebrow}</div>
        <h1>{title}</h1>
        <p>{message}</p>
        {detail && <div className="error-details">{detail}</div>}

        <div className="flex justify-center gap-2 flex-wrap" style={{ marginTop: "var(--space-6)" }}>
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              <RefreshCcw size={16} /> Thử lại
            </Button>
          )}
          {loginHref && (
            <Link href={loginHref}>
              <Button variant="primary">
                <LogIn size={16} /> Đăng nhập
              </Button>
            </Link>
          )}
          <Link href={homeHref}>
            <Button variant="outline">
              <Home size={16} /> Trang chính
            </Button>
          </Link>
          <Button variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft size={16} /> Quay lại
          </Button>
          {showSignOut && (
            <Button variant="danger" onClick={signOut}>
              <LogOut size={16} /> Đăng xuất phiên hiện tại
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
