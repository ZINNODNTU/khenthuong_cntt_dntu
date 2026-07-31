import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";

const columns: ColumnDef[] = [
  { key: "code", label: "Mã", sortable: true },
  { key: "name", label: "Người nộp", sortable: true },
  { key: "status", label: "Trạng thái" },
  { key: "age", label: "Chờ (ngày)", sortable: true, hideOnMobile: true },
  { key: "updated_at", label: "Cập nhật", sortable: true, hideOnMobile: true, format: "datetime" },
];

export default async function PendingPage() {
  const { supabase } = await requireRole(["admin"]);

  const { data } = await supabase
    .from("applications")
    .select("id, code, subject_name, status, updated_at")
    .in("status", ["submitted", "review", "revision"])
    .order("updated_at", { ascending: true })
    .limit(50);

  const now = Date.now();
  const day = 86_400_000;

  const rows = (data || []).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.subject_name,
    status: r.status === "submitted" ? "Đã gửi" : r.status === "review" ? "Đang xét" : "Chờ bổ sung",
    age: Math.max(0, Math.floor((now - new Date(r.updated_at).getTime()) / day)),
    updated_at: r.updated_at,
  }));

  return (
    <>
      <PageHeader
        eyebrow="ĐIỀU HÀNH"
        title="Việc cần xử lý"
        description="Hồ sơ đang chờ xét duyệt, cần phản hồi hoặc quá hạn."
      />
      <DataTable
        columns={columns}
        data={rows as unknown as Record<string, unknown>[]}
        rowLinkTemplate="/applications/{id}"
        clientSearch
        searchPlaceholder="Tìm theo mã hoặc tên..."
        emptyTitle="Không có việc cần xử lý"
        emptyDescription="Tất cả hồ sơ đã được xử lý."
      />
    </>
  );
}
