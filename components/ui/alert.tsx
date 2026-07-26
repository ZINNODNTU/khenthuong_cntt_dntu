"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X, type LucideIcon } from "lucide-react";

type AlertVariant = "success" | "error" | "warning" | "info";

const config: Record<AlertVariant, { icon: LucideIcon; className: string }> = {
  success: { icon: CheckCircle2, className: "notice-success" },
  error: { icon: AlertCircle, className: "notice-error" },
  warning: { icon: AlertTriangle, className: "notice-warning" },
  info: { icon: Info, className: "notice-info" },
};

export function Alert({
  variant = "info",
  title,
  children,
  onDismiss,
}: {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  const { icon: Icon, className } = config[variant];
  return (
    <div className={`notice ${className}`} role="alert">
      <Icon size={18} className="flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && <strong className="notice-title">{title}</strong>}
        <div className="notice-body">{children}</div>
      </div>
      {onDismiss && (
        <button type="button" className="notice-dismiss" aria-label="Đóng" onClick={onDismiss}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
