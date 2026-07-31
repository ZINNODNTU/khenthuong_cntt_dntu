"use client";

import {
  AlertCircle, ArrowUpDown, ChevronDown, ChevronUp,
  Inbox, Loader2, MoreHorizontal, Search, X,
} from "lucide-react";
import {
  createContext, useCallback, useContext, useMemo, useRef, useState,
} from "react";
import type { ReactNode } from "react";

/* ─── Types ─── */

export type SortDir = "asc" | "desc" | null;

export type CellFormat =
  | "text"
  | "bold"
  | "date"
  | "datetime"
  | "size"          // bytes → KB/MB
  | "badge-green"
  | "badge-red"
  | "badge-yellow"
  | "badge-blue"
  | "badge-gray"
  | "link"          // renders as external link, uses value as href + text
  | { badge: { trueValue: string; falseValue: string; trueClass?: string; falseClass?: string } };

export interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  hideOnMobile?: boolean;
  className?: string;
  format?: CellFormat;
  /** Only for "link" format — URL template with {value} placeholder */
  linkTemplate?: string;
}

export interface DataTableProps {
  columns: ColumnDef[];
  data: Record<string, unknown>[];
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  errorAction?: ReactNode;

  /** Enable client-side search (filters data by string fields) */
  clientSearch?: boolean;
  searchPlaceholder?: string;

  /** Enable client-side sort (by column key) */
  clientSort?: boolean;

  /** Enable row selection */
  selectable?: boolean;

  /** Row action menu items (rendered on client) */
  rowActions?: (row: Record<string, unknown>) => ReactNode;

  /** Row click handler */
  onRowClick?: (row: Record<string, unknown>) => void;
  /** Link template per row, e.g. "/applications/{id}" */
  rowLinkTemplate?: string;
}

/* ─── Internal cell renderer ─── */

function Cell({ value, format, linkTemplate }: { value: unknown; format?: CellFormat; linkTemplate?: string }) {
  const str = value == null ? "—" : String(value);

  if (format === "bold") return <b>{str}</b>;
  if (format === "date") {
    const d = new Date(str);
    return <span className="text-sm text-secondary">{isNaN(d.getTime()) ? str : d.toLocaleDateString("vi-VN")}</span>;
  }
  if (format === "datetime") {
    const d = new Date(str);
    return <span className="text-sm text-secondary">{isNaN(d.getTime()) ? str : d.toLocaleString("vi-VN")}</span>;
  }
  if (format === "size") {
    const bytes = Number(value) || 0;
    const display = bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
    return <span className="text-sm">{display}</span>;
  }
  if (format === "badge-green") return <span className="badge badge-green">{str}</span>;
  if (format === "badge-red") return <span className="badge badge-red">{str}</span>;
  if (format === "badge-yellow") return <span className="badge badge-yellow">{str}</span>;
  if (format === "badge-blue") return <span className="badge badge-blue">{str}</span>;
  if (format === "badge-gray") return <span className="badge badge-gray">{str}</span>;
  if (format === "link") {
    const href = linkTemplate ? linkTemplate.replace("{value}", encodeURIComponent(str)) : str;
    return <a href={href} className="link-primary" target="_blank" rel="noopener noreferrer">{str}</a>;
  }
  return <span className="text-sm">{str}</span>;
}

/* ─── Context for row actions menu ─── */

const RowMenuCtx = createContext<{
  open: string | null;
  setOpen: (id: string | null) => void;
}>({ open: null, setOpen: () => {} });

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown size={12} className="dt-sort-icon-idle" aria-hidden="true" />;
  return dir === "asc"
    ? <ChevronUp size={14} className="dt-sort-icon-active" aria-hidden="true" />
    : <ChevronDown size={14} className="dt-sort-icon-active" aria-hidden="true" />;
}

function RowMenu({ row, actions }: { row: Record<string, unknown>; actions: (row: Record<string, unknown>) => ReactNode }) {
  const { open, setOpen } = useContext(RowMenuCtx);
  const id = String(row.id);
  const isOpen = open === id;
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="dt-row-actions" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-icon dt-row-actions-btn"
        aria-label="Thao tác"
        aria-expanded={isOpen}
        onClick={(e) => { e.stopPropagation(); setOpen(isOpen ? null : id); }}
      >
        <MoreHorizontal size={16} />
      </button>
      {isOpen && (
        <div className="dt-row-actions-menu" onClick={() => setOpen(null)} role="menu">
          {actions(row)}
        </div>
      )}
    </div>
  );
}

/* ─── Main DataTable ─── */

