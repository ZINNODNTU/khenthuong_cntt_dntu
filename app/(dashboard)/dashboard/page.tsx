import Link from "next/link";
import {
  Activity, AlertTriangle, ArrowRight, CalendarRange, CheckCircle2,
  CircleAlert, Clock3, FileCheck2, Files, Gauge, History, Radio, Users,
  ShieldAlert, ImageIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getActiveBranchCodes } from "@/lib/branches";
import { getEvaluationPeriods } from "@/lib/periods";
import { StatusBadge } from "@/components/status-badge";
import type { Application } from "@/lib/types";
import type { ApplicationStatus } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

const STATUS_MONITOR: { key: ApplicationStatus; label: string; tone: string }[] = [
  { key: "draft", label: "Bản nháp", tone: "muted" },
  { key: "submitted", label: "Mới tiếp nhận", tone: "info" },
  { key: "review", label: "Đang xét", tone: "warning" },
  { key: "revision", label: "Chờ bổ sung", tone: "danger" },
  { key: "passed", label: "Đạt", tone: "success" },
  { key: "failed", label: "Không đạt", tone: "dark" },
];

const DAY = 86_400_000;
type MonitorApplication = Pick<Application, "id" | "code" | "subject_name" | "branch_code" | "application_type" | "collective_type" | "status" | "updated_at" | "submitted_at" | "decided_at">;

function KpiCard({ icon: Icon, label, value, note, tone = "info", href }: {
  icon: LucideIcon; label: string; value: string | number; note: string; tone?: string; href?: string;
}) {
  const body = (
    <div className={`card monitor-kpi monitor-kpi-${tone}`}>
      <div className="monitor-kpi-top">
        <span className="monitor-kpi-label">{label}</span>
        <span className="monitor-kpi-icon"><Icon size={18} aria-hidden="true" /></span>
      </div>
      <strong className="monitor-kpi-value">{value}</strong>
      <span className="monitor-kpi-note">{note}{href && <ArrowRight size={13} aria-hidden="true" />}</span>
    </div>
  );
  return href ? <Link className="monitor-kpi-link" href={href}>{body}</Link> : body;
}

function ageInDays(date: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(date).getTime()) / DAY));
}

