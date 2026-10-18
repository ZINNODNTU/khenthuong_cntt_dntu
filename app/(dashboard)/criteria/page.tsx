import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { AwardCriteriaFramework } from "@/components/award-criteria-framework";

export default async function AwardCriteriaPage() {
  await requireUser();
  return (
    <>
      <PageHeader
        eyebrow="ĐOÀN – HỘI · KHOA CNTT"
        title="Tiêu chí xét khen thưởng cá nhân"
        description="09 tiêu chí C1–C9, hướng dẫn chuẩn bị minh chứng và điều kiện xét Đạt / Không đạt."
      />
      <AwardCriteriaFramework />
    </>
  );
}
