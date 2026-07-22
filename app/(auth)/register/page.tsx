export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { RegisterForm } from "@/components/register-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
export default async function RegisterPage() {
    if (!env.publicSignupEnabled())
        redirect("/login");
    const admin = createAdminClient();
    const { data } = await admin
        .from("branches")
        .select("code")
        .eq("is_active", true)
        .order("code");
    const branches = (data || []).map((item) => item.code);
    return (<div className="login-shell">
      <section className="login-hero">
        <BrandLogo size={92} className="login-brand-logo" priority/>
        <div className="eyebrow">ĐĂNG KÝ NGƯỜI NỘP HỒ SƠ</div>
        <h1>Tạo tài khoản bằng mã số sinh viên.</h1>
        <p>Chỉ nhập MSSV bằng chữ số; hệ thống tự tạo email MSSV@dntu.edu.vn.</p>
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
          <h2>Đăng ký tài khoản</h2>
          <p>Chọn đúng Chi đoàn và nhập chính xác mã số sinh viên.</p>
          <RegisterForm branches={branches}/>
        </div>
      </section>
    </div>);
}