function StatusDonut({ completed, processing, revision, total }: {
  completed: number; processing: number; revision: number; total: number;
}) {
  const safeTotal = Math.max(total, 1);
  const circumference = 2 * Math.PI * 42;
  const segments = [
    { label: "Đã kết luận", value: completed, className: "is-completed" },
    { label: "Đang xử lý", value: processing, className: "is-processing" },
    { label: "Chờ bổ sung", value: revision, className: "is-revision" },
  ];
  let offset = 0;

  return (
    <div className="monitor-donut-layout">
      <div className="monitor-donut" role="img" aria-label={`${completed} hồ sơ đã kết luận trên tổng số ${total}`}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="monitor-donut-track" cx="50" cy="50" r="42" />
          {segments.map((segment) => {
            const length = (segment.value / safeTotal) * circumference;
            const circle = (
              <circle
                key={segment.label}
                className={`monitor-donut-segment ${segment.className}`}
                cx="50" cy="50" r="42"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return circle;
          })}
        </svg>
        <div><strong>{total}</strong><span>Hồ sơ</span></div>
      </div>
      <div className="monitor-donut-legend">
        {segments.map((segment) => (
          <div key={segment.label}><span className={segment.className} /><small>{segment.label}</small><strong>{segment.value}</strong></div>
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const { supabase } = await requireRole(["admin"]);
  const periods = await getEvaluationPeriods(supabase);
  const now = Date.now();
  const open = periods.find((period) =>
    period.status === "open" && now >= new Date(period.starts_at).getTime() && now <= new Date(period.ends_at).getTime()
  );

  let appsQuery = supabase
    .from("applications")
    .select("id,code,subject_name,branch_code,application_type,collective_type,status,updated_at,submitted_at,decided_at")
    .order("updated_at", { ascending: false });
  if (open) appsQuery = appsQuery.eq("evaluation_period_id", open.id);

  const [appsResult, branches, auditResult, countsResult, profileResult, evidenceResult] = await Promise.all([
    appsQuery,
    getActiveBranchCodes(supabase),
    supabase.from("audit_logs").select("id,action,entity_type,created_at").order("created_at", { ascending: false }).limit(7),
    supabase.from("applications").select("application_type", { count: "exact", head: true }).eq("application_type", "individual"),
    supabase.from("profiles").select("id,is_active"),
    supabase.from("evidences").select("id", { count: "exact", head: true }),
  ]);

  const applications = (appsResult.data || []) as MonitorApplication[];
  const totalAccounts = profileResult.data?.length || 0;
  const activeAccounts = profileResult.data?.filter((p) => p.is_active).length || 0;
  const evidenceCount = evidenceResult.count ?? 0;

  const totalMembers = countsResult.count ?? 0;
  const membersSubmitted = applications.filter((a) => a.application_type === "individual").length;
  const memberRate = totalMembers ? Math.round((membersSubmitted / totalMembers) * 100) : 0;

  const counts = Object.fromEntries(STATUS_MONITOR.map(({ key }) => [key, 0])) as Record<ApplicationStatus, number>;
  applications.forEach((application) => { counts[application.status] += 1; });

  const queue = applications
    .filter(({ status }) => status === "submitted" || status === "review")
    .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
  const stale = queue.filter(({ updated_at }) => ageInDays(updated_at, now) >= 3);
  const critical = stale.filter(({ updated_at }) => ageInDays(updated_at, now) >= 7);
  const completed = counts.passed + counts.failed;
  const completionRate = applications.length ? Math.round((completed / applications.length) * 100) : 0;
  const lastSevenDays = now - 7 * DAY;
  const submittedThisWeek = applications.filter(({ submitted_at }) => submitted_at && new Date(submitted_at).getTime() >= lastSevenDays).length;
  const decidedThisWeek = applications.filter(({ decided_at }) => decided_at && new Date(decided_at).getTime() >= lastSevenDays).length;
  const individualByBranch = new Map<string, number>();
  applications.filter((a) => a.application_type === "individual").forEach((a) => {
    if (a.branch_code) individualByBranch.set(a.branch_code, (individualByBranch.get(a.branch_code) || 0) + 1);
  });
  const coveredBranches = new Set(applications.map(({ branch_code }) => branch_code).filter(Boolean));
  const coverageRate = branches.length ? Math.round((coveredBranches.size / branches.length) * 100) : 0;
  const latest = applications.slice(0, 8);
  const maxStatusCount = Math.max(1, ...Object.values(counts));
  const audits = auditResult.data || [];

  // Deadlines — periods ending within 7 days
  const endingSoon = periods.filter((p) => {
    const end = new Date(p.ends_at).getTime();
    return p.status === "open" && end > now && end - now <= 7 * DAY;
  });

  return (
    <>
      <PageHeader
        eyebrow="TRUNG TÂM GIÁM SÁT"
        title="Tổng quan vận hành"
        description={open ? `Đợt đang mở: ${open.name}` : "Chưa có đợt xét đang mở — số liệu hiển thị toàn hệ thống."}
      >
        <Link href="/periods"><Button variant="outline"><CalendarRange size={16} />Quản lý đợt xét</Button></Link>
        <Link href="/review"><Button><Radio size={16} />Mở hàng đợi ({queue.length})</Button></Link>
      </PageHeader>

      <div className={`monitor-status ${open ? "is-live" : "is-idle"}`} role="status">
        <span className="monitor-status-pulse" aria-hidden="true" />
        <div><strong>{open ? "Đang giám sát trực tiếp" : "Chế độ tổng hợp"}</strong><span>Cập nhật lúc {new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(now))}</span></div>
        {open && <span className="monitor-period-end">Kết thúc {formatDate(open.ends_at)}</span>}
      </div>

      {/* 10 KPI cards */}
      <div className="monitor-kpi-grid">
        <KpiCard label="Tổng hồ sơ" value={applications.length} note={open ? "Trong đợt hiện tại" : "Toàn hệ thống"} icon={Files} />
        <KpiCard label="Cần xử lý" value={queue.length} note={`${counts.submitted} mới · ${counts.review} đang xét`} icon={Clock3} tone="warning" href="/review" />
        <KpiCard label="Quá hạn ≥ 3 ngày" value={stale.length} note={critical.length ? `${critical.length} hồ sơ trên 7 ngày` : "Không có mức nghiêm trọng"} icon={AlertTriangle} tone={critical.length ? "danger" : "success"} href="/review" />
        <KpiCard label="Chờ bổ sung" value={counts.revision} note="Đang chờ người nộp phản hồi" icon={CircleAlert} tone="danger" href="/applications?status=revision" />
        <KpiCard label="Tỷ lệ hoàn tất" value={`${completionRate}%`} note={`${completed}/${applications.length} hồ sơ đã kết luận`} icon={Gauge} tone="success" />
        <KpiCard label="Tổng tài khoản" value={totalAccounts} note={`${activeAccounts} đang hoạt động`} icon={Users} href="/admin/users" />
        <KpiCard label="Tài khoản hoạt động" value={activeAccounts} note={`${totalAccounts - activeAccounts} đã khóa`} icon={ShieldAlert} tone={activeAccounts > totalAccounts * 0.5 ? "success" : "warning"} href="/admin/users" />
        <KpiCard label="Minh chứng" value={evidenceCount} note="Tổng số tệp tin" icon={ImageIcon} href="/admin/evidences" />
        <KpiCard label="Đã nộp tuần này" value={submittedThisWeek} note="Hồ sơ mới trong 7 ngày" icon={Activity} />
        <KpiCard label="Đợt sắp kết thúc" value={endingSoon.length} note={endingSoon.length ? "Cần gia hạn hoặc đóng" : "Không có"} icon={CalendarRange} tone={endingSoon.length ? "danger" : "success"} href="/periods" />
      </div>

      <div className="monitor-primary-grid">
        <section className="card monitor-panel">
          <div className="monitor-panel-heading"><div><span className="monitor-panel-eyebrow">LUỒNG XỬ LÝ</span><h2>Phân bố trạng thái</h2></div><FileCheck2 size={20} aria-hidden="true" /></div>
          <div className="monitor-chart-grid">
            <StatusDonut
              completed={completed}
              processing={counts.submitted + counts.review}
              revision={counts.revision}
              total={applications.length}
            />
            <div className="monitor-status-list">
              {STATUS_MONITOR.map(({ key, label, tone }) => (
                <div className="monitor-status-row" key={key}>
                  <div className="monitor-status-meta"><span>{label}</span><strong>{counts[key]}</strong></div>
                  <div className="monitor-progress" role="progressbar" aria-label={`${label}: ${counts[key]} hồ sơ`} aria-valuemin={0} aria-valuemax={maxStatusCount} aria-valuenow={counts[key]}>
                    <span className={`monitor-progress-${tone}`} style={{ width: `${(counts[key] / maxStatusCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="monitor-throughput">
            <div><Activity size={17} /><span>Nộp 7 ngày qua</span><strong>{submittedThisWeek}</strong></div>
            <div><CheckCircle2 size={17} /><span>Kết luận 7 ngày qua</span><strong>{decidedThisWeek}</strong></div>
          </div>
        </section>

        <section className="card monitor-panel">
          <div className="monitor-panel-heading"><div><span className="monitor-panel-eyebrow">ƯU TIÊN NGAY</span><h2>Hồ sơ tồn lâu nhất</h2></div><AlertTriangle size={20} aria-hidden="true" /></div>
          <div className="monitor-alert-list">
            {queue.slice(0, 6).map((application) => {
              const age = ageInDays(application.updated_at, now);
              return <Link href={`/applications/${application.id}`} className={`monitor-alert-row ${age >= 7 ? "is-critical" : age >= 3 ? "is-warning" : ""}`} key={application.id}>
                <span className="monitor-alert-age">{age} ngày</span>
                <span className="monitor-alert-content"><strong>{application.subject_name}</strong><small>{application.code} · {application.branch_code || "CLB"}</small></span>
                <StatusBadge status={application.status} />
              </Link>;
            })}
            {!queue.length && <div className="monitor-empty"><CheckCircle2 size={28} /><strong>Hàng đợi đã sạch</strong><span>Không có hồ sơ chờ xử lý.</span></div>}
          </div>
          {!!queue.length && <Link className="monitor-panel-link" href="/review">Xem toàn bộ hàng đợi <ArrowRight size={14} /></Link>}
        </section>
      </div>

      <div className="monitor-secondary-grid">
        <section className="card monitor-panel">
          <div className="monitor-panel-heading"><div><span className="monitor-panel-eyebrow">ĐỘ PHỦ ĐƠN VỊ</span><h2>Tiến độ Chi đoàn</h2></div><strong className="monitor-coverage-value">{coverageRate}%</strong></div>
          <div className="monitor-coverage-bar"><span style={{ width: `${coverageRate}%` }} /></div>
          <p className="monitor-panel-caption">{coveredBranches.size}/{branches.length} Chi đoàn đã có hồ sơ trong phạm vi đang xem</p>
          <div className="monitor-coverage-stats">
            <div><Users size={20} /><div><strong>{totalMembers.toLocaleString("vi-VN")}</strong><span>Đoàn viên có hồ sơ</span></div></div>
            <div><CheckCircle2 size={20} /><div><strong>{membersSubmitted.toLocaleString("vi-VN")}</strong><span>Hồ sơ đã nộp</span></div></div>
            <div><Activity size={20} /><div><strong>{memberRate}%</strong><span>Tỷ lệ tham gia</span></div></div>
          </div>
          <div className="monitor-branch-grid">
            {branches.map((branch) => {
              const count = individualByBranch.get(branch);
              return <div className={`monitor-branch${count ? " is-covered" : ""}`} key={branch}><span>{branch}</span><small>{count ? `${count} hồ sơ` : "Chưa nộp"}</small></div>;
            })}
          </div>
        </section>

        <section className="card monitor-panel">
          <div className="monitor-panel-heading"><div><span className="monitor-panel-eyebrow">NHẬT KÝ</span><h2>Hoạt động gần đây</h2></div><History size={20} aria-hidden="true" /></div>
          <div className="monitor-timeline">
            {audits.map((audit) => <div className="monitor-timeline-item" key={audit.id}><span className="monitor-timeline-dot" /><div><strong>{String(audit.action).replaceAll("_", " ")}</strong><span>{audit.entity_type} · {formatDate(audit.created_at)}</span></div></div>)}
            {!audits.length && <div className="monitor-empty"><History size={26} /><strong>Chưa có hoạt động</strong><span>Nhật ký mới sẽ xuất hiện tại đây.</span></div>}
          </div>
        </section>
      </div>

      <section className="card monitor-panel monitor-latest">
        <div className="monitor-panel-heading"><div><span className="monitor-panel-eyebrow">DÒNG DỮ LIỆU</span><h2>Hồ sơ cập nhật mới nhất</h2></div><Link className="monitor-panel-link" href="/applications">Xem tất cả <ArrowRight size={14} /></Link></div>
        <div className="table-wrap table-responsive-card">
          <table className="table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Đối tượng</th>
                <th>Đơn vị</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((application) => (
                <tr key={application.id}>
                  <td data-label="Mã"><b>{application.code}</b></td>
                  <td data-label="Đối tượng"><Link className="font-medium monitor-table-link" href={`/applications/${application.id}`}>{application.subject_name}</Link></td>
                  <td data-label="Đơn vị" className="text-secondary">{application.branch_code || "CLB"}</td>
                  <td data-label="Loại" className="text-secondary">{application.application_type === "individual" ? "Cá nhân" : application.collective_type === "club" ? "Tập thể CLB" : "Tập thể Chi đoàn"}</td>
                  <td data-label="Trạng thái"><StatusBadge status={application.status} /></td>
                  <td data-label="Cập nhật" className="text-secondary">{formatDate(application.updated_at)}</td>
                </tr>
              ))}
              {!latest.length && (
                <tr>
                  <td colSpan={6}><div className="monitor-empty"><Files size={28} /><strong>Chưa có hồ sơ</strong><span>Dữ liệu mới sẽ xuất hiện tại đây.</span></div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
