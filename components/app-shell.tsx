"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, CalendarRange, ClipboardCheck, FilePlus2, Files, ListChecks, Settings, ShieldCheck, Users, } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { SignOutButton } from "@/components/sign-out-button";
import type { Profile, UserRole } from "@/lib/types";
type NavItem = readonly [
    string,
    string,
    typeof BarChart3
];
const adminNav: NavItem[] = [
    ["/dashboard", "Tổng quan quản trị", BarChart3],
    ["/periods", "Đợt xét thành tích", CalendarRange],
    ["/applications", "Toàn bộ hồ sơ", Files],
    ["/review", "Hàng đợi xét duyệt", ClipboardCheck],
    ["/results", "Kết quả xét duyệt", ListChecks],
    ["/branches", "Quản lý chi đoàn", Users],
    ["/clubs", "Quản lý CLB", Building2],
];
const reviewerNav: NavItem[] = [
    ["/review", "Hồ sơ cần xét", ClipboardCheck],
    ["/results", "Kết quả đã xử lý", ListChecks],
];
const submitterNav: NavItem[] = [
    ["/applications/new", "Nộp thành tích", FilePlus2],
    ["/applications", "Hồ sơ của tôi", Files],
];
function roleLabel(role: UserRole) {
    if (role === "admin")
        return "Quản trị viên";
    if (role === "reviewer")
        return "Cán bộ xét duyệt";
    return "Người nộp hồ sơ";
}
function portalTitle(role: UserRole) {
    if (role === "admin")
        return "Cổng quản trị";
    if (role === "reviewer")
        return "Cổng xét duyệt";
    return "Cổng nộp thành tích";
}
export function AppShell({ profile, activeBranchCount, children, }: {
    profile: Profile;
    activeBranchCount: number;
    children: React.ReactNode;
}) {
    const path = usePathname();
    const isActive = (href: string) => href === "/applications"
        ? path === "/applications" ||
            (path.startsWith("/applications/") && !path.startsWith("/applications/new"))
        : path === href || path.startsWith(`${href}/`);
    const nav = profile.role === "admin"
        ? adminNav
        : profile.role === "reviewer"
            ? reviewerNav
            : submitterNav;
    const scopeTitle = profile.role === "submitter"
        ? profile.submission_scope === "club"
            ? "Tài khoản đại diện CLB"
            : profile.submission_scope === "branch"
                ? `Đại diện Chi đoàn ${profile.branch_code || "chưa được gán"}`
                : `Cá nhân · ${profile.branch_code || "chưa được gán"}`
        : "Khoa Công nghệ thông tin";
    const scopeDetail = profile.role === "admin"
        ? `${activeBranchCount} chi đoàn đang hoạt động`
        : profile.role === "reviewer"
            ? "Phạm vi hồ sơ được phân quyền"
            : "Mỗi đối tượng nộp 01 hồ sơ trong mỗi đợt";
    return (<div className={`app-shell role-${profile.role}`}>
      <aside className="sidebar">
        <div className="brand">
          <BrandLogo size={52} priority/>
          <div>
            <strong>XÉT DUYỆT THÀNH TÍCH</strong>
            <span>Khoa Công nghệ thông tin</span>
          </div>
        </div>

        <div className="portal-card">
          <span>Không gian làm việc</span>
          <strong>{portalTitle(profile.role)}</strong>
        </div>

        <div className="menu-label">Chức năng</div>
        <nav className="nav">
          {nav.map(([href, label, Icon]) => (<Link key={href} href={href} className={isActive(href) ? "active" : ""}>
              <Icon size={17}/>
              {label}
            </Link>))}
        </nav>

        {profile.role === "admin" && (<>
            <div className="menu-label">Thiết lập</div>
            <nav className="nav">
              <Link href="/admin/users" className={path.startsWith("/admin/users") ? "active" : ""}>
                <ShieldCheck size={17}/>
                Tài khoản hệ thống
              </Link>
              <Link href="/settings" className={path.startsWith("/settings") ? "active" : ""}>
                <Settings size={17}/>
                Cấu hình vận hành
              </Link>
            </nav>
          </>)}

        <div className="scope">
          <strong>{scopeTitle}</strong>
          <span>{scopeDetail}</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">
            <span>{portalTitle(profile.role)}</span>
            <strong>Khoa CNTT</strong>
          </div>
          <div className="user">
            <div className="role-chip">{roleLabel(profile.role)}</div>
            <div className="user-info">
              <strong>{profile.full_name}</strong>
              <span>{profile.email}</span>
            </div>
            <div className="avatar">
              {(profile.full_name || profile.email).slice(0, 2).toUpperCase()}
            </div>
            <SignOutButton />
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>);
}

