"use client";

import { BookOpen, ChevronDown, FileCheck2, FolderLock } from "lucide-react";
import { AWARD_CRITERIA } from "@/lib/award-criteria";
import type { AwardCriterionDefinition } from "@/lib/award-criteria";
import styles from "./award-criteria-framework.module.css";

type Group = { title: string; note: string; section: string; criteria: readonly AwardCriterionDefinition[] };

export function AwardCriteriaFramework({ compact = false }: { compact?: boolean }) {
  const groups: Group[] = [
    {
      section: "I",
      title: "Thành tích và đóng góp Đoàn – Hội",
      note: "Sáu tiêu chí về phần việc, vai trò, thành tích và tác động thực tế của từng cá nhân.",
      criteria: AWARD_CRITERIA.slice(0, 6),
    },
    {
      section: "II",
      title: "Điều kiện bắt buộc của cá nhân",
      note: "Ba xác nhận về kết quả rèn luyện, học tập và chấp hành nội quy.",
      criteria: AWARD_CRITERIA.slice(6),
    },
  ];
  return (
    <section className={styles.framework} aria-labelledby="award-framework-heading">
      <header className={styles.hero}>
        <div className={styles.heroKicker}><BookOpen size={16} /> ĐOÀN – HỘI KHOA CÔNG NGHỆ THÔNG TIN</div>
        <h2 id="award-framework-heading">Bộ tiêu chí xét khen thưởng <span>cá nhân.</span></h2>
        <p>Áp dụng cho sinh viên nộp hồ sơ cá nhân. Cần kê khai đúng hoạt động, vai trò và kết quả, tải tài liệu để hội đồng đối chiếu. Kết luận theo mức <strong>Đạt / Không đạt</strong>, không quy đổi điểm.</p>
      </header>

      <div className={styles.sectionIntro}>
        <div>
          <span className={styles.overline}>CHỈ XÉT CÁ NHÂN · C1–C9</span>
          <h3>Chuẩn bị minh chứng theo từng tiêu chí</h3>
          <p>C1–C6: thêm nhiều nội dung, mỗi nội dung có thể tải nhiều tài liệu. C7–C9: mỗi tiêu chí đúng một mục, một tệp. Hội đồng đối chiếu tài liệu theo năm học xét.</p>
        </div>
        <span className={styles.total}><strong>09</strong><small>tiêu chí</small></span>
      </div>

      <div className={styles.groups}>
        {groups.map(group => (
          <section key={group.section} className={styles.group} aria-label={group.title}>
            <div className={styles.groupHeading}>
              <span className={styles.sectionIndex}>{group.section}</span>
              <div><h4>{group.title}</h4><p>{group.note}</p></div>
            </div>
            <div className={styles.grid}>
              {group.criteria.map(item => (
                <article key={item.code} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.code}>{item.code}</span>
                    <span className={styles.fileMode}>{item.category === "single" ? "01 tệp duy nhất" : "Nhiều mục minh chứng"}</span>
                  </div>
                  <h5>{item.title}</h5>
                  {!compact && <p className={styles.description}>{item.description}</p>}
                  <details className={styles.details}>
                    <summary><span><FileCheck2 size={15} /> Yêu cầu xác minh và tệp chấp nhận</span><ChevronDown size={16} /></summary>
                    <div className={styles.detailInner}>
                      <strong>Cần kê khai / đối chiếu</strong>
                      <ul>{item.reviewChecks.map(line => <li key={line}>{line}</li>)}</ul>
                      <strong>Minh chứng gợi ý</strong>
                      <ul>{item.evidence.map(line => <li key={line}>{line}</li>)}</ul>
                      {item.condition && <p className={styles.condition}>{item.condition}</p>}
                    </div>
                  </details>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <footer className={styles.footnote}>
        <FolderLock size={19} />
        <div><strong>Chỉ xét cá nhân, xác minh Đạt / Không đạt theo minh chứng.</strong>
          <p>Nhận PDF, JPG, PNG, WebP (tối đa 4 MB/tệp). Ngưỡng GPA 2,80/4,00 hiện là đề xuất và cần phê duyệt trước khi áp dụng chính thức.</p></div>
      </footer>
    </section>
  );
}
