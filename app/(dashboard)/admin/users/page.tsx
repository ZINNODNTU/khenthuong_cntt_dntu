import { UserManager } from "@/components/user-manager";
import { requireRole } from "@/lib/auth";
import { getActiveBranchCodes } from "@/lib/branches";
import type { Profile } from "@/lib/types";
export default async function UsersPage() {
    const { supabase, user } = await requireRole(["admin"]);
    const [{ data }, branches] = await Promise.all([
        supabase
            .from("profiles")
            .select("id,email,full_name,role,submission_scope,branch_code,club_id,is_active,must_change_password")
            .order("created_at", { ascending: false }),
        getActiveBranchCodes(supabase),
    ]);
    return (<>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            QUẢN LÝ TRUY CẬP
          </div>
          <h1>Tài khoản hệ thống</h1>
          <p>
            Tạo tài khoản cá nhân, cán bộ xét duyệt và
            quản trị viên; tài khoản đơn vị được cấp tại
            trang quản lý đơn vị.
          </p>
        </div>
      </div>

      <UserManager users={(data || []) as Profile[]} branches={branches} currentUserId={user.id}/>
    </>);
}

