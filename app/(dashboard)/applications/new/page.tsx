import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationForm } from "@/components/application-form";
import { requireRole } from "@/lib/auth";
import { getEvaluationPeriods } from "@/lib/periods";
import { studentIdFromDntuEmail } from "@/lib/identity";
import type { Club } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";

export default async function NewApplicationPage() {
  const { profile, supabase } = await requireRole(["submitter"]);
  const allPeriods = await getEvaluationPeriods(supabase, { onlyOpen: true });
  const periods = allPeriods.filter((period) => {
    if (profile.submission_scope === "individual") return period.allow_individual;
    if (profile.submission_scope === "branch") return period.allow_branch_collective;
    return period.allow_club_collective;
  });
  const studentId = profile.submission_scope === "individual" ? studentIdFromDntuEmail(profile.email) : null;

  if (profile.submission_scope === "individual" && !studentId) {
    redirect("/403?reason=student-email");
  }

  let club: Club | null = null;
  if (profile.submission_scope === "club" && profile.club_id) {
    const { data } = await supabase.from("clubs").select("*").eq("id", profile.club_id).eq("is_active", true).maybeSingle();
    club = data as Club | null;
  }

  if (!periods.length) {
    return (
      <>
        <PageHeader eyebrow="NỘP HỒ SƠ THÀNH TÍCH" title="Chưa có đợt nhận hồ sơ" description="Hiện tại chưa có đợt xét thành tích đang mở." />
        <div className="card card-body">
          <div className="empty-state">
            <p className="text-sm text-secondary">Vui lòng theo dõi thông báo hoặc mở <Link href="/applications" style={{ color: "var(--color-primary)" }}>Hồ sơ của tôi</Link>.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="NỘP HỒ SƠ THÀNH TÍCH" title="Nộp thành tích" description="Mỗi cá nhân, Chi đoàn hoặc CLB chỉ có một hồ sơ trong mỗi đợt xét." />
      <ApplicationForm
        branchCode={profile.branch_code}
        club={club}
        submissionScope={profile.submission_scope}
        periods={periods}
        fullName={profile.full_name}
        accountEmail={profile.email}
        studentId={studentId}
      />
    </>
  );
}
