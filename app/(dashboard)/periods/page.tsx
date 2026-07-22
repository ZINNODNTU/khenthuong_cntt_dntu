import { requireRole } from "@/lib/auth";
import { getEvaluationPeriods } from "@/lib/periods";
import { PeriodManager } from "@/components/period-manager";
export default async function PeriodsPage() { const { supabase } = await requireRole(["admin"]); const periods = await getEvaluationPeriods(supabase); return <><div className="page-head"><div><div className="eyebrow">THIẾT LẬP XÉT DUYỆT</div><h1>Đợt xét thành tích</h1><p>Tạo, mở và đóng từng đợt nhận hồ sơ.</p></div></div><PeriodManager periods={periods}/></>; }

