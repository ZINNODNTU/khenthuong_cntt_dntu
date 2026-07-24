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
  HelpCircle,
  Keyboard,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
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

type QuickStep = {
  title: string;
  description: string;
};

const SIDEBAR_STORAGE_KEY = "cntt-sidebar-collapsed";

const adminGroups: NavGroup[] = [
  {
    label: "Điều hành",
    items: [
      { href: "/dashboard", label: "Tổng quan", description: "Số liệu và tiến độ hệ thống", icon: BarChart3 },
      { href: "/applications", label: "Toàn bộ hồ sơ", description: "Tra cứu hồ sơ đã tiếp nhận", icon: Files },
      { href: "/review", label: "Xét duyệt hồ sơ", description: "Hàng đợi cần xử lý", icon: ClipboardCheck },
      { href: "/results", label: "Kết quả xét duyệt", description: "Tổng hợp quyết định", icon: ListChecks },
    ],
  },
  {
    label: "Quản trị dữ liệu",
    items: [
      { href: "/periods", label: "Đợt xét thành tích", description: "Thời gian và phạm vi tiếp nhận", icon: CalendarRange },
      { href: "/branches", label: "Quản lý Chi đoàn", description: "Đơn vị và tài khoản đại diện", icon: Users },
      { href: "/clubs", label: "Quản lý Câu lạc bộ", description: "CLB và tài khoản đại diện", icon: Building2 },
      { href: "/admin/users", label: "Tài khoản hệ thống", description: "Phân quyền và trạng thái", icon: ShieldCheck },
      { href: "/settings", label: "Cấu hình vận hành", description: "Kho ảnh và kết nối hệ thống", icon: Settings },
    ],
  },
];

const reviewerGroups: NavGroup[] = [
  {
    label: "Xét duyệt",
    items: [
      { href: "/review", label: "Hồ sơ cần xét", description: "Danh sách đang chờ xử lý", icon: ClipboardCheck },
      { href: "/results", label: "Kết quả đã xử lý", description: "Lịch sử và kết luận", icon: ListChecks },
    ],
  },
];

const submitterGroups: NavGroup[] = [
  {
    label: "Hồ sơ thành tích",
    items: [
      { href: "/applications/new", label: "Nộp thành tích", description: "Tạo hồ sơ theo từng bước", icon: FilePlus2 },
      { href: "/applications", label: "Hồ sơ của tôi", description: "Theo dõi trạng thái xử lý", icon: Files },
    ],
  },
];

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
  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
}

function quickSteps(role: UserRole): QuickStep[] {
  if (role === "admin") {
    return [
      { title: "Mở đợt xét", description: "Tạo đợt xét, chọn thời gian và loại hồ sơ được phép tiếp nhận." },
      { title: "Chuẩn bị tài khoản", description: "Kiểm tra Chi đoàn, CLB và cấp tài khoản đại diện còn thiếu." },
      { title: "Theo dõi tiến độ", description: "Dùng Tổng quan và Toàn bộ hồ sơ để giám sát trạng thái xử lý." },
    ];
  }
  if (role === "reviewer") {
    return [
      { title: "Mở hàng đợi", description: "Chọn Hồ sơ cần xét để xem các hồ sơ đã gửi và đang xử lý." },
      { title: "Kiểm tra minh chứng", description: "Mở từng hồ sơ, đối chiếu nội dung và ảnh trước khi kết luận." },
      { title: "Ghi nhận kết quả", description: "Chọn Đạt, Không đạt hoặc Yêu cầu bổ sung kèm nhận xét rõ ràng." },
    ];
  }
  return [
    { title: "Chuẩn bị thông tin", description: "Kiểm tra đúng MSSV, Chi đoàn và đợt xét trước khi bắt đầu." },
    { title: "Nộp theo từng bước", description: "Điền thành tích, thêm hoạt động và tải ảnh minh chứng rõ nét." },
    { title: "Theo dõi hồ sơ", description: "Mở Hồ sơ của tôi để xem trạng thái và yêu cầu bổ sung." },
  ];
}

