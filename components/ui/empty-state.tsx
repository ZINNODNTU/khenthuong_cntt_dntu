import { Inbox, AlertCircle, Loader2 } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title = "Không có dữ liệu",
  description,
  action,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Icon size={40} /></div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ text = "Đang tải..." }: { text?: string }) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <Loader2 size={32} className="spinner" />
      <p className="text-sm text-secondary mt-3">{text}</p>
    </div>
  );
}

export function ErrorState({
  title = "Có lỗi xảy ra",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state" role="alert">
      <div className="empty-state-icon" style={{ color: "var(--color-error-text)" }}>
        <AlertCircle size={40} />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
