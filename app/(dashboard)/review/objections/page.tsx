import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";

const columns: ColumnDef[] = [
  { key: "code", label: "Mã hồ sơ", sortable: true },
  { key: "subject_name", label: "Đối tượng", sortable: true },
  { key: "reason", label: "Lý do phản biện", hideOnMobile: true },
  { key: "status", label: "Trạng thái" },
  { key: "created_at", label: "Tạo lúc", hideOnMobile: true, format: "datetime" },
];

export default async function ObjectionsPage() {
  const { supabase } = await requireRole(["admin", "reviewer"]);

  const { data } = await supabase
    .from("review_objections")
    .select("id, application_id, reason, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data || []).map((r) => ({
    id: r.id,
    code: r.application_id ? r.application_id.slice(0, 8) + "…" : "—",
    subject_name: "—",
    reason: r.reason || "—",
    status: r.status === "open" ? "Đang xử lý" : r.status === "resolved" ? "Đã giải quyết" : r.status === "rejected" ? "Bác bỏ" : r.status || "—",
    created_at: r.created_at,
  }));

  return (
    <>
      <PageHeader
        eyebrow="XÉT DUYỆT"
        title="Phản biện – Giải trình"
        description="Xử lý khiếu nại và yêu cầu phản biện kết quả xét duyệt."
      />
      <DataTable
        columns={columns}
        data={rows as unknown as Record<string, unknown>[]}
        rowLinkTemplate="/applications/{code}"
        clientSearch
        searchPlaceholder="Tìm theo mã hồ sơ..."
        emptyTitle="Chưa có phản biện"
        emptyDescription="Các yêu cầu phản biện sẽ xuất hiện tại đây."
      />
    </>
  );
}
