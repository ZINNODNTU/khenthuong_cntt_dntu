import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/login-form";
import { Sparkles } from "lucide-react";

export function LoginScreen({ signupEnabled }: { signupEnabled: boolean }) {
  return (
    <main className="login-page">
      {/* Decorative blobs */}
      <div className="login-bg-blob login-bg-blob-1" />
      <div className="login-bg-blob login-bg-blob-2" />
      <div className="login-bg-blob login-bg-blob-3" />
      <div className="login-bg-grid" />

      <div className="login-container">
        <div className="login-badge">
          <Sparkles size={14} />
          <span>Hệ thống xét duyệt thành tích</span>
        </div>

        <div className="login-card card">
          <div className="login-header">
            <div className="login-logo">
              <BrandLogo size={56} priority />
            </div>
            <h1>Đăng nhập</h1>
            <p>
              Sinh viên nhập MSSV; Chi đoàn hoặc Câu lạc bộ nhập mã đơn vị.
            </p>
          </div>

          <Suspense fallback={<div className="text-center text-sm text-secondary">Đang tải...</div>}>
            <LoginForm signupEnabled={signupEnabled} />
          </Suspense>
        </div>

        <div className="login-footer-brand">Khoa Công nghệ thông tin — Trường Đại học DNTU</div>
      </div>
    </main>
  );
}
