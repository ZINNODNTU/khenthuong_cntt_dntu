import { PeriodManager } from "@/components/period-manager";
import { requireRole } from "@/lib/auth";
import { getEvaluationPeriods } from "@/lib/periods";
import { PageHeader } from "@/components/ui/page-header";

export default async function PeriodsPage() {
  const { supabase } = await requireRole(["admin"]);
  const periods = await getEvaluationPeriods(supabase);
  return (
    <>
      <PageHeader
        eyebrow="THIẾT LẬP XÉT DUYỆT"
        title="Đợt xét thành tích"
        description="Tạo, mở và đóng từng đợt nhận hồ sơ."
      />
      <PeriodManager periods={periods} />
    </>
  );
}
