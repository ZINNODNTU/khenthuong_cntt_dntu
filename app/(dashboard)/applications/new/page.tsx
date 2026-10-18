import Link from "next/link";
import { redirect } from "next/navigation";
import { CriterionEvidenceForm } from "@/components/criterion-evidence-form";
import { requireRole } from "@/lib/auth";
import { getEvaluationPeriods } from "@/lib/periods";
import { studentIdFromDntuEmail } from "@/lib/identity";
import { PageHeader } from "@/components/ui/page-header";

export default async function NewApplicationPage() {
  const { profile, supabase } = await requireRole(["submitter"]);
  if (profile.submission_scope !== "individual") {
    redirect("/403?reason=individual-only");
  }
  const studentId = studentIdFromDntuEmail(profile.email);
  if (!studentId) redirect("/403?reason=student-email");

  const periods = (await getEvaluationPeriods(supabase, { onlyOpen: true }))
    .filter(period => period.allow_individual);

  if (!periods.length) {
    return (
      <>
        <PageHeader eyebrow="KHEN THƯỞNG ĐOÀN – HỘI · KHOA CNTT" title="Chưa có đợt nhận hồ sơ cá nhân" description="Hiện chưa có đợt xét khen thưởng cá nhân đang mở." />
        <div className="card card-body">
          <div className="empty-state">
            <p className="text-sm text-secondary">
              Theo dõi thông báo hoặc xem <Link href="/applications" style={{ color: "var(--color-primary)" }}>Hồ sơ của tôi</Link>.
            </p>
          </div>
        </div>
      </>
    );
  }
  return (
    <CriterionEvidenceForm
      branchCode={profile.branch_code}
      submissionScope="individual"
      periods={periods}
      fullName={profile.full_name}
      accountEmail={profile.email}
      studentId={studentId}
    />
  );
}
