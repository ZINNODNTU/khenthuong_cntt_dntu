import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/login-form";

export function LoginScreen({ signupEnabled }: { signupEnabled: boolean }) {
  return (
    <div className="login-page">
      <div className="login-container">
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
      </div>
    </div>
  );
}
