"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, X, ShieldCheck, Users, Award, BarChart3, CalendarRange, ClipboardCheck, FilePlus2, Files, ListChecks, Building2, Settings, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import type { NavGroup, UserRole } from "./types";

const SIDEBAR_STORAGE_KEY = "cntt-sidebar-collapsed";

function focusTrap(element: HTMLElement) {
  const focusable = element.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return () => {};
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  function onKey(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  element.addEventListener("keydown", onKey);
  first.focus();
  return () => element.removeEventListener("keydown", onKey);
}

export function Sidebar({
  groups, role, mobileOpen, onMobileClose,
}: {
  groups: NavGroup[]; role: UserRole; mobileOpen: boolean; onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try { setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true"); } catch {}
  }, []);

  useEffect(() => {
    if (!mobileOpen || !sidebarRef.current) return;
    const cleanup = focusTrap(sidebarRef.current);
    return cleanup;
  }, [mobileOpen]);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try { window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }

  const isActive = (href: string) => {
    if (href === "/applications") return pathname === "/applications" || (pathname.startsWith("/applications/") && !pathname.startsWith("/applications/new"));
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  function roleHref() {
    if (role === "submitter") return "/applications";
    if (role === "reviewer") return "/review";
    return "/dashboard";
  }

  return (
    <>
      <div className={`sidebar-overlay ${mobileOpen ? "visible" : ""}`} aria-hidden="true" onClick={onMobileClose} />
      <aside ref={sidebarRef} className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`} aria-label="Thanh điều hướng chính">
        <div className="sidebar-header">
          <Link href={roleHref()} className="sidebar-brand" aria-label="Về trang làm việc chính">
            <div className="sidebar-logo-ring">
              <BrandLogo size={36} priority />
            </div>
            <div className="sidebar-brand-text">
              <strong>CNTT DNTU</strong>
              <span>Xét duyệt thành tích</span>
            </div>
          </Link>
          <button type="button" className="sidebar-toggle" aria-label={collapsed ? "Mở rộng" : "Thu gọn"} aria-pressed={collapsed} onClick={toggle}>
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <button type="button" className="sidebar-close" aria-label="Đóng menu" onClick={onMobileClose}>
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-nav">
          {groups.map((group) => (
            <section className="sidebar-section" key={group.label}>
              <div className="sidebar-label">{group.label}</div>
              <nav className="sidebar-menu" aria-label={group.label}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`sidebar-link ${active ? "active" : ""}`}
                      aria-current={active ? "page" : undefined}
                      aria-label={item.label}
                      data-tooltip={item.label}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="sidebar-link-icon"><Icon size={18} strokeWidth={2} /></span>
                      <span className="sidebar-link-text">{item.label}</span>
                      {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                    </Link>
                  );
                })}
              </nav>
            </section>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              <ShieldCheck size={16} />
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-role">{role === "admin" ? "Quản trị" : role === "reviewer" ? "Xét duyệt" : "Người nộp"}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
