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
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Sparkles,
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

type QuickStep = {
  title: string;
  description: string;
};

const SIDEBAR_STORAGE_KEY = "cntt-workspace-sidebar-collapsed";

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
    label: "Quản trị dữ liệu",
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
        description: "Danh sách đang chờ xử lý",
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
        description: "Tạo hồ sơ theo từng bước",
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
      {
        title: "Mở đợt xét",
        description:
          "Tạo đợt xét, chọn thời gian và loại hồ sơ được phép tiếp nhận.",
      },
      {
        title: "Chuẩn bị tài khoản",
        description:
          "Kiểm tra Chi đoàn, CLB và cấp tài khoản đại diện còn thiếu.",
      },
      {
        title: "Theo dõi tiến độ",
        description:
          "Dùng Tổng quan và Toàn bộ hồ sơ để giám sát trạng thái xử lý.",
      },
    ];
  }

  if (role === "reviewer") {
    return [
      {
        title: "Mở hàng đợi",
        description:
          "Chọn Hồ sơ cần xét để xem các hồ sơ đã gửi và đang xử lý.",
      },
      {
        title: "Kiểm tra minh chứng",
        description:
          "Mở từng hồ sơ, đối chiếu nội dung và ảnh trước khi kết luận.",
      },
      {
        title: "Ghi nhận kết quả",
        description:
          "Chọn Đạt, Không đạt hoặc Yêu cầu bổ sung kèm nhận xét rõ ràng.",
      },
    ];
  }

  return [
    {
      title: "Chuẩn bị thông tin",
      description:
        "Kiểm tra đúng MSSV, Chi đoàn và đợt xét trước khi bắt đầu.",
    },
    {
      title: "Nộp theo từng bước",
      description:
        "Điền thành tích, thêm hoạt động và tải ảnh minh chứng rõ nét.",
    },
    {
      title: "Theo dõi hồ sơ",
      description:
        "Mở Hồ sơ của tôi để xem trạng thái và yêu cầu bổ sung.",
    },
  ];
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

  const groups = useMemo(() => {
    if (profile.role === "admin") return adminGroups;
    if (profile.role === "reviewer") return reviewerGroups;
    return submitterGroups;
  }, [profile.role]);

  const steps = useMemo(() => quickSteps(profile.role), [profile.role]);

  useEffect(() => {
    try {
      setCollapsed(
        window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true",
      );
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

    return () => {
      document.body.style.overflow = "";
    };
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

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(
          SIDEBAR_STORAGE_KEY,
          String(next),
        );
      } catch {
        // The UI still works when browser storage is unavailable.
      }

      return next;
    });
  }

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
    currentItem?.description ||
    "Hệ thống xét duyệt thành tích Khoa Công nghệ thông tin";

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
    <div
      className={[
        "workspace-shell",
        `role-${profile.role}`,
        collapsed ? "is-collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <a className="skip-link" href="#workspace-content">
        Chuyển đến nội dung chính
      </a>

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
          <Link
            href={
              profile.role === "submitter"
                ? "/applications"
                : profile.role === "reviewer"
                  ? "/review"
                  : "/dashboard"
            }
            className="workspace-brand-link"
            aria-label="Về trang làm việc chính"
          >
            <BrandLogo size={44} priority />
            <div className="workspace-brand-copy">
              <strong>CNTT DNTU</strong>
              <span>Xét duyệt thành tích</span>
            </div>
          </Link>

          <button
            type="button"
            className="workspace-sidebar-close"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <button
          type="button"
          className="workspace-collapse-button"
          aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          aria-pressed={collapsed}
          title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          onClick={toggleCollapsed}
        >
          {collapsed ? (
            <PanelLeftOpen size={17} />
          ) : (
            <PanelLeftClose size={17} />
          )}
        </button>

        <div className="workspace-portal-card">
          <span>Không gian làm việc</span>
          <strong>{portalTitle(profile.role)}</strong>
          <small>{scopeTitle}</small>
        </div>

        <div className="workspace-navigation">
          {groups.map((group) => (
            <section className="workspace-nav-group" key={group.label}>
              <div className="workspace-nav-label">
                <span>{group.label}</span>
              </div>
              <nav aria-label={group.label}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={active ? "is-active" : ""}
                      aria-current={active ? "page" : undefined}
                      aria-label={item.label}
                      data-tooltip={item.label}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="workspace-nav-icon">
                        <Icon size={19} strokeWidth={2} />
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
            <button
              type="button"
              className="workspace-icon-button"
              aria-label="Mở hướng dẫn nhanh"
              title="Hướng dẫn nhanh"
              onClick={() => setHelpOpen(true)}
            >
              <HelpCircle size={18} />
            </button>

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

        <div className="workspace-content" id="workspace-content">
          {children}
        </div>
      </main>

      <button
        type="button"
        className={`workspace-help-backdrop ${helpOpen ? "is-visible" : ""}`}
        aria-label="Đóng hướng dẫn"
        onClick={() => setHelpOpen(false)}
      />

      <aside
        className={`workspace-help-panel ${helpOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Hướng dẫn sử dụng nhanh"
      >
        <div className="workspace-help-head">
          <div className="workspace-help-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <span>HƯỚNG DẪN NHANH</span>
            <h2>{portalTitle(profile.role)}</h2>
          </div>
          <button
            type="button"
            className="workspace-help-close"
            aria-label="Đóng hướng dẫn"
            onClick={() => setHelpOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <p className="workspace-help-intro">
          Ba bước chính để hoàn thành công việc nhanh và hạn chế sai sót.
        </p>

        <div className="workspace-help-steps">
          {steps.map((step, index) => (
            <article key={step.title}>
              <span>{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="workspace-shortcut-card">
          <Keyboard size={18} />
          <div>
            <strong>Mẹo thao tác</strong>
            <p>
              Nhấn <kbd>Esc</kbd> để đóng menu hoặc bảng hướng dẫn.
              Trạng thái thu gọn sidebar được ghi nhớ trên thiết bị.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
