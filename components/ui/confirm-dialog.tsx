import { Modal } from "./modal";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";

export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = "Xác nhận", variant = "danger", loading = false,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void; title?: string; message: string | ReactNode;
  confirmLabel?: string; variant?: "danger" | "warning" | "primary"; loading?: boolean;
}) {
  const titleId = useId();
  return (
    <Modal open={open} onClose={loading ? () => {} : onClose} title={title || "Xác nhận"} aria-labelledby={titleId}>
      <div className="d-flex gap-3 items-start">
        <span className={`confirm-icon confirm-icon-${variant}`} aria-hidden="true"><AlertTriangle size={20} /></span>
        <div>
          <p className="confirm-message">{message}</p>
        </div>
      </div>
      <div className="d-flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
        <Button variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
