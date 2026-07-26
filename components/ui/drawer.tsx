"use client";

import { useEffect, type ReactNode, useId, useRef } from "react";
import { X } from "lucide-react";

export function Drawer({
  open, onClose, title, children, side = "left",
}: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; side?: "left" | "right";
}) {
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus(); };
  }, [open, onClose]);
  return (
    <>
      <div ref={overlayRef} className={`drawer-overlay ${open ? "visible" : ""}`} aria-hidden="true" onClick={onClose} />
      <aside className={`drawer drawer-${side} ${open ? "drawer-open" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="drawer-header">
          {title && <h3 id={titleId} className="drawer-title">{title}</h3>}
          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Đóng" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  );
}
