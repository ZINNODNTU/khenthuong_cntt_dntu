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
  period_create: "Tạo đợt xét", period_update: "Cập nhật đợt xét", period_delete: "Xóa đợt xét",
  application_create: "Tạo hồ sơ", application_submit: "Gửi hồ sơ", application_supplement: "Bổ sung hồ sơ", application_delete: "Xóa hồ sơ",
  application_decision: "Xét duyệt hồ sơ", evidence_upload: "Tải ảnh lên",
  account_change_password: "Đổi mật khẩu", user_create: "Tạo tài khoản",
  user_reset_password: "Reset mật khẩu", user_set_active: "Khóa/Mở khóa",
  user_update_profile: "Cập nhật tài khoản", branch_create_with_account: "Tạo chi đoàn",
  branch_provision_accounts: "Cấp tài khoản chi đoàn", branch_update: "Cập nhật chi đoàn",
  club_create_with_account: "Tạo CLB", club_provision_accounts: "Cấp tài khoản CLB",
  club_update: "Cập nhật CLB",
};

function formatMetadata(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata) return "—";
  const parts = Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => {
      const label = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      if (typeof value === "object") return `${label}: ${JSON.stringify(value)}`;
      return `${label}: ${String(value)}`;
    });
  return parts.length ? parts.join(" · ") : "—";
}

const columns: ColumnDef[] = [
  { key: "created_at", label: "Thời gian", sortable: true, format: "datetime" },
  { key: "actor_name", label: "Người thực hiện", sortable: true },
  { key: "actor_role", label: "Vai trò", hideOnMobile: true },
  { key: "action", label: "Hành động", sortable: true },
  { key: "module", label: "Module", sortable: true, hideOnMobile: true },
  { key: "entity_type", label: "Đối tượng" },
  { key: "detail", label: "Chi tiết", hideOnMobile: true },
];

const ROLE_LABELS: Record<string, string> = { admin: "Quản trị", reviewer: "Thẩm định", submitter: "Người nộp" };

export default async function AuditLogPage() {
  const { supabase } = await requireRole(["admin"]);

  const { data } = await supabase
    .from("audit_logs")
    .select("id,created_at,actor_id,action,entity_type,entity_id,metadata")
    .order("created_at", { ascending: false })
    .limit(100);

  const actorIds = [...new Set((data || []).map((r) => r.actor_id).filter(Boolean))];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id,full_name,role").in("id", actorIds)
    : { data: [] };

  const actorMap = new Map((actors || []).map((a) => [a.id, a]));

  const rows = (data || []).map((r) => {
    const actor = r.actor_id ? actorMap.get(r.actor_id) : null;
    const metadata = (r.metadata || {}) as Record<string, unknown>;
    const entityLabel = (r.entity_type || "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    return {
      ...r,
      actor_name: actor?.full_name || (metadata as Record<string, unknown>).actor_name || "—",
      actor_role: actor?.role ? ROLE_LABELS[actor.role] || actor.role : "—",
      action: ACTION_LABELS[r.action as string] || r.action,
      module: MODULE_LABELS[(metadata as Record<string, unknown>).module as string] || MODULE_LABELS[r.action.split(".")[0] as string] || (r.action.split(".")[0] as string) || "—",
      entity_type: entityLabel,
      detail: formatMetadata(metadata),
    };
  });

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
