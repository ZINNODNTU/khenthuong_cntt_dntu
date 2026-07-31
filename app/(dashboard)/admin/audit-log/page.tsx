import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";

const MODULE_LABELS: Record<string, string> = {
  auth: "Xác thực", accounts: "Tài khoản", roles: "Vai trò",
  periods: "Đợt xét", criteria: "Tiêu chí", applications: "Hồ sơ",
  review: "Xét duyệt", evidences: "Minh chứng", notifications: "Thông báo",
  config: "Cấu hình", email: "Email", backup: "Sao lưu", system: "Hệ thống",
};

const ACTION_LABELS: Record<string, string> = {
  login_success: "Đăng nhập", login_failed: "Đăng nhập thất bại",
  logout: "Đăng xuất", password_reset: "Reset mật khẩu",
  password_change: "Đổi mật khẩu", account_lock: "Khóa tài khoản",
  account_unlock: "Mở khóa", session_revoke: "Thu hồi phiên",
  create: "Tạo mới", update: "Cập nhật", delete: "Xóa", restore: "Khôi phục",
  role_change: "Đổi vai trò", scope_change: "Đổi phạm vi",
  import: "Nhập", export: "Xuất",
  approve: "Phê duyệt", reject: "Từ chối", revision_request: "Yêu cầu bổ sung",
  status_change: "Đổi trạng thái", assignment_change: "Đổi phân công",
  upload: "Tải lên", download: "Tải xuống", view: "Xem",
  config_change: "Đổi cấu hình", backup: "Sao lưu", restore_data: "Khôi phục",
  error_api: "Lỗi API", error_email: "Lỗi email", error_file: "Lỗi tệp",
};

const columns: ColumnDef[] = [
  { key: "created_at", label: "Thời gian", sortable: true, format: "datetime" },
  {
    key: "actor_name", label: "Người thực hiện", sortable: true,
  },
  { key: "actor_role", label: "Vai trò", hideOnMobile: true },
  { key: "action", label: "Hành động", sortable: true },
  { key: "module", label: "Module", sortable: true, hideOnMobile: true },
  { key: "resource_name", label: "Đối tượng" },
  { key: "description", label: "Nội dung", hideOnMobile: true },
  { key: "status", label: "Trạng thái" },
];

export default async function AuditLogPage() {
  const { supabase } = await requireRole(["admin"]);

  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data || []).map((r) => ({
    ...r,
    _module: MODULE_LABELS[r.module as string] || r.module,
    _action: ACTION_LABELS[r.action as string] || r.action,
    _status: r.status === "success" ? "Thành công" : "Thất bại",
  }));

  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ HỆ THỐNG"
        title="Nhật ký hoạt động"
        description="Lịch sử toàn bộ thao tác trên hệ thống, không thể sửa hoặc xóa."
      />
      <DataTable
        columns={columns}
        data={rows}
        clientSearch
        searchPlaceholder="Tìm kiếm theo hành động, người thực hiện..."
        emptyTitle="Chưa có nhật ký"
        emptyDescription="Các thao tác quản trị sẽ được ghi lại tại đây."
      />
    </>
  );
}
