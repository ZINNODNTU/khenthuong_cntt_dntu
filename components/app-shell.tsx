"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3, Building2, CalendarRange, ClipboardCheck, FilePlus2, Files,
  ListChecks, Settings, ShieldCheck, Users,
} from "lucide-react";
import type { Profile } from "@/lib/types";
import type { NavGroup } from "@/components/layout/types";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { HelpPanel } from "@/components/layout/help-panel";

const adminGroups: NavGroup[] = [
  { label: "Điều hành", items: [
    { href: "/dashboard", label: "Tổng quan", description: "Số liệu và tiến độ hệ thống", icon: BarChart3 },
    { href: "/applications", label: "Toàn bộ hồ sơ", description: "Tra cứu hồ sơ đã tiếp nhận", icon: Files },
    { href: "/review", label: "Xét duyệt hồ sơ", description: "Hàng đợi cần xử lý", icon: ClipboardCheck },
    { href: "/results", label: "Kết quả xét duyệt", description: "Tổng hợp quyết định", icon: ListChecks },
  ]},
  { label: "Quản trị dữ liệu", items: [
    { href: "/periods", label: "Đợt xét thành tích", description: "Thời gian và phạm vi tiếp nhận", icon: CalendarRange },
    { href: "/branches", label: "Quản lý Chi đoàn", description: "Đơn vị và tài khoản đại diện", icon: Users },
    { href: "/clubs", label: "Quản lý Câu lạc bộ", description: "CLB và tài khoản đại diện", icon: Building2 },
    { href: "/admin/users", label: "Tài khoản hệ thống", description: "Phân quyền và trạng thái", icon: ShieldCheck },
    { href: "/settings", label: "Cấu hình vận hành", description: "Kho ảnh và kết nối hệ thống", icon: Settings },
  ]},
];

const reviewerGroups: NavGroup[] = [
  { label: "Xét duyệt", items: [
    { href: "/review", label: "Hồ sơ cần xét", description: "Danh sách đang chờ xử lý", icon: ClipboardCheck },
    { href: "/results", label: "Kết quả đã xử lý", description: "Lịch sử và kết luận", icon: ListChecks },
  ]},
];

const submitterGroups: NavGroup[] = [
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
