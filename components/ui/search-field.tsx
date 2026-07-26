"use client";

import { forwardRef, type InputHTMLAttributes, useState } from "react";
import { Search, X } from "lucide-react";

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ value, onChange, placeholder = "Tìm kiếm...", ...props }, ref) => (
    <div className="search-field" role="search">
      <Search size={16} className="search-field-icon" aria-hidden="true" />
      <input ref={ref} className="search-field-input" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} {...props} />
      {value && <button className="search-field-clear" aria-label="Xóa" onClick={() => onChange("")}><X size={14} /></button>}
    </div>
  )
);
SearchField.displayName = "SearchField";
