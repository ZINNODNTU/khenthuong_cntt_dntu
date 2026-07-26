"use client";

import { Sparkles, Keyboard, X } from "lucide-react";
import type { ReactNode } from "react";

type QuickStep = { title: string; description: string };

export function HelpPanel({
  open, onClose, title, steps,
}: {
  open: boolean; onClose: () => void; title: string; steps: QuickStep[];
}) {
  return (
    <>
      <div className={`help-overlay ${open ? "visible" : ""}`} aria-hidden="true" onClick={onClose} />
      <aside className={`help-panel ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Hướng dẫn sử dụng nhanh">
        <div className="help-header">
          <div>
            <div className="help-header-icon"><Sparkles size={20} /></div>
            <h2>{title}</h2>
          </div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Đóng" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="field-helper help-intro">Ba bước chính để hoàn thành công việc nhanh và hạn chế sai sót.</p>
        <div className="help-content">
          {steps.map((step, i) => (
            <div key={step.title} className="help-step">
              <div className="help-step-num">{i + 1}</div>
              <div>
                <h4>{step.title}</h4>
                <p>{step.description}</p>
              </div>
            </div>
          ))}
          <div className="card card-body help-tip">
            <div className="flex gap-3">
              <Keyboard size={18} className="flex-shrink-0 text-secondary" />
              <div>
                <div className="font-semibold help-tip-title">Mẹo thao tác</div>
                <p className="text-xs text-secondary help-tip-body">Nhấn <kbd className="help-kbd">Esc</kbd> để đóng. Trạng thái sidebar được ghi nhớ.</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
