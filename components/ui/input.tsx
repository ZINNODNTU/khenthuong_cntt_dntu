"use client";

import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, forwardRef } from "react";

interface FieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, required, helper, error, children, className = "" }: FieldProps) {
  return (
    <div className={`field ${className}`.trim()}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="required" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {helper && <span className="field-helper" id={htmlFor ? `${htmlFor}-helper` : undefined}>{helper}</span>}
      {error && <span className="field-error" id={htmlFor ? `${htmlFor}-error` : undefined} role="alert">{error}</span>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = "", id, "aria-describedby": describedBy, ...props }, ref) => {
    const errorId = error && id ? `${id}-error` : undefined;
    return (
      <input
        ref={ref}
        id={id}
        className={`input ${error ? "input-error" : ""} ${className}`.trim()}
        aria-invalid={error || undefined}
        aria-describedby={[describedBy, errorId].filter(Boolean).join(" ") || undefined}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = "", id, "aria-describedby": describedBy, ...props }, ref) => {
    const errorId = error && id ? `${id}-error` : undefined;
    return (
      <textarea
        ref={ref}
        id={id}
        className={`textarea ${error ? "input-error" : ""} ${className}`.trim()}
        aria-invalid={error || undefined}
        aria-describedby={[describedBy, errorId].filter(Boolean).join(" ") || undefined}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className = "", children, id, "aria-describedby": describedBy, ...props }, ref) => {
    const errorId = error && id ? `${id}-error` : undefined;
    return (
      <select
        ref={ref}
        id={id}
        className={`select ${error ? "input-error" : ""} ${className}`.trim()}
        aria-invalid={error || undefined}
        aria-describedby={[describedBy, errorId].filter(Boolean).join(" ") || undefined}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Checkbox({ label, id, ...props }: CheckboxProps) {
  return (
    <label className="checkbox" htmlFor={id}>
      <input type="checkbox" id={id} {...props} />
      {label}
    </label>
  );
}
