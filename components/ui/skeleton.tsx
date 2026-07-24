export function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`skeleton ${className}`.trim()} {...props} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card card-body">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-table-row">
          <Skeleton className="skeleton-text" />
          <Skeleton className="skeleton-text" />
          <Skeleton className="skeleton-text skeleton-text-sm" />
          <Skeleton className="skeleton-text skeleton-text-sm" />
          <Skeleton className="skeleton-text skeleton-text-sm" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ height = 100 }: { height?: number }) {
  return <Skeleton className="skeleton-card" style={{ height }} />;
}
