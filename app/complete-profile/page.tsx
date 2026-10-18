import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { studentProfileComplete } from "@/lib/student-onboarding";
import { CompleteStudentProfileForm } from "@/components/complete-student-profile-form";
import { BrandLogo } from "@/components/brand-logo";
import styles from "./complete-profile.module.css";

export const dynamic = "force-dynamic";

export default async function CompleteProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!user.email_confirmed_at) redirect("/?error=session");
  const { data: profile } = await supabase.from("profiles")
    .select("id,email,role,submission_scope,is_active,must_change_password,full_name,branch_code,phone,birth_date,profile_completed_at")
    .eq("id", user.id).maybeSingle();
  if (!profile || !profile.is_active) redirect("/403?reason=inactive");
  if (profile.must_change_password) redirect("/change-password");
  if (profile.role !== "submitter" || profile.submission_scope !== "individual") redirect("/");
  if (studentProfileComplete(profile)) redirect("/submitter");
  const { data: branches } = await supabase.from("branches")
    .select("code,name").eq("is_active", true).order("code");
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}><BrandLogo size={47} priority /><div><strong>KHOA CNTT · DNTU</strong><span>Xét khen thưởng cá nhân Đoàn – Hội</span></div></div>
        <div className={styles.progress}>BƯỚC CUỐI CÙNG · HOÀN THIỆN TÀI KHOẢN</div>
        <h1>Hoàn thiện hồ sơ sinh viên</h1>
        <p className={styles.description}>Email trường đã được xác nhận. Bạn cần bổ sung chính xác các thông tin bắt buộc bên dưới trước khi vào mục xét khen thưởng.</p>
        <div className={styles.verified}>✓ Email trường đã xác nhận: <strong>{user.email}</strong></div>
        <CompleteStudentProfileForm
          branches={branches || []}
          initial={{
            fullName: profile.full_name || "",
            branchCode: profile.branch_code || "",
            phone: profile.phone || "",
            birthDate: profile.birth_date || "",
          }}
        />
      </div>
    </main>
  );
}