async function signOut() {
  await fetch("/api/auth/signout", { method: "POST" });
  window.location.href = "/login";
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
  const [collapsed, setCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dark, setDark] = useState(false);

  const groups = useMemo(() => {
    if (profile.role === "admin") return adminGroups;
    if (profile.role === "reviewer") return reviewerGroups;
    return submitterGroups;
  }, [profile.role]);

  const steps = useMemo(() => quickSteps(profile.role), [profile.role]);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");
    } catch {
      setCollapsed(false);
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const locked = mobileOpen || helpOpen;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen, helpOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      setHelpOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Theme init
  useEffect(() => {
    try {
      const t = window.localStorage.getItem("cntt-theme");
      setDark(t === "dark" || (!t && window.matchMedia("(prefers-color-scheme:dark)").matches));
    } catch { /* ok */ }
  }, []);

  function toggleTheme() {
    setDark((prev) => {
      const next = !prev;
      const theme = next ? "dark" : "light";
      try {
        window.localStorage.setItem("cntt-theme", theme);
      } catch { /* ok */ }
      document.documentElement.setAttribute("data-theme", theme);
      return next;
    });
  }

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch { /* ok */ }
      return next;
    });
  }

  const isActive = (href: string) => {
    if (href === "/applications") {
      return pathname === "/applications" || (pathname.startsWith("/applications/") && !pathname.startsWith("/applications/new"));
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const currentItem = groups.flatMap((g) => g.items).find((item) => isActive(item.href));
  const currentTitle = currentItem?.label || portalTitle(profile.role);
  const currentDescription = currentItem?.description || "Hệ thống xét duyệt thành tích Khoa Công nghệ thông tin";

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
        ? "Xử lý hồ sơ theo quyền được cấp"
        : "Một hồ sơ cho mỗi đợt xét";

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">Chuyển đến nội dung chính</a>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? "visible" : ""}`}
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}
        aria-label="Thanh điều hướng chính"
      >
        <div className="sidebar-header">
          <Link
            href={profile.role === "submitter" ? "/applications" : profile.role === "reviewer" ? "/review" : "/dashboard"}
            className="sidebar-brand"
            aria-label="Về trang làm việc chính"
          >
            <BrandLogo size={36} priority />
            <div className="sidebar-brand-text">
              <strong>CNTT DNTU</strong>
              <span>Xét duyệt thành tích</span>
            </div>
          </Link>

          <button
            type="button"
            className="sidebar-toggle"
            aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            aria-pressed={collapsed}
            title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            onClick={toggleCollapsed}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          <button
            type="button"
            className="sidebar-close"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          >
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
                      <span className="sidebar-link-icon">
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="sidebar-link-text">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </section>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user" aria-label="Thông tin tài khoản">
            <div className="sidebar-avatar" aria-hidden="true">
              {initials(profile)}
            </div>
            <div className="sidebar-user-info">
              <strong>{profile.full_name || "Tài khoản hệ thống"}</strong>
              <span>{profile.email}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`main ${collapsed ? "collapsed" : ""}`} id="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-menu-btn"
              aria-label="Mở menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>

            <div>
              <div className="topbar-breadcrumb">
                <span>{portalTitle(profile.role)}</span>
                <ChevronRight size={12} />
                <strong>{currentTitle}</strong>
              </div>
              <h1 className="topbar-title">{currentTitle}</h1>
              <p className="topbar-description">{currentDescription}</p>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-actions" aria-label="Công cụ nhanh">
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label={dark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
                title={dark ? "Chế độ sáng" : "Chế độ tối"}
                onClick={toggleTheme}
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label="Hướng dẫn nhanh"
                title="Hướng dẫn nhanh"
                onClick={() => setHelpOpen(true)}
              >
                <HelpCircle size={18} />
              </button>
            </div>

            <span className="topbar-role-badge">{roleLabel(profile.role)}</span>

            <div className="topbar-user">
              <div className="sidebar-avatar topbar-avatar">
                {initials(profile)}
              </div>
              <div>
                <div className="topbar-user-name">{profile.full_name || "Hệ thống"}</div>
                <div className="topbar-user-email">{profile.email}</div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-icon"
              aria-label="Đăng xuất"
              title="Đăng xuất"
              onClick={signOut}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>

      {/* Help overlay */}
      <div
        className={`help-overlay ${helpOpen ? "visible" : ""}`}
        aria-hidden="true"
        onClick={() => setHelpOpen(false)}
      />

      {/* Help panel */}
      <aside
        className={`help-panel ${helpOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Hướng dẫn sử dụng nhanh"
      >
        <div className="help-header">
          <div>
            <div className="help-header-icon">
              <Sparkles size={20} />
            </div>
            <h2>{portalTitle(profile.role)}</h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            aria-label="Đóng hướng dẫn"
            onClick={() => setHelpOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <p className="field-helper help-intro">
          Ba bước chính để hoàn thành công việc nhanh và hạn chế sai sót.
        </p>

        <div className="help-content">
          {steps.map((step, index) => (
            <div key={step.title} className="help-step">
              <div className="help-step-num">{index + 1}</div>
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
                <p className="text-xs text-secondary help-tip-body">
                  Nhấn <kbd className="help-kbd">Esc</kbd> để đóng menu hoặc bảng hướng dẫn. Trạng thái thu gọn sidebar được ghi nhớ trên thiết bị.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