export function DataTable({
  columns, data, loading, error,
  emptyTitle = "Không có dữ liệu", emptyDescription, emptyAction, errorAction,
  clientSearch, searchPlaceholder = "Tìm kiếm...",
  clientSort,
  selectable,
  rowActions,
  onRowClick, rowLinkTemplate,
}: DataTableProps) {
  const [searchValue, setSearchValue] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /* ── Filter (client-side) ── */
  const filtered = useMemo(() => {
    if (!clientSearch || !searchValue.trim()) return data;
    const q = searchValue.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [data, searchValue, clientSearch, columns]);

  /* ── Sort (client-side) ── */
  const sorted = useMemo(() => {
    if (!clientSort || !sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null) return 1;
      if (vb == null) return -1;
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [filtered, sortKey, sortDir, clientSort]);

  const allSelected = useMemo(
    () => selectable && sorted.length > 0 && selected.size === sorted.length,
    [selectable, selected, sorted],
  );

  const toggleAll = useCallback(() => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(sorted.map((d) => String(d.id))));
  }, [allSelected, sorted]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSort = (key: string) => {
    setSortKey((prev) => {
      if (prev !== key) { setSortDir("asc"); return key; }
      setSortDir((d) => d === "asc" ? "desc" : d === "desc" ? null : "asc");
      return prev;
    });
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="card card-body">
        <div className="dt-loading" role="status" aria-live="polite">
          <Loader2 size={28} className="spinner" />
          <p className="text-sm text-secondary mt-2">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="card card-body">
        <div className="dt-error" role="alert">
          <AlertCircle size={32} style={{ color: "var(--color-error-text)" }} />
          <h3>{error}</h3>
          {errorAction && <div className="mt-3">{errorAction}</div>}
        </div>
      </div>
    );
  }

  const hasData = sorted.length > 0;

  return (
    <RowMenuCtx.Provider value={{ open: menuOpen, setOpen: setMenuOpen }}>
      {/* Toolbar */}
      {clientSearch && (
        <div className="dt-toolbar">
          <div className="search-field" role="search">
            <Search size={16} className="search-field-icon" aria-hidden="true" />
            <input
              className="search-field-input"
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
            {searchValue && (
              <button className="search-field-clear" aria-label="Xóa" onClick={() => setSearchValue("")}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="card card-body">
        <div className="table-wrap table-responsive-card">
          <table className="table">
            <thead>
              <tr>
                {selectable && (
                  <th className="dt-check-col">
                    <input
                      type="checkbox"
                      className="dt-checkbox"
                      checked={!!allSelected}
                      onChange={toggleAll}
                      aria-label="Chọn tất cả"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`${col.sortable && clientSort ? "dt-sort-th" : ""} ${col.hideOnMobile ? "dt-hide-mobile" : ""}`}
                    onClick={() => col.sortable && clientSort && handleSort(col.key)}
                  >
                    <span className={col.sortable && clientSort ? "dt-sort-label" : ""}>
                      {col.label}
                      {col.sortable && clientSort && (
                        <SortIcon active={sortKey === col.key} dir={sortKey === col.key ? sortDir : null} />
                      )}
                    </span>
                  </th>
                ))}
                {rowActions && <th className="dt-actions-col" aria-label="Thao tác" />}
              </tr>
            </thead>
            <tbody>
              {hasData ? (
                sorted.map((row) => {
                  const id = String(row.id);
                  const linkHref = rowLinkTemplate
                    ? rowLinkTemplate.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(String(row[k] ?? "")))
                    : null;
                  const Wrapper = linkHref ? "a" : onRowClick ? "button" : "div";
                  const wrapperProps = linkHref
                    ? { href: linkHref, className: "dt-row" }
                    : onRowClick
                      ? { onClick: () => onRowClick(row), className: "dt-row dt-row-clickable", type: "button" as const }
                      : { className: "dt-row" };

                  return (
                    <tr key={id} className={selected?.has(id) ? "dt-row-selected" : ""}>
                      {selectable && (
                        <td className="dt-check-col" data-label="">
                          <input
                            type="checkbox"
                            className="dt-checkbox"
                            checked={selected?.has(id) ?? false}
                            onChange={() => toggleOne(id)}
                            aria-label="Chọn dòng"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          data-label={col.label}
                          className={`${col.className || ""} ${col.hideOnMobile ? "dt-hide-mobile" : ""}`}
                        >
                          <Wrapper {...wrapperProps}>
                            <Cell value={row[col.key]} format={col.format} linkTemplate={col.linkTemplate} />
                          </Wrapper>
                        </td>
                      ))}
                      {rowActions && (
                        <td className="dt-actions-col" data-label="">
                          <RowMenu row={row} actions={rowActions} />
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Inbox size={40} /></div>
                      <h3>{emptyTitle}</h3>
                      {emptyDescription && <p>{emptyDescription}</p>}
                      {emptyAction && <div className="mt-3">{emptyAction}</div>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RowMenuCtx.Provider>
  );
}
