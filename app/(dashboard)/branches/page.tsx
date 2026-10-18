import { BranchManager } from "@/components/branch-manager";
import { requireRole } from "@/lib/auth";
import { getBranches } from "@/lib/branches";
import { PageHeader } from "@/components/ui/page-header";

export default async function BranchesPage() {
  const { supabase } = await requireRole(["admin"]);
  const branches = await getBranches(supabase, { includeInactive: true });
  return (
    <>
      <PageHeader
        eyebrow="DANH MỤC SINH VIÊN"
        title="Quản lý Chi đoàn"
        description="Chi đoàn là thông tin đơn vị của sinh viên khi xét khen thưởng cá nhân. Không cấp tài khoản nộp hồ sơ tập thể."
      />
      <BranchManager branches={branches} canManage />
    </>
  );
}
