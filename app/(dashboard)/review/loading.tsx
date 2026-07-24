import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function ReviewLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Đang tải hàng đợi xét duyệt">
      <Skeleton style={{ width: 220, height: 30, marginBottom: 12 }} />
      <Skeleton style={{ width: "50%", height: 18, marginBottom: 24 }} />
      <Skeleton style={{ height: 84, borderRadius: "var(--radius-md)", marginBottom: 16 }} />
      <TableSkeleton rows={7} />
    </div>
  );
}
