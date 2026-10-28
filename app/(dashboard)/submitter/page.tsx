import Link from "next/link";
import {
  ArrowRight, BadgeCheck, CalendarDays, Check, CheckCircle2, ChevronRight,
  ClipboardList, Clock3, FilePlus2, Files, FolderOpen, ShieldCheck,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getEvaluationPeriods } from "@/lib/periods";
import { formatDate } from "@/lib/utils";
import styles from "./submitter-dashboard.module.css";

const statusMeta: Record<string, { text: string; tone: string }> = {
  draft: { text: "Bản nháp", tone: "muted" },
  submitted: { text: "Đã gửi", tone: "info" },
  review: { text: "Đang xét duyệt", tone: "warning" },
  revision: { text: "Cần bổ sung", tone: "danger" },
  passed: { text: "Đạt", tone: "success" },
  failed: { text: "Không đạt", tone: "danger" },
};

export default async function SubmitterDashboard() {
  const { supabase, profile } = await requireRole(["submitter"]);
  const periods = await getEvaluationPeriods(supabase);
  const now = Date.now();
  const openPeriod = periods.find(period =>
    period.status === "open" &&
    now >= new Date(period.starts_at).getTime() &&
    now <= new Date(period.ends_at).getTime() &&
    profile.submission_scope === "individual" && period.allow_individual
  );
  const { data: recentApps } = await supabase
    .from("applications")
    .select("id,code,status,updated_at,subject_name")
    .eq("created_by", profile.id)
    .eq("application_type", "individual")
    .order("updated_at", { ascending: false })
    .limit(4);
  const firstName = profile.full_name?.trim().split(/\s+/).at(-1) || "bạn";
  const daysLeft = openPeriod ? Math.max(0, Math.ceil((new Date(openPeriod.ends_at).getTime() - now) / 86_400_000)) : null;
  const recent = recentApps || [];

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <div>
          <span className={styles.eyebrow}>KHEN THƯỞNG ĐOÀN – HỘI · KHOA CNTT</span>
          <h1>Xin chào, {firstName}.<span>Quản lý hồ sơ của bạn.</span></h1>
          <p>Tra cứu đợt xét, hoàn thiện minh chứng và theo dõi từng bước xử lý.</p>
          <div className={styles.welcomeActions}>
            {openPeriod ? (
              <Link href="/applications/new" className={styles.primaryCta}><FilePlus2 size={18} /> Nộp thành tích <ArrowRight size={17} /></Link>
            ) : (
              <Link href="/applications" className={styles.primaryCta}><FolderOpen size={18} /> Xem hồ sơ của tôi <ArrowRight size={17} /></Link>
            )}
            <Link href="/criteria" className={styles.secondaryCta}>Xem bộ tiêu chí <ChevronRight size={16} /></Link>
          </div>
        </div>
        <div className={styles.heroCard}>
          <span className={styles.heroCardIcon}><ShieldCheck size={23} /></span>
          <span className={styles.heroCardTag}>THÔNG TIN XÉT DUYỆT</span>
          <strong>Hồ sơ được đối chiếu theo từng tiêu chí.</strong>
          <p>Đính kèm tài liệu theo đúng yêu cầu của từng tiêu chí. Kết quả được ghi nhận theo mức Đạt hoặc Không đạt.</p>
          <div className={styles.heroCardFooter}><CheckCircle2 size={16} /> 09 tiêu chí cá nhân C1–C9</div>
        </div>
      </div>

      <div className={styles.overview}>
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}><CalendarDays size={20} /></div>
          <div><span>Đợt xét hiện tại</span><strong>{openPeriod ? "Đang tiếp nhận" : "Chưa mở"}</strong><small>{openPeriod ? openPeriod.name : "Theo dõi đợt xét tiếp theo"}</small></div>
          <span className={openPeriod ? styles.liveBadge : styles.quietBadge}>{openPeriod ? "Đang mở" : "Tạm đóng"}</span>
        </div>
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}><Clock3 size={20} /></div>
          <div><span>Thời hạn nộp hồ sơ</span><strong>{openPeriod ? formatDate(openPeriod.ends_at) : "Chưa xác định"}</strong><small>{daysLeft !== null ? (daysLeft === 0 ? "Hạn nộp là hôm nay" : `Còn ${daysLeft} ngày để hoàn thiện`) : "Sẽ được cập nhật khi mở đợt"}</small></div>
        </div>
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}><ClipboardList size={20} /></div>
          <div><span>Quy trình đánh giá</span><strong>Đạt / Không đạt</strong><small>Minh chứng theo từng tiêu chí</small></div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.panel} aria-labelledby="recent-heading">
          <div className={styles.panelHead}><div><span className={styles.panelEyebrow}>HỒ SƠ CỦA BẠN</span><h2 id="recent-heading">Hoạt động gần đây</h2><p>Tiếp tục hồ sơ đã lưu hoặc xem kết quả mới nhất.</p></div><span className={styles.panelIcon}><Files size={20} /></span></div>
          {recent.length ? <div className={styles.recentList}>
            {recent.map(app => {
              const status = statusMeta[app.status] || { text: app.status, tone: "muted" };
              return <Link href={`/applications/${app.id}`} key={app.id} className={styles.recentItem}>
                <div className={styles.docIcon}><Files size={18} /></div>
                <div className={styles.docInfo}><strong>{app.subject_name}</strong><small>{app.code} <span aria-hidden="true">·</span> {formatDate(app.updated_at)}</small></div>
                <span className={`${styles.statusBadge} ${styles[status.tone]}`}>{status.text}</span>
                <ChevronRight size={16} className={styles.itemArrow} />
              </Link>;
            })}
          </div> : <div className={styles.emptyState}>
            <span><FolderOpen size={28} /></span><strong>Chưa có hồ sơ nào</strong><p>Bắt đầu bằng cách tạo hồ sơ và tải các minh chứng đầu tiên.</p>
            {openPeriod && <Link href="/applications/new">Tạo hồ sơ đầu tiên <ArrowRight size={15} /></Link>}
          </div>}
          <Link className={styles.viewAll} href="/applications">Xem tất cả hồ sơ <ArrowRight size={16} /></Link>
        </section>

        <section className={styles.panel} aria-labelledby="guide-heading">
          <div className={styles.panelHead}><div><span className={styles.panelEyebrow}>DÀNH CHO BẠN</span><h2 id="guide-heading">3 bước hoàn thành</h2><p>Lộ trình nhanh để nộp hồ sơ đúng yêu cầu.</p></div><span className={styles.panelIcon}><BadgeCheck size={20} /></span></div>
          <ol className={styles.guide}>
            <li><span className={styles.guideNumber}>01</span><div><strong>Chuẩn bị hồ sơ</strong><p>Kiểm tra thông tin hồ sơ, đợt xét và bộ tiêu chí áp dụng.</p></div><Check size={16} /></li>
            <li><span className={styles.guideNumber}>02</span><div><strong>Tải minh chứng</strong><p>C1–C6 nộp theo thành tích có thực; C7 và C8 bắt buộc mỗi tiêu chí một tệp, C9 bắt buộc tích cam kết.</p></div><Check size={16} /></li>
            <li><span className={styles.guideNumber}>03</span><div><strong>Gửi và theo dõi</strong><p>Gửi xét duyệt, nhận phản hồi hoặc bổ sung minh chứng nếu cần.</p></div><Check size={16} /></li>
          </ol>
          <Link className={styles.guideLink} href="/criteria"><ShieldCheck size={16} /> Xem hướng dẫn minh chứng <ArrowRight size={15} /></Link>
        </section>
      </div>
      <div className={styles.footnote}><ShieldCheck size={16} /><p>Thông tin của bạn và các tệp minh chứng được quản lý theo quyền truy cập của hệ thống. Hãy chỉ tải minh chứng thuộc về hồ sơ đang nộp.</p></div>
    </div>
  );
}
