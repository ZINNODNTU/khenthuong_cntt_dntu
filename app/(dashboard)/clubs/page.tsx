import { ClubManager } from "@/components/club-manager";
import { requireRole } from "@/lib/auth";
import { getClubs } from "@/lib/clubs";
import type { UnitAccountSummary } from "@/lib/types";
export default async function ClubsPage() {
    const { supabase } = await requireRole(["admin"]);
    const [clubs, { data: accounts }] = await Promise.all([
        getClubs(supabase, { includeInactive: true }),
        supabase
            .from("profiles")
            .select("id,email,full_name,submission_scope,branch_code,club_id,is_active,must_change_password")
            .eq("role", "submitter")
            .eq("submission_scope", "club"),
    ]);
    return (<>
      <div className="page-head">
        <div>
          <div className="eyebrow">DANH MỤC TẬP THỂ</div>
          <h1>Quản lý câu lạc bộ</h1>
          <p>
            Thêm CLB, tự cấp tài khoản đại diện và quản lý
            quyền nộp hồ sơ tập thể.
          </p>
        </div>
      </div>

      <ClubManager clubs={clubs} accounts={(accounts || []) as UnitAccountSummary[]}/>
    </>);
}

