export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { RegisterForm } from "@/components/register-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export default async function RegisterPage() {
  if (!env.publicSignupEnabled()) {
    redirect("/");
  }

  const admin = createAdminClient();
  const { data } = await admin.from("branches").select("code").eq("is_active", true).order("code");
  const branches = (data || []).map((item) => item.code);

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card card">
          <div className="login-header">
            <div className="login-logo">
              <BrandLogo size={56} priority />
            </div>
            <h1>Đăng ký tài khoản</h1>
            <p>Chọn đúng Chi đoàn và nhập chính xác mã số sinh viên.</p>
          </div>

          <RegisterForm branches={branches} senderAddress={env.authEmailSenderAddress()} />
        </div>
      </div>
    </div>
  );
}
