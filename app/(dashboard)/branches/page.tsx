import { BranchManager } from "@/components/branch-manager";
import { requireRole } from "@/lib/auth";
import { getBranches } from "@/lib/branches";
import type { UnitAccountSummary } from "@/lib/types";
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
    return (<>
      <div className="page-head">
        <div>
          <div className="eyebrow">DANH MỤC HỆ THỐNG</div>
          <h1>Quản lý Chi đoàn</h1>
          <p>
            Thêm Chi đoàn, tự cấp tài khoản đại diện và
            đồng bộ trạng thái sử dụng.
          </p>
        </div>
      </div>

      <BranchManager branches={branches} accounts={(accounts || []) as UnitAccountSummary[]} canManage/>
    </>);
}

