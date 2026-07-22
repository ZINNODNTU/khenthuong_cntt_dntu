import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/login-form";
import { env } from "@/lib/env";
export default function LoginPage() {
    return (<div className="login-shell">
      <section className="login-hero">
        <BrandLogo size={92} className="login-brand-logo" priority/>
        <div className="eyebrow">KHOA CÔNG NGHỆ THÔNG TIN</div>
        <h1>Hệ thống nộp và xét duyệt thành tích.</h1>
        <p>
          Mỗi tài khoản được cung cấp đúng không gian làm việc theo nhiệm vụ:
          quản trị, xét duyệt hoặc nộp hồ sơ.
        </p>
      </section>
      <section className="login-panel">
        <div className="card login-card">
          <div className="login-card-brand">
            <BrandLogo size={58}/>
            <div>
              <strong>ĐOÀN TNCS HỒ CHÍ MINH</strong>
              <span>Khoa Công nghệ thông tin</span>
            </div>
          </div>
          <h2>Đăng nhập</h2>
          <p>Sinh viên nhập MSSV; Chi đoàn/CLB nhập mã đơn vị. Hệ thống tự bổ sung @dntu.edu.vn.</p>
          <Suspense>
            <LoginForm signupEnabled={env.publicSignupEnabled()}/>
          </Suspense>
        </div>
      </section>
    </div>);
}

