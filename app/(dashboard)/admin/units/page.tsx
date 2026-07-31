import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";

const columns: ColumnDef[] = [
  { key: "code", label: "Mã", sortable: true },
  { key: "name", label: "Tên đơn vị", sortable: true },
  { key: "is_active", label: "Trạng thái" },
  { key: "created_at", label: "Ngày tạo", hideOnMobile: true, format: "date" },
];

export default async function UnitsPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase
    .from("units")
    .select("*")
    .order("code", { ascending: true });

  const rows = (data || []).map((r) => ({
    ...r,
    _is_active: r.is_active ? "Đang hoạt động" : "Ngưng hoạt động",
  }));

  return (
    <>
      <PageHeader
        eyebrow="QUẢN LÝ DỮ LIỆU"
        title="Quản lý đơn vị"
        description="Phân loại đơn vị, gán người phụ trách và theo dõi trạng thái hoạt động."
      />
      <DataTable
        columns={columns}
        data={rows as unknown as Record<string, unknown>[]}
        clientSearch
        searchPlaceholder="Tìm theo mã hoặc tên đơn vị..."
        emptyTitle="Chưa có đơn vị"
        emptyDescription="Tạo đơn vị mới để phân loại Chi đoàn, CLB và phòng ban."
      />
    </>
  );
}
