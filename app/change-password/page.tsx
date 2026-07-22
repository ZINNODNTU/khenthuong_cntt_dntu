export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ChangePasswordForm } from "@/components/change-password-form";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";
export default async function ChangePasswordPage() {
    const supabase = await createClient();
    const { data: { user }, } = await supabase.auth.getUser();
    if (!user) {
        redirect("/401?reason=session");
    }
    const { data: profile } = await supabase
        .from("profiles")
        .select("is_active,must_change_password")
        .eq("id", user.id)
        .maybeSingle();
    if (!profile) {
        redirect("/401?reason=profile-missing");
    }
    if (!profile.is_active) {
        redirect("/403?reason=inactive");
    }
    if (!profile.must_change_password) {
        redirect("/");
    }
    return (<main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <BrandLogo size={82} priority/>
          <div>
            <span>HỆ THỐNG XÉT DUYỆT THÀNH TÍCH</span>
            <h1>Đổi mật khẩu lần đầu</h1>
            <p>Khoa Công nghệ thông tin</p>
          </div>
        </div>

        <ChangePasswordForm />
        <div className="auth-switch">
          <SignOutButton />
        </div>
      </section>
    </main>);
}

