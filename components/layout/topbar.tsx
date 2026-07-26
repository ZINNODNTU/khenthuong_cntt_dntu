"use client";

import { Menu, Moon, Sun, HelpCircle, LogOut, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { UserRole, Profile } from "@/lib/types";

function roleLabel(role: UserRole) {
  if (role === "admin") return "Quản trị viên";
  if (role === "reviewer") return "Cán bộ xét duyệt";
  return "Sinh viên / đơn vị";
}

function portalTitle(role: UserRole) {
  if (role === "admin") return "Không gian quản trị";
  if (role === "reviewer") return "Không gian xét duyệt";
  return "Không gian nộp hồ sơ";
}

function initials(profile: Profile) {
  const value = profile.full_name?.trim() || profile.email;
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  return value.slice(0, 2).toUpperCase();
}

async function signOut() {
  await fetch("/api/auth/signout", { method: "POST" });
  window.location.href = "/login";
}

export function Topbar({
  profile, title, description, onMenuClick, onHelpOpen,
}: {
  profile: Profile; title: string; description: string; onMenuClick: () => void; onHelpOpen: () => void;
}) {
  const [dark, setDark] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const t = window.localStorage.getItem("cntt-theme");
      setDark(t === "dark" || (!t && window.matchMedia("(prefers-color-scheme:dark)").matches));
    } catch {}
  }, []);

  function toggleTheme() {
    setDark((prev) => {
      const next = !prev;
      const theme = next ? "dark" : "light";
      try { window.localStorage.setItem("cntt-theme", theme); } catch {}
      document.documentElement.setAttribute("data-theme", theme);
      return next;
    });
  }

  useEffect(() => {
    if (!userMenuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setUserMenuOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onClick);
    };
  }, [userMenuOpen]);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          aria-label="Mở menu"
          aria-expanded={false}
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>
        <div className="topbar-info">
          <div className="topbar-breadcrumb topbar-desktop-only">
            <span>{portalTitle(profile.role)}</span>
            <ChevronRight size={12} />
            <strong>{title}</strong>
          </div>
          <h1 className="topbar-title">{title}</h1>
          <p className="topbar-description topbar-desktop-only">{description}</p>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-actions topbar-desktop-only" aria-label="Công cụ nhanh">
          <button type="button" className="btn btn-ghost btn-icon" aria-label={dark ? "Giao diện sáng" : "Giao diện tối"} title={dark ? "Chế độ sáng" : "Chế độ tối"} onClick={toggleTheme}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Hướng dẫn" title="Hướng dẫn" onClick={onHelpOpen}>
            <HelpCircle size={18} />
          </button>
        </div>
        <span className="topbar-role-badge topbar-desktop-only">{roleLabel(profile.role)}</span>
        <div className="topbar-user topbar-desktop-only">
          <div className="sidebar-avatar topbar-avatar">{initials(profile)}</div>
          <div className="topbar-user-info">
            <div className="topbar-user-name">{profile.full_name || "Hệ thống"}</div>
            <div className="topbar-user-email">{profile.email}</div>
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-icon topbar-tablet-hide" aria-label="Đăng xuất" title="Đăng xuất" onClick={signOut}>
          <LogOut size={18} />
        </button>
      </div>

      <div className="topbar-mobile-actions">
        <button
          ref={triggerRef}
          type="button"
          className="btn btn-ghost topbar-user-trigger"
          aria-label="Thông tin người dùng"
          aria-expanded={userMenuOpen}
          onClick={() => setUserMenuOpen((prev) => !prev)}
        >
          <span className="topbar-avatar-mini">{initials(profile)}</span>
        </button>

        {userMenuOpen && (
          <div ref={dropdownRef} className="topbar-user-dropdown" role="menu">
            <div className="topbar-dropdown-header">
              <div className="topbar-dropdown-name">{profile.full_name || "Hệ thống"}</div>
              <div className="topbar-dropdown-email">{profile.email}</div>
              <div className="topbar-dropdown-role">{roleLabel(profile.role)}</div>
            </div>
            <div className="topbar-dropdown-divider" />
            <button type="button" className="topbar-dropdown-item" role="menuitem" onClick={toggleTheme}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
              <span>{dark ? "Giao diện sáng" : "Giao diện tối"}</span>
            </button>
            <button type="button" className="topbar-dropdown-item" role="menuitem" onClick={onHelpOpen}>
              <HelpCircle size={16} />
              <span>Hướng dẫn</span>
            </button>
            <div className="topbar-dropdown-divider" />
            <button type="button" className="topbar-dropdown-item topbar-dropdown-item-danger" role="menuitem" onClick={signOut}>
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
