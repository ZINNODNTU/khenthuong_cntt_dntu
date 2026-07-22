"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarRange,
  ChevronRight,
  ClipboardCheck,
  FilePlus2,
  Files,
  ListChecks,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { SignOutButton } from "@/components/sign-out-button";
import type { Profile, UserRole } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const adminGroups: NavGroup[] = [
  {
    label: "Điều hành",
    items: [
      {
        href: "/dashboard",
        label: "Tổng quan",
        description: "Số liệu và tiến độ hệ thống",
        icon: BarChart3,
      },
      {
        href: "/applications",
        label: "Toàn bộ hồ sơ",
        description: "Tra cứu hồ sơ đã tiếp nhận",
        icon: Files,
      },
      {
        href: "/review",
        label: "Xét duyệt hồ sơ",
        description: "Hàng đợi cần xử lý",
        icon: ClipboardCheck,
      },
      {
        href: "/results",
        label: "Kết quả xét duyệt",
        description: "Tổng hợp quyết định",
        icon: ListChecks,
      },
    ],
  },
  {
    label: "Cấu hình nghiệp vụ",
    items: [
      {
        href: "/periods",
        label: "Đợt xét thành tích",
        description: "Thời gian và phạm vi tiếp nhận",
        icon: CalendarRange,
      },
      {
        href: "/branches",
        label: "Quản lý Chi đoàn",
        description: "Đơn vị và tài khoản đại diện",
        icon: Users,
      },
      {
        href: "/clubs",
        label: "Quản lý Câu lạc bộ",
        description: "CLB và tài khoản đại diện",
        icon: Building2,
      },
      {
        href: "/admin/users",
        label: "Tài khoản hệ thống",
        description: "Phân quyền và trạng thái",
        icon: ShieldCheck,
      },
      {
        href: "/settings",
        label: "Cấu hình vận hành",
        description: "Kho ảnh và kết nối hệ thống",
        icon: Settings,
      },
    ],
  },
];

const reviewerGroups: NavGroup[] = [
  {
    label: "Xét duyệt",
    items: [
      {
        href: "/review",
        label: "Hồ sơ cần xét",
        description: "Danh sách được phân công",
        icon: ClipboardCheck,
      },
      {
        href: "/results",
        label: "Kết quả đã xử lý",
        description: "Lịch sử và kết luận",
        icon: ListChecks,
      },
    ],
  },
];

const submitterGroups: NavGroup[] = [
  {
    label: "Hồ sơ thành tích",
    items: [
      {
        href: "/applications/new",
        label: "Nộp thành tích",
        description: "Khởi tạo hồ sơ mới",
        icon: FilePlus2,
      },
      {
        href: "/applications",
        label: "Hồ sơ của tôi",
        description: "Theo dõi trạng thái xử lý",
        icon: Files,
      },
    ],
  },
];

function roleLabel(role: UserRole) {
  if (role === "admin") return "Quản trị viên";
  if (role === "reviewer") return "Cán bộ xét duyệt";
  return "Người nộp hồ sơ";
}

function portalTitle(role: UserRole) {
  if (role === "admin") return "Cổng quản trị";
  if (role === "reviewer") return "Cổng xét duyệt";
  return "Cổng nộp thành tích";
}

function initials(profile: Profile) {
  const value = profile.full_name?.trim() || profile.email;
  const words = value.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
}

export function AppShell({
  profile,
  activeBranchCount,
  children,
}: {
  profile: Profile;
  activeBranchCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const groups = useMemo(() => {
    if (profile.role === "admin") return adminGroups;
    if (profile.role === "reviewer") return reviewerGroups;
    return submitterGroups;
  }, [profile.role]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === "/applications") {
      return (
        pathname === "/applications" ||
        (pathname.startsWith("/applications/") &&
          !pathname.startsWith("/applications/new"))
      );
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const currentItem = groups
    .flatMap((group) => group.items)
    .find((item) => isActive(item.href));

  const currentTitle = currentItem?.label || portalTitle(profile.role);
  const currentDescription =
    currentItem?.description || "Hệ thống xét duyệt thành tích Khoa CNTT";

  const scopeTitle =
    profile.role === "submitter"
      ? profile.submission_scope === "club"
        ? "Đại diện Câu lạc bộ"
        : profile.submission_scope === "branch"
          ? `Đại diện Chi đoàn ${profile.branch_code || "chưa được gán"}`
          : `Hồ sơ cá nhân · ${profile.branch_code || "chưa được gán"}`
      : "Khoa Công nghệ thông tin";

  const scopeDetail =
    profile.role === "admin"
      ? `${activeBranchCount} Chi đoàn đang hoạt động`
      : profile.role === "reviewer"
        ? "Xử lý hồ sơ theo phạm vi được phân quyền"
        : "Mỗi đối tượng nộp một hồ sơ trong mỗi đợt";

  return (
    <div className={`workspace-shell role-${profile.role}`}>
      <button
        type="button"
        className={`workspace-overlay ${mobileOpen ? "is-visible" : ""}`}
        aria-label="Đóng thanh điều hướng"
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`workspace-sidebar ${mobileOpen ? "is-open" : ""}`}
        aria-label="Thanh điều hướng chính"
      >
        <div className="workspace-brand">
          <BrandLogo size={48} priority />
          <div className="workspace-brand-copy">
            <strong>XÉT DUYỆT THÀNH TÍCH</strong>
            <span>Khoa Công nghệ thông tin</span>
          </div>
          <button
            type="button"
            className="workspace-sidebar-close"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-portal-card">
          <span>Không gian làm việc</span>
          <strong>{portalTitle(profile.role)}</strong>
          <small>{scopeTitle}</small>
        </div>

        <div className="workspace-navigation">
          {groups.map((group) => (
            <section className="workspace-nav-group" key={group.label}>
              <div className="workspace-nav-label">{group.label}</div>
              <nav>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={active ? "is-active" : ""}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className="workspace-nav-icon">
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="workspace-nav-copy">
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                      <ChevronRight
                        className="workspace-nav-arrow"
                        size={16}
                      />
                    </Link>
                  );
                })}
              </nav>
            </section>
          ))}
        </div>

        <div className="workspace-sidebar-footer">
          <div className="workspace-scope-status">
            <span className="workspace-status-dot" />
            <div>
              <strong>{scopeTitle}</strong>
              <small>{scopeDetail}</small>
            </div>
          </div>

          <div className="workspace-account-card">
            <div className="workspace-avatar">{initials(profile)}</div>
            <div className="workspace-account-copy">
              <strong>{profile.full_name || "Tài khoản hệ thống"}</strong>
              <span>{profile.email}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-topbar-left">
            <button
              type="button"
              className="workspace-menu-button"
              aria-label="Mở thanh điều hướng"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>

            <div className="workspace-page-title">
              <div className="workspace-breadcrumb">
                <span>{portalTitle(profile.role)}</span>
                <ChevronRight size={13} />
                <strong>{currentTitle}</strong>
              </div>
              <h1>{currentTitle}</h1>
              <p>{currentDescription}</p>
            </div>
          </div>

          <div className="workspace-topbar-actions">
            <span className={`workspace-role-badge role-${profile.role}`}>
              {roleLabel(profile.role)}
            </span>
            <div className="workspace-user-summary">
              <div className="workspace-avatar workspace-avatar-small">
                {initials(profile)}
              </div>
              <div>
                <strong>{profile.full_name || "Tài khoản hệ thống"}</strong>
                <span>{profile.email}</span>
              </div>
            </div>
            <SignOutButton />
          </div>
        </header>

        <div className="workspace-content">{children}</div>
      </main>
    </div>
  );
}
