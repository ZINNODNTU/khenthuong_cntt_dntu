import { BranchManager } from "@/components/branch-manager";
import { requireRole } from "@/lib/auth";
import { getBranches } from "@/lib/branches";
import type { UnitAccountSummary } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";

export default async function BranchesPage() {
  const { supabase } = await requireRole(["admin"]);
  const [branches, { data: accounts }] = await Promise.all([
    getBranches(supabase, { includeInactive: true }),
    supabase
      .from("profiles")
      .select("id,email,full_name,submission_scope,branch_code,club_id,is_active,must_change_password")
      .eq("role", "submitter")
      .eq("submission_scope", "branch"),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="DANH MỤC HỆ THỐNG"
        title="Quản lý Chi đoàn"
        description="Thêm Chi đoàn, tự cấp tài khoản đại diện và đồng bộ trạng thái sử dụng."
      />
      <BranchManager branches={branches} accounts={(accounts || []) as UnitAccountSummary[]} canManage />
    </>
  );
}
