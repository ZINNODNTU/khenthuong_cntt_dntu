import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";

const STATUS_LABELS: Record<string, string> = {
  success: "Thành công",
  failure: "Thất bại",
};

const columns: ColumnDef[] = [
  {
    key: "file_name", label: "Tên tệp", sortable: true,
  },
  { key: "size_bytes", label: "Kích thước", sortable: true, hideOnMobile: true, format: "size" },
  { key: "category", label: "Phân loại", sortable: true },
  { key: "parent_type", label: "Loại", hideOnMobile: true },
  { key: "parent_id", label: "Hồ sơ", hideOnMobile: true },
  { key: "created_at", label: "Tải lên", sortable: true, hideOnMobile: true, format: "datetime" },
];

export default async function EvidencesPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase
    .from("evidences")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data || []).map((r) => ({
    ...r,
    _file_name: r.file_name || "—",
    _category: r.category || "—",
    _parent_type: r.parent_type === "application" ? "Hồ sơ" : r.parent_type || "—",
  }));

  return (
    <>
      <PageHeader
        eyebrow="QUẢN LÝ DỮ LIỆU"
        title="Quản lý minh chứng"
        description="Xem trước, kiểm tra tệp lỗi, tải xuống hoặc xóa minh chứng của toàn bộ hệ thống."
      />
      <DataTable
        columns={columns}
        data={rows as unknown as Record<string, unknown>[]}
        rowLinkTemplate="/api/evidence/{id}"
        clientSearch
        searchPlaceholder="Tìm theo tên tệp..."
        selectable
        emptyTitle="Chưa có minh chứng"
        emptyDescription="Các tệp ảnh do người dùng tải lên sẽ xuất hiện tại đây."
      />
    </>
  );
}
