import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div role="status" aria-live="polite">
      <div className="flex gap-4" style={{ marginBottom: "var(--space-4)" }}>
        <Skeleton className="skeleton-card" style={{ flex: 1, height: 116 }} />
        <Skeleton className="skeleton-card" style={{ flex: 1, height: 116 }} />
        <Skeleton className="skeleton-card" style={{ flex: 1, height: 116 }} />
        <Skeleton className="skeleton-card" style={{ flex: 1, height: 116 }} />
        <Skeleton className="skeleton-card" style={{ flex: 1, height: 116 }} />
      </div>
      <div className="grid-2" style={{ marginBottom: "var(--space-4)" }}>
        <Skeleton style={{ height: 200, borderRadius: "var(--radius-md)" }} />
        <Skeleton style={{ height: 200, borderRadius: "var(--radius-md)" }} />
      </div>
      <Skeleton style={{ height: 320, borderRadius: "var(--radius-md)" }} />
    </div>
  );
}
