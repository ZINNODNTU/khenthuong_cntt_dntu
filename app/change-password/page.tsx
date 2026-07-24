export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ChangePasswordForm } from "@/components/change-password-form";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default async function ChangePasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/401?reason=session");
  const { data: profile } = await supabase.from("profiles").select("is_active,must_change_password").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/401?reason=profile-missing");
  if (!profile.is_active) redirect("/403?reason=inactive");
  if (!profile.must_change_password) redirect("/");

  return (
    <main className="password-page">
      <div className="password-card card">
        <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-3)" }}>
            <BrandLogo size={48} priority />
          </div>
          <h1 className="font-semibold" style={{ fontSize: "var(--font-size-xl)" }}>Đổi mật khẩu lần đầu</h1>
          <p className="text-sm text-secondary">Khoa Công nghệ thông tin</p>
        </div>

        <ChangePasswordForm />

        <div className="flex justify-center" style={{ marginTop: "var(--space-4)" }}>
          <form action="/api/auth/signout" method="POST">
            <Button variant="ghost" type="submit">
              <LogOut size={16} /> Đăng xuất
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
