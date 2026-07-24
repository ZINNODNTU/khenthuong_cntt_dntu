import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function ApplicationsLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Đang tải danh sách hồ sơ">
      <Skeleton style={{ width: 240, height: 30, marginBottom: 12 }} />
      <Skeleton style={{ width: "55%", height: 18, marginBottom: 24 }} />
      <Skeleton style={{ height: 84, borderRadius: "var(--radius-md)", marginBottom: 16 }} />
      <TableSkeleton rows={8} />
    </div>
  );
}
