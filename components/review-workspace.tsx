"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine, ArrowLeft, CheckCircle2, ChevronDown, ChevronLeft,
  ChevronRight, FileImage, FileText, FolderOpen, LoaderCircle, LockKeyhole, RefreshCw, ShieldCheck,
} from "lucide-react";
import { getApplicationCriterionCodes, getCriterionDefinition, getCriterionDisplayCode } from "@/lib/award-criteria-scope";
import { criterionCategory } from "@/lib/criterion-evidence";
import type { CriterionCode, Evidence, EvidenceEntry } from "@/lib/types";
import { ReviewPanel } from "@/components/review-panel";
import type { ReviewPanelProps } from "@/components/review-panel";
import styles from "./review-workspace.module.css";

type Props = {
  evidences: Evidence[];
  entries?: EvidenceEntry[];
  review: ReviewPanelProps;
  children: React.ReactNode;
};

export function ReviewWorkspace({ evidences, entries = [], review, children }: Props) {
  const inspectorRef = useRef<HTMLElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const codes = [...getApplicationCriterionCodes(review.applicationType, review.criteria?.map(item => item.code))];
  const files = useMemo(
    () => evidences.filter(item => codes.some(code => item.category === criterionCategory(code))),
    [evidences, review.applicationType],
  );
  const selected = files.find(item => item.id === selectedId) || null;
  const selectedEntry = entries.find(item => item.id === selected?.evidence_entry_id);
  const currentIndex = files.findIndex(item => item.id === selectedId);
  const covered = codes.filter(code => files.some(item => item.category === criterionCategory(code))).length;
  const canRead = review.currentUserRole === "admin" || review.reviewerId === review.currentUserId;

  useEffect(() => {
    if (!canRead) { setSelectedId(null); setPreview(null); }
  }, [canRead]);

  useEffect(() => {
    if (!selected || !canRead) return;
    const controller = new AbortController();
    let url: string | null = null;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/evidence/${selected!.id}`, {
          signal: controller.signal, credentials: "same-origin", cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(response.status === 403
            ? "Bạn cần nhận phụ trách hồ sơ trước khi xem minh chứng."
            : response.status === 429 ? "Thao tác quá nhanh. Vui lòng thử lại sau."
            : "Không thể tải tài liệu. Vui lòng thử lại.");
        }
        const blob = await response.blob();
        if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(blob.type)) {
          throw new Error("Định dạng tài liệu không hỗ trợ xem trước.");
        }
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setPreview(url);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Không thể xem minh chứng.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [selected?.id, retry, canRead]);

  function selectFile(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    setPreview(null);
    setError("");
    setLoading(true);
    if (window.matchMedia("(max-width: 1150px)").matches) {
      inspectorRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
    }
  }

  function retryPreview() {
    setPreview(null);
    setError("");
    setRetry(number => number + 1);
  }

  function onFileRailKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
    if (!(event.target instanceof HTMLButtonElement)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-evidence-file]"));
    const index = buttons.indexOf(event.target);
    const next = event.key === "ArrowDown" ? index + 1 : index - 1;
    if (next < 0 || next >= buttons.length) return;
    event.preventDefault();
    buttons[next].focus();
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageBar}>
        <Link className={styles.backLink} href="/review"><ArrowLeft size={16} /> Trở lại hàng đợi</Link>
        <span className={styles.pageHint}><ShieldCheck size={15} /> Phiếu xét duyệt · Đạt / Không đạt</span>
      </div>
      <div className={styles.workspace}>
        <div className={styles.left}>
          <section ref={inspectorRef} className={styles.inspector} aria-labelledby="evidence-inspector-heading">
            <header className={styles.header}>
              <div>
                <span className={styles.eyebrow}><ShieldCheck size={15} /> KHO MINH CHỨNG RIÊNG TƯ</span>
                <h2 id="evidence-inspector-heading">Đối chiếu tài liệu</h2>
                <p>Chọn ảnh hoặc PDF để đối chiếu trực tiếp với tiêu chí bên cạnh.</p>
              </div>
              <div className={styles.headerStats}><strong>{files.length} tệp</strong><span>{covered}/{codes.length} tiêu chí có minh chứng</span></div>
            </header>
            {!canRead && <div className={styles.claimNotice} role="status">
              <LockKeyhole size={17} />
              <span>{review.reviewerId ? "Hồ sơ đang do cán bộ khác phụ trách. Bạn chưa có quyền xem tệp."
                : "Cần nhận phụ trách hồ sơ trước khi mở minh chứng."}</span>
              {!review.reviewerId && <a href="#review-assignment">Đến mục nhận hồ sơ</a>}
            </div>}
            <div className={styles.browser}>
              <div className={styles.fileRail} aria-label="Danh sách minh chứng theo tiêu chí" onKeyDown={onFileRailKeyDown}>
                {codes.map(code => {
                  const items = files.filter(item => item.category === criterionCategory(code));
                  return <div className={styles.fileGroup} key={code}>
                    <span className={styles.groupLabel}><strong>{getCriterionDisplayCode(review.applicationType, code, review.criteria?.find(row => row.code === code)?.title)}</strong> {getCriterionDefinition(review.applicationType, code, review.criteria?.find(row => row.code === code)?.title).shortTitle}</span>
                    {items.length ? <>
                      {entries.filter(entry => entry.criterion_code === code && items.some(file => file.evidence_entry_id === entry.id))
                        .map((entry, index) => <div key={entry.id} className={styles.statementGroup}>
                          <strong className={styles.statementTitle}>{index + 1}. {entry.title}</strong>
                          {entry.description && <p className={styles.statementDescription}>{entry.description}</p>}
                          {items.filter(item => item.evidence_entry_id === entry.id).map(item => <button type="button" key={item.id}
                            data-evidence-file className={`${styles.fileButton} ${item.id === selectedId ? styles.active : ""}`}
                            onClick={() => selectFile(item.id)} disabled={!canRead} aria-pressed={item.id === selectedId} title={item.file_name}>
                            {item.mime_type === "application/pdf" ? <FileText size={17} /> : <FileImage size={17} />}
                            <span>{item.file_name}</span><ChevronRight size={14} />
                          </button>)}
                        </div>)}
                      {items.some(item => !item.evidence_entry_id || !entries.some(entry => entry.id === item.evidence_entry_id)) &&
                        <div className={styles.statementGroup}>
                          <strong className={styles.statementTitle}>Tệp minh chứng đã nộp trước đây</strong>
                          {items.filter(item => !item.evidence_entry_id || !entries.some(entry => entry.id === item.evidence_entry_id))
                            .map(item => <button type="button" key={item.id}
                            data-evidence-file className={`${styles.fileButton} ${item.id === selectedId ? styles.active : ""}`}
                            onClick={() => selectFile(item.id)} disabled={!canRead} aria-pressed={item.id === selectedId} title={item.file_name}>
                            {item.mime_type === "application/pdf" ? <FileText size={17} /> : <FileImage size={17} />}
                            <span>{item.file_name}</span><ChevronRight size={14} />
                          </button>)}
                        </div>}
                    </> : code === "C9" && review.applicationType === "individual" ? <span className={styles.missing}>{review.criteria?.find(row => row.code === "C9")?.boolean_value === true ? "Đã tích cam kết (không yêu cầu tệp)" : "Chưa có cam kết"}</span> : <span className={styles.missing}>Chưa có minh chứng</span>}
                  </div>;
                })}
              </div>
              <div className={styles.previewPane}>
                {!selected && <div className={styles.placeholder}><FolderOpen size={36} /><strong>Chọn một tệp để bắt đầu</strong><span>Minh chứng chỉ tải qua API sau khi bạn chọn xem.</span></div>}
                {selected && <>
                  {selectedEntry && <div className={styles.selectedStatement}>
                    <strong>Thông tin minh chứng: {selectedEntry.title}</strong>
                    {selectedEntry.description && <span>{selectedEntry.description}</span>}
                  </div>}
                  <div className={styles.previewToolbar}>
                    <div><strong title={selected.file_name}>{selected.file_name}</strong><span>{Math.max(1, Math.ceil(selected.size_bytes / 1024))} KB · {currentIndex + 1}/{files.length}</span></div>
                    <div className={styles.previewActions}>
                      <button type="button" disabled={currentIndex <= 0} aria-label="Xem tệp trước"
                        onClick={() => selectFile(files[currentIndex - 1].id)}><ChevronLeft size={17} /></button>
                      <button type="button" disabled={currentIndex >= files.length - 1} aria-label="Xem tệp tiếp theo"
                        onClick={() => selectFile(files[currentIndex + 1].id)}><ChevronRight size={17} /></button>
                      {canRead && <a href={`/api/evidence/${selected.id}`} target="_blank" rel="noopener noreferrer" title="Mở tệp trong thẻ mới">
                        <ArrowDownToLine size={16} /><span>Mở tệp</span>
                      </a>}
                    </div>
                  </div>
                  {loading && <div className={styles.placeholder} role="status"><LoaderCircle size={28} className={styles.spin} /><span>Đang tải bản xem trước…</span></div>}
                  {error && !loading && <div className={styles.placeholder} role="alert">
                    <FileText size={29} /><strong>Không thể xem trước</strong><span>{error}</span>
                    <button className={styles.retry} type="button" onClick={retryPreview}><RefreshCw size={15} /> Thử lại</button>
                  </div>}
                  {preview && !error && !loading && (
                    selected.mime_type === "application/pdf"
                      ? <iframe className={styles.document} src={preview} title={`Xem PDF: ${selected.file_name}`} />
                      : <div className={styles.imageWrap}><img src={preview} alt={`Minh chứng: ${selected.file_name}`} /></div>
                  )}
                </>}
              </div>
            </div>
            <p className={styles.security}><CheckCircle2 size={15} /> Tệp chỉ tải qua API có kiểm tra quyền. Không dùng đường dẫn Drive công khai.</p>
          </section>
          <details className={styles.applicationDetails}>
            <summary>Thông tin hồ sơ, hoạt động và lịch sử <ChevronDown size={17} /></summary>
            <div className={styles.detailContent}>{children}</div>
          </details>
        </div>
        <ReviewPanel {...review} onInspectEvidence={selectFile} />
      </div>
    </div>
  );
}