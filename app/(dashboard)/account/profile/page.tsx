import Link from "next/link";
import { BadgeCheck, CalendarDays, ChevronRight, CircleUserRound, GraduationCap, LockKeyhole, Mail, Phone, ShieldCheck, UserRound, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { studentIdFromDntuEmail } from "@/lib/identity";
import { studentProfileComplete } from "@/lib/student-onboarding";
import { PageHeader } from "@/components/ui/page-header";
import styles from "./profile.module.css";
import { AccountProfileEditor } from "@/components/account-profile-editor";

export const dynamic = "force-dynamic";

const roleText = {
  admin: "Quản trị viên",
  reviewer: "Cán bộ xét duyệt",
  submitter: "Người nộp hồ sơ",
} as const;

function displayDate(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Chưa cập nhật";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default async function MyProfilePage() {
  // Only the authenticated account is queried. No profile id or email is
  // accepted from URL parameters, preventing access to another student's PII.
  const { user, profile, supabase } = await requireUser();
  let branchName: string | null = null;
  if (profile.branch_code) {
    const { data } = await supabase.from("branches")
      .select("name").eq("code", profile.branch_code).maybeSingle();
    branchName = data?.name || null;
  }
  const studentId = studentIdFromDntuEmail(profile.email);
  const completed = studentProfileComplete(profile);
  const editable = profile.role === "submitter" && profile.submission_scope === "individual";
  const { data: activeBranches } = editable
    ? await supabase.from("branches").select("code,name").eq("is_active", true).order("code")
    : { data: [] as { code: string; name: string }[] };
  const fields = [
    { label: "Họ và tên", value: profile.full_name || "Chưa cập nhật", icon: UserRound },
    { label: "Mã số sinh viên", value: studentId || "Không áp dụng", icon: GraduationCap },
    { label: "Email đăng nhập", value: profile.email, icon: Mail },
    { label: "Ngày sinh", value: displayDate(profile.birth_date), icon: CalendarDays },
    { label: "Số điện thoại", value: profile.phone || "Chưa cập nhật", icon: Phone },
    { label: "Chi đoàn", value: profile.branch_code
      ? `${branchName || profile.branch_code}${branchName && branchName !== profile.branch_code ? ` · ${profile.branch_code}` : ""}`
      : "Chưa cập nhật", icon: Users },
  ];
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="TÀI KHOẢN CỦA TÔI"
        title="Thông tin cá nhân"
        description="Kiểm tra và cập nhật thông tin đã đăng ký. Email và mã số sinh viên được bảo vệ, không thể thay đổi tại đây."
      />
      <section className={styles.intro} aria-label="Trạng thái tài khoản">
        <div className={styles.identityIcon}><CircleUserRound size={31} aria-hidden="true" /></div>
        <div className={styles.introCopy}>
          <strong>{profile.full_name || "Tài khoản DNTU"}</strong>
          <span>{roleText[profile.role]} · {profile.email}</span>
        </div>
        <div className={styles.badges}>
          <span className={styles.verified}><BadgeCheck size={15} /> {user.email_confirmed_at ? "Email đã xác minh" : "Chưa xác minh email"}</span>
          <span className={completed ? styles.verified : styles.incomplete}>
            <ShieldCheck size={15} /> {completed ? "Hồ sơ tài khoản đầy đủ" : "Hồ sơ cần hoàn thiện"}
          </span>
        </div>
      </section>
      <section className={styles.panel} aria-labelledby="personal-details">
        <div className={styles.sectionHead}>
          <div><span className={styles.eyebrow}>THÔNG TIN ĐÃ ĐĂNG KÝ</span><h2 id="personal-details">Chi tiết tài khoản</h2></div>
          <span className={styles.readOnly}><LockKeyhole size={15} /> {editable ? "MSSV / email cố định" : "Chỉ xem"}</span>
        </div>
        <dl className={styles.fields}>
          {fields.map(({ label, value, icon: Icon }) => (
            <div className={styles.field} key={label}>
              <dt><Icon size={17} aria-hidden="true" />{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {editable && <AccountProfileEditor
          initial={{ fullName: profile.full_name || "", birthDate: profile.birth_date || "", phone: profile.phone || "", branchCode: profile.branch_code || "" }}
          branches={activeBranches || []}
        />}
      </section>
      <section className={styles.security} aria-label="Bảo mật và hỗ trợ">
        <div><ShieldCheck size={21} aria-hidden="true" /><span><strong>Bảo mật thông tin</strong><small>Chỉ tài khoản của bạn được phép xem và cập nhật các thông tin cá nhân được hỗ trợ. Email và MSSV không thể sửa từ biểu mẫu.</small></span></div>
        {profile.role === "submitter" && <Link href="/applications" className={styles.action}>Hồ sơ khen thưởng của tôi <ChevronRight size={17} /></Link>}
      </section>
    </div>
  );
}
