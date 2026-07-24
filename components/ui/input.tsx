"use client";

import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, forwardRef } from "react";

interface FieldProps {
  label?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, required, helper, error, children, className = "" }: FieldProps) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {children}
      {helper && <span className="field-helper">{helper}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`input ${error ? "input-error" : ""} ${className}`}
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
  ({ error, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`textarea ${error ? "input-error" : ""} ${className}`}
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
  ({ error, className = "", children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`select ${error ? "input-error" : ""} ${className}`}
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
