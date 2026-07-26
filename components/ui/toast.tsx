"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle } from "lucide-react";

type ToastVariant = "success" | "error" | "warning" | "info";
type ToastItem = { id: number; variant: ToastVariant; title: string; message?: string };

let toastId = 0;
const listeners: Set<(item: ToastItem) => void> = new Set();
export function toast(variant: ToastVariant, title: string, message?: string) {
  const id = ++toastId;
  listeners.forEach((fn) => fn({ id, variant, title, message }));
  setTimeout(() => listeners.forEach((fn) => fn({ id, variant: "info" as const, title: "" })), 4000);
}

const icons: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 size={18} />, error: <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />, info: <Info size={18} />,
};

export const ToastContainer = () => {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const handler = (item: ToastItem) => setItems((prev) => item.title ? [...prev.filter((i) => i.id !== item.id || item.title), item] : prev.filter((i) => i.id !== item.id));
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);
  return (
    <div className="toast-container" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`toast toast-${item.variant}`} role="alert">
          <span className="toast-icon">{icons[item.variant]}</span>
          <div className="toast-content"><strong>{item.title}</strong>{item.message && <p>{item.message}</p>}</div>
          <button className="toast-close" aria-label="Đóng" onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
};
