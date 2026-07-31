"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Award, BarChart3, Building, Building2, CalendarRange, ClipboardCheck,
  FileImage, FilePlus2, Files, History,
  ListChecks, MessageSquare, Settings, ShieldCheck, User, Users,
} from "lucide-react";
import type { Profile } from "@/lib/types";
import type { NavGroup } from "@/components/layout/types";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { HelpPanel } from "@/components/layout/help-panel";

const adminGroups: NavGroup[] = [
  // Nhóm 1 — Điều hành
  { label: "Điều hành", items: [
    { href: "/dashboard", label: "Tổng quan", description: "Số liệu và tiến độ hệ thống", icon: BarChart3 },
    { href: "/admin/pending", label: "Việc cần xử lý", description: "Hồ sơ chờ, yêu cầu bổ sung", icon: ClipboardCheck },
  ]},
  // Nhóm 2 — Nghiệp vụ xét khen thưởng
  { label: "Nghiệp vụ xét thưởng", items: [
    { href: "/periods", label: "Đợt xét thành tích", description: "Thời gian và phạm vi tiếp nhận", icon: CalendarRange },
    { href: "/applications", label: "Hồ sơ thành tích", description: "Tất cả hồ sơ đã tiếp nhận", icon: Files },
    { href: "/applications?type=collective", label: "Hồ sơ tập thể", description: "Tập thể Chi đoàn và CLB", icon: Users },
    { href: "/applications?type=individual", label: "Hồ sơ cá nhân", description: "Cá nhân sinh viên", icon: User },
    { href: "/review", label: "Thẩm định", description: "Xét duyệt hồ sơ", icon: ClipboardCheck },
    { href: "/review/objections", label: "Phản biện – Giải trình", description: "Xử lý khiếu nại", icon: MessageSquare },
    { href: "/results", label: "Kết quả xét duyệt", description: "Tổng hợp quyết định", icon: Award },
  ]},
  // Nhóm 3 — Quản lý dữ liệu
  { label: "Quản lý dữ liệu", items: [
    { href: "/admin/users", label: "Quản lý tài khoản", description: "Phân quyền và trạng thái", icon: ShieldCheck },
    { href: "/branches", label: "Quản lý Chi đoàn", description: "Đơn vị và tài khoản đại diện", icon: Users },
    { href: "/clubs", label: "Quản lý CLB", description: "CLB và tài khoản đại diện", icon: Building2 },
    { href: "/admin/units", label: "Quản lý đơn vị", description: "Phân loại và trạng thái đơn vị", icon: Building },
    { href: "/admin/evidences", label: "Quản lý minh chứng", description: "Duyệt và xóa tệp", icon: FileImage },
  ]},
  // Nhóm 4 — Quản trị hệ thống
  { label: "Quản trị hệ thống", items: [
    { href: "/admin/audit-log", label: "Nhật ký hoạt động", description: "Lịch sử thao tác hệ thống", icon: History },
    { href: "/settings", label: "Cấu hình hệ thống", description: "Kết nối và kho ảnh", icon: Settings },
  ]},
];

const reviewerGroups: NavGroup[] = [
  { label: "Xét duyệt", items: [
    { href: "/review", label: "Hồ sơ cần xét", description: "Danh sách đang chờ xử lý", icon: ClipboardCheck },
    { href: "/results", label: "Kết quả đã xử lý", description: "Lịch sử và kết luận", icon: ListChecks },
  ]},
];

const submitterGroups: NavGroup[] = [
  { label: "Trang chủ", items: [
    { href: "/submitter", label: "Tổng quan", description: "Dashboard cá nhân", icon: BarChart3 },
  ]},
  { label: "Hồ sơ thành tích", items: [
    { href: "/applications/new", label: "Nộp thành tích", description: "Tạo hồ sơ theo từng bước", icon: FilePlus2 },
    { href: "/applications", label: "Hồ sơ của tôi", description: "Theo dõi trạng thái xử lý", icon: Files },
  ]},
];

function portalTitle(role: string) {
  if (role === "admin") return "Không gian quản trị";
  if (role === "reviewer") return "Không gian xét duyệt";
  return "Không gian nộp hồ sơ";
}

function quickSteps(role: string) {
  if (role === "admin") return [
    { title: "Mở đợt xét", description: "Tạo đợt xét, chọn thời gian và loại hồ sơ được phép tiếp nhận." },
    { title: "Chuẩn bị tài khoản", description: "Kiểm tra Chi đoàn, CLB và cấp tài khoản đại diện còn thiếu." },
    { title: "Theo dõi tiến độ", description: "Dùng Tổng quan và Toàn bộ hồ sơ để giám sát trạng thái xử lý." },
  ];
  if (role === "reviewer") return [
    { title: "Mở hàng đợi", description: "Chọn Hồ sơ cần xét để xem các hồ sơ đã gửi và đang xử lý." },
    { title: "Kiểm tra minh chứng", description: "Mở từng hồ sơ, đối chiếu nội dung và ảnh trước khi kết luận." },
    { title: "Ghi nhận kết quả", description: "Chọn Đạt, Không đạt hoặc Yêu cầu bổ sung kèm nhận xét rõ ràng." },
  ];
  return [
    { title: "Chuẩn bị thông tin", description: "Kiểm tra đúng MSSV, Chi đoàn và đợt xét trước khi bắt đầu." },
    { title: "Nộp theo từng bước", description: "Điền thành tích, thêm hoạt động và tải ảnh minh chứng rõ nét." },
    { title: "Theo dõi hồ sơ", description: "Mở Hồ sơ của tôi để xem trạng thái và yêu cầu bổ sung." },
  ];
}

export function AppShell({ profile, activeBranchCount, children }: {
  profile: Profile; activeBranchCount: number; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const groups = useMemo(() => {
    if (profile.role === "admin") return adminGroups;
    if (profile.role === "reviewer") return reviewerGroups;
    return submitterGroups;
  }, [profile.role]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

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

  const isActive = (href: string) => {
    if (href === "/applications") return pathname === "/applications" || (pathname.startsWith("/applications/") && !pathname.startsWith("/applications/new"));
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const currentItem = groups.flatMap((g) => g.items).find((item) => isActive(item.href));
  const currentTitle = currentItem?.label || portalTitle(profile.role);
  const currentDescription = currentItem?.description || "Hệ thống xét duyệt thành tích Khoa Công nghệ thông tin";

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">Chuyển đến nội dung chính</a>
      <Sidebar groups={groups} role={profile.role} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <main className="main" id="main-content">
        <Topbar profile={profile} title={currentTitle} description={currentDescription} onMenuClick={() => setMobileOpen(true)} onHelpOpen={() => setHelpOpen(true)} />
        <div className="content">{children}</div>
      </main>
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} title={portalTitle(profile.role)} steps={quickSteps(profile.role)} />
    </div>
  );
}
