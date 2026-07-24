import { Inbox } from "lucide-react";

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
      <div className="empty-state-icon">
        <Icon size={40} />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: "var(--space-4)" }}>{action}</div>}
    </div>
  );
}
