"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type Step = { label: string; description?: string };

export function Stepper({
  steps, current, onSelect,
}: {
  steps: Step[]; current: number; onSelect?: (index: number) => void;
}) {
  return (
    <nav aria-label="Tiến trình" className="stepper">
      <ol className="stepper-list">
        {steps.map((step, i) => {
          const state = i < current ? "complete" : i === current ? "active" : "pending";
          const clickable = onSelect && i <= current;
          return (
            <li key={i} className={`stepper-step stepper-${state}`}>
              <button
                type="button"
                className="stepper-btn"
                onClick={clickable ? () => onSelect(i) : undefined}
                aria-current={state === "active" ? "step" : undefined}
                disabled={!clickable}
              >
                <span className="stepper-number" aria-hidden="true">
                  {state === "complete" ? "✓" : i + 1}
                </span>
                <span className="stepper-label">
                  <span className="stepper-title">{step.label}</span>
                  {step.description && <span className="stepper-desc">{step.description}</span>}
                </span>
              </button>
              {i < steps.length - 1 && <ChevronRight size={14} className="stepper-arrow" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
