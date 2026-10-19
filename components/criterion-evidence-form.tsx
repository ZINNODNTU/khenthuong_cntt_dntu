"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight, Check, CheckCircle2, CloudUpload,
  FileText, Image as ImageIcon, Info, Eye, Plus, Save, ShieldCheck,
  Trash2, X, Paperclip, ChevronDown, BookOpen, CircleHelp, FilePlus2, LockKeyhole,
} from "lucide-react";
import { displayCriterionMessage, getApplicationCriterionCodes, getCriterionDefinition, getCriterionDisplayCode } from "@/lib/award-criteria-scope";
import {
  SINGLE_EVIDENCE_CODES, criterionCategory,
  criterionFileLimit, validateCriterionEvidence,
} from "@/lib/criterion-evidence";
import type { Application, Club, EvaluationPeriod, SubmissionScope, CriterionCode, Evidence, EvidenceEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { LocalFilePreview } from "@/components/local-file-preview";
import { retryTransientUpload, UploadRequestError } from "@/lib/upload-retry";
import styles from "./criterion-evidence-form.module.css";

type Props = {
  branchCode?: string | null;
  club?: Club | null;
  submissionScope?: SubmissionScope;
  periods?: EvaluationPeriod[];
  fullName?: string;
  accountEmail?: string;
  studentId?: string | null;
  app?: Application;
};

const supported = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const isSingle = (code: string) => (SINGLE_EVIDENCE_CODES as readonly string[]).includes(code);
const formatSize = (bytes: number) => bytes >= 1024 * 1024
  ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function CriterionEvidenceForm({
  branchCode = null, club = null, submissionScope = "individual", periods = [],
  fullName = "", accountEmail = "", studentId = null, app,
}: Props) {
  const router = useRouter();
  const scope = app ? (app.application_type === "individual" ? "individual" : app.collective_type === "club" ? "club" : "branch") : submissionScope;
  const individual = scope === "individual";
  const subject = individual ? "individual" : "collective";
  const codes = [...getApplicationCriterionCodes(subject, app?.criteria?.map(row => row.code))];
  const [periodId, setPeriodId] = useState(app?.evaluation_period_id || periods[0]?.id || "");
  const [name, setName] = useState(app?.subject_name || fullName || "");
  const [disciplinaryCommitment, setDisciplinaryCommitment] = useState(false);
  const [entries, setEntries] = useState<EvidenceEntry[]>(app?.evidence_entries || []);
  const [selected, setSelected] = useState<Record<string, File[]>>({});
  const [expanded, setExpanded] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  const [portrait, setPortrait] = useState<File | null>(null);
  const [stored, setStored] = useState<Evidence[]>(app?.evidences || []);
  const [working, setWorking] = useState<{ id: string; code: string } | null>(app ? { id: app.id, code: app.code } : null);
  const fileKeys = useRef(new WeakMap<File, string>());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [uploadCount, setUploadCount] = useState<{ done: number; total: number } | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [uploadStates, setUploadStates] = useState<Record<string, "uploading" | "retrying" | "failed" | "saved">>({});
  const [error, setError] = useState("");
  const mode = useRef<"draft" | "submitted">("submitted");

  // Highlight the section the user is viewing, not the evidence section by default.
  useEffect(() => {
    let frame = 0;
    function syncActiveStep() {
      frame = 0;
      const evidenceHeading = document.getElementById("evidence-heading");
      if (!evidenceHeading) return;
      const threshold = Math.max(125, Math.min(window.innerHeight * 0.3, 250));
      const viewingEvidence = evidenceHeading.getBoundingClientRect().top <= threshold;
      const atDocumentEnd = window.scrollY > 64 &&
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 90;
      setActiveStep(atDocumentEnd && viewingEvidence ? 3 : viewingEvidence ? 2 : 1);
    }
    function scheduleSync() {
      if (frame) return;
      frame = requestAnimationFrame(syncActiveStep);
    }
    syncActiveStep();
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);
    return () => {
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  function filesFor(code: CriterionCode) {
    return stored.filter(item => item.category === criterionCategory(code));
  }

  function entryFiles(id: string) {
    return stored.filter(item => item.evidence_entry_id === id);
  }

  function pendingFor(code: CriterionCode) {
    return entries.filter(entry => entry.criterion_code === code)
      .flatMap(entry => selected[entry.id] || []);
  }

  function addEntry(code: CriterionCode) {
    if (busy || (isSingle(code) && entries.some(item => item.criterion_code === code))) return;
    const id = crypto.randomUUID();
    // C7-C8 accept a single uploaded document. C9 is a mandatory checkbox commitment.
    const title = isSingle(code)
      ? getCriterionDefinition(subject, code, app?.criteria?.find(item => item.code === code)?.title).shortTitle
      : "";
    setEntries(items => [...items, {
      id, application_id: working?.id || "", criterion_code: code,
      title, description: "", created_at: new Date().toISOString(),
    }]);
    setExpanded(ids => [...ids, id]);
    setError("");
    requestAnimationFrame(() =>
      document.getElementById((isSingle(code) ? "entry-toggle-" : "entry-title-") + id)?.focus());
  }

  function editEntry(id: string, data: Partial<Pick<EvidenceEntry, "title" | "description">>) {
    setEntries(items => items.map(item => item.id === id ? { ...item, ...data } : item));
  }

  function toggleEntry(id: string) {
    setExpanded(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);
  }

  function setFiles(entryId: string, code: CriterionCode, files: FileList | null) {
    if (!files?.length) return;
    const incoming = Array.from(files);
    if (incoming.some(file => !supported.includes(file.type))) {
      setError("Minh chứng chỉ hỗ trợ PDF, JPG, PNG hoặc WebP."); return;
    }
    if (incoming.some(file => file.size === 0 || file.size > 4 * 1024 * 1024)) {
      setError("Mỗi minh chứng phải có nội dung và tối đa 4 MB."); return;
    }
    const original = selected[entryId] || [];
    const added = incoming.filter(file => !original.some(existing =>
      existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified
    ));
    const next = [...original, ...added];
    const totalForCriterion = filesFor(code).length + entries
      .filter(entry => entry.criterion_code === code)
      .reduce((sum, entry) => sum + (entry.id === entryId ? next : (selected[entry.id] || [])).length, 0);
    if (totalForCriterion > criterionFileLimit(code)) {
      setError(`${code}: Tối đa ${criterionFileLimit(code)} tệp cho toàn bộ các mục trong tiêu chí.`); return;
    }
    const otherFiles = Object.entries(selected).reduce((sum, [id, queue]) =>
      sum + (id === entryId ? next.length : queue.length), 0);
    if (stored.length + otherFiles + (portrait ? 1 : 0) > 40) {
      setError("Mỗi hồ sơ được lưu tối đa 40 tệp minh chứng và ảnh chân dung."); return;
    }
    const nextSize = stored.reduce((sum, item) => sum + item.size_bytes, 0)
      + (portrait?.size || 0)
      + Object.entries(selected).reduce((sum, [id, queue]) =>
        sum + (id === entryId ? next : queue).reduce((total, file) => total + file.size, 0), 0);
    if (nextSize > 60 * 1024 * 1024) {
      setError("Tổng dung lượng hồ sơ không được vượt quá 60 MiB."); return;
    }
    setError("");
    setSelected(value => ({ ...value, [entryId]: next }));
  }

  function clearSelected(entryId: string, file: File) {
    setSelected(current => ({
      ...current, [entryId]: (current[entryId] || []).filter(item => item !== file),
    }));
  }

  async function removeEntry(entry: EvidenceEntry) {
    if (busy) return;
    const files = entryFiles(entry.id);
    if (!window.confirm(files.length
      ? `Xóa thông tin "${entry.title || "Chưa đặt tên"}" và ${files.length} tệp đính kèm?`
      : `Xóa mục thông tin "${entry.title || "Chưa đặt tên"}"?`)) return;
    setBusy(true); setError("");
    try {
      if (working && entry.application_id) {
        // Delete attachments first so Drive cleanup continues through the existing outbox.
        for (const evidence of files) {
          const response = await fetch(`/api/evidence/${evidence.id}`, { method: "DELETE" });
          const json = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(json.error || "Không thể xóa tệp minh chứng.");
          setStored(items => items.filter(item => item.id !== evidence.id));
        }
        const response = await fetch("/api/evidence/entries", {
          method: "DELETE", headers: { "content-type": "application/json" },
          body: JSON.stringify({ applicationId: working.id, entryId: entry.id }),
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || "Không thể xóa mục minh chứng.");
      }
      setEntries(items => items.filter(item => item.id !== entry.id));
      setSelected(current => { const copy = { ...current }; delete copy[entry.id]; return copy; });
      setExpanded(ids => ids.filter(id => id !== entry.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xóa mục.");
    } finally { setBusy(false); }
  }

  async function removeFile(evidence: Evidence) {
    if (!working || !window.confirm(`Xóa minh chứng "${evidence.file_name}"?`)) return;
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/evidence/${evidence.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Không thể xóa minh chứng.");
      setStored(items => items.filter(item => item.id !== evidence.id));
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể xóa minh chứng."); }
    finally { setBusy(false); }
  }

  function keyFor(file: File) {
    let key = fileKeys.current.get(file);
    if (!key) { key = crypto.randomUUID(); fileKeys.current.set(file, key); }
    return key;
  }

  async function uploadFile(id: string, code: string, category: string, file: File, entryId: string | null = null) {
    const body = new FormData();
    body.set("applicationId", id);
    body.set("applicationCode", code);
    body.set("parentType", "application");
    body.set("parentId", id);
    body.set("category", category);
    if (entryId) body.set("evidenceEntryId", entryId);
    const key = keyFor(file);
    body.set("uploadKey", `${id}:${category}:${entryId || "default"}:${key}`);
    body.set("file", file);
    setUploadStates(states => ({ ...states, [key]: "uploading" }));
    try {
      const saved = await retryTransientUpload(async attempt => {
        if (attempt > 0) setUploadStates(states => ({ ...states, [key]: "retrying" }));
        const response = await fetch("/api/evidence/upload", { method: "POST", body });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new UploadRequestError(
          result.error || `Tải "${file.name}" thất bại (HTTP ${response.status}).`, response.status,
        );
        return result.evidence as Evidence;
      });
      setUploadStates(states => ({ ...states, [key]: "saved" }));
      return saved;
    } catch (error) {
      setUploadStates(states => ({ ...states, [key]: "failed" }));
      throw error;
    }
  }

  async function retryFile(code: CriterionCode, entryId: string, file: File) {
    if (!working || busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = await uploadFile(working.id, working.code, criterionCategory(code), file, entryId);
      setStored(items => items.some(item => item.id === saved.id) ? items : [...items, saved]);
      clearSelected(entryId, file);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể tải lại minh chứng.");
    } finally { setBusy(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      setUploadCount(null);
      const pendingEntries = entries.filter(entry =>
        entry.title.trim() || entry.description.trim() || (selected[entry.id] || []).length || entryFiles(entry.id).length
      );
      for (const entry of pendingEntries) {
        if (entry.title.trim().length < 3) {
          throw new Error(`${entry.criterion_code}: Hãy nhập tên thông tin minh chứng (ít nhất 3 ký tự).`);
        }
        if (mode.current === "submitted" && !entryFiles(entry.id).length && !(selected[entry.id] || []).length) {
          throw new Error(`${entry.criterion_code}: Mục "${entry.title}" cần ít nhất một tệp minh chứng.`);
        }
      }
      const allPending = Object.values(selected).flat();
      const totalBytes = stored.reduce((sum, item) => sum + item.size_bytes, 0) +
        (portrait?.size || 0) + allPending.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > 60 * 1024 * 1024) throw new Error("Tổng dung lượng minh chứng vượt quá 60 MiB.");
      if (!periodId) throw new Error("Hãy chọn đợt xét.");
      if (!name.trim()) throw new Error("Hãy nhập họ tên sinh viên.");
      const allCategories = [
        ...stored.map(row => row.category),
        ...entries.flatMap(entry => (selected[entry.id] || []).map(() => criterionCategory(entry.criterion_code))),
      ];
      if (mode.current === "submitted") {
        const issues = validateCriterionEvidence(allCategories, individual ? "individual" : "collective", codes);
        if (issues.length) throw new Error(issues.join(" "));
        if (individual && !disciplinaryCommitment) throw new Error("Bạn cần tích xác nhận cam kết không vi phạm kỷ luật và quy chế Nhà trường (C9).");
        if (individual && !portrait && !stored.some(item => item.category === "portrait")) {
          throw new Error("Hồ sơ cá nhân cần một ảnh chân dung.");
        }
      }
      let id = working?.id || "";
      let code = working?.code || "";
      if (!working) {
        const response = await fetch("/api/applications", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            status: "draft", evaluationPeriodId: periodId,
            applicationType: individual ? "individual" : "collective",
            collectiveType: individual ? null : scope === "club" ? "club" : "branch",
            branchCode: branchCode || "", clubId: scope === "club" ? club?.id || null : null,
            subjectName: name.trim(), phone: "", position: "",
            achievements: "Hồ sơ minh chứng theo các tiêu chí đã kê khai",
            roleContribution: "", targetsResult: "", initiatives: "", impact: "",
            summary: "Minh chứng đã tải lên Google Drive theo từng tiêu chí.",
            conductRating: null, cumulativeGpa: null, disciplinaryStatus: "warning",
            disciplinaryNote: "", activities: [], priorAwards: [],
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          if (data.existingApplicationId) router.push(`/applications/${data.existingApplicationId}/supplement`);
          throw new Error(data.error || "Không thể tạo hồ sơ.");
        }
        id = data.application.id; code = data.application.code;
        setWorking({ id, code });
      }
      // Save declared information before attaching files to the corresponding row.
      for (const entry of pendingEntries) {
        const response = await fetch("/api/evidence/entries", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            applicationId: id, entryId: entry.id, criterion: entry.criterion_code,
            title: entry.title.trim(), description: entry.description.trim(),
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || `Không thể lưu thông tin ${entry.criterion_code}.`);
        setEntries(items => items.map(item =>
          item.id === entry.id ? { ...item, application_id: id } : item));
      }
      const files = [
        ...(portrait ? [{ category: "portrait", file: portrait, entryId: null as string | null }] : []),
        ...pendingEntries.flatMap(entry => (selected[entry.id] || []).map(file => ({
          category: criterionCategory(entry.criterion_code), file, entryId: entry.id as string | null,
        }))),
      ];
      let nextIndex = 0;
      let completed = 0;
      if (files.length) setUploadCount({ done: 0, total: files.length });
      if (files.length) setProgress(`Đang lưu lên Google Drive: 0/${files.length} tệp`);
      async function uploadWorker() {
        while (nextIndex < files.length) {
          const entry = files[nextIndex++];
          const saved = await uploadFile(id, code, entry.category, entry.file, entry.entryId);
          setStored(items => items.some(item => item.id === saved.id) ? items : [...items, saved]);
          if (entry.category === "portrait") setPortrait(null);
          const entryId = entry.entryId;
          if (entryId) {
            setSelected(current => ({
              ...current,
              [entryId]: (current[entryId] || []).filter(item => item !== entry.file),
            }));
          }
          completed++;
          setUploadCount({ done: completed, total: files.length });
          setProgress(`Đang lưu lên Google Drive: ${completed}/${files.length} tệp`);
        }
      }
      const workerResults = await Promise.allSettled(
        Array.from({ length: Math.min(2, files.length) }, () => uploadWorker())
      );
      const rejected = workerResults.find(result => result.status === "rejected");
      if (rejected && rejected.status === "rejected") throw rejected.reason;
      if (mode.current === "submitted") {
        setProgress("Đang gửi hồ sơ để xét duyệt...");
        const response = await fetch(`/api/applications/${id}`, {
          method: "PATCH", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            achievements: "Hồ sơ minh chứng theo các tiêu chí đã kê khai",
            summary: "Minh chứng đã tải lên Google Drive theo từng tiêu chí.",
            disciplinaryCommitment,
            resubmit: true,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Không thể gửi hồ sơ.");
      }
      router.push(`/applications/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể hoàn tất.");
    } finally { setBusy(false); setProgress(""); }
  }

  const hasEvidence = (code: CriterionCode) => filesFor(code).length + pendingFor(code).length > 0;
  const optionalCount = codes.filter(code => !isSingle(code) && hasEvidence(code)).length;
  const portraitReady = !individual || !!portrait || stored.some(item => item.category === "portrait");
  const requiredDone = individual
    ? Number(optionalCount > 0) + Number(hasEvidence("C7")) + Number(hasEvidence("C8")) + Number(disciplinaryCommitment) + Number(portraitReady)
    : codes.filter(hasEvidence).length;
  const requiredTotal = individual ? 5 : codes.length;
  const ready = requiredDone;
  const percent = Math.round(requiredDone / requiredTotal * 100);
  const complete = requiredDone === requiredTotal;
  const pending = requiredTotal - requiredDone;
  const fileCount = stored.length + (portrait ? 1 : 0) +
    Object.values(selected).reduce((sum, queue) => sum + queue.length, 0);
  const groups: { title: string; subtitle: string; codes: CriterionCode[]; number: string }[] = individual
    ? [
      { number: "A", title: "Thành tích & đóng góp cá nhân", subtitle: "Có thành tích ở tiêu chí nào, kê khai và nộp minh chứng ở tiêu chí đó; không yêu cầu đủ C1–C6.", codes: codes.filter(code => !isSingle(code)) },
      { number: "B", title: "Điều kiện bắt buộc của cá nhân", subtitle: "C7, C8 nộp minh chứng; C9 tích cam kết chấp hành quy định.", codes: codes.filter(isSingle) },
    ]
    : [
      { number: "A", title: "Kết quả hoạt động tập thể", subtitle: "Bộ tiêu chí T1–T6 dành riêng cho Chi đoàn và CLB", codes },
    ];

  return (
    <form onSubmit={submit} className={styles.workspace}>
      <header className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroEyebrow}>
            <span className={styles.brandMark}><Image src="/brand/doan-logo-512.png" alt="" width={27} height={27} /></span>
            <span>ĐOÀN – HỘI KHOA CNTT <span className={styles.eyebrowDivider}>/</span> {app ? app.code : individual ? "HỒ SƠ CÁ NHÂN" : "HỒ SƠ TẬP THỂ"}</span>
          </div>
          <h1>{app ? "Bổ sung minh chứng" : individual ? "Hồ sơ thành tích cá nhân" : "Hồ sơ thành tích tập thể"}<span className={styles.headlinePeriod}>.</span></h1>
          <p>{individual ? "Ghi rõ hoạt động, vai trò và kết quả của bản thân theo bộ tiêu chí C1–C9." : "Kê khai kết quả hoạt động của Chi đoàn hoặc CLB theo bộ tiêu chí tập thể T1–T6."} Mỗi nội dung có thể kèm nhiều tài liệu xác nhận.</p>
          <div className={styles.heroTrust}>
            <span><LockKeyhole size={14} strokeWidth={1.8} /> {individual ? "09 tiêu chí cá nhân" : "06 tiêu chí tập thể"}</span>
            <span className={styles.trustSeparator} aria-hidden="true" />
            <span>Hội đồng đánh giá Đạt / Không đạt</span>
          </div>
        </div>
        <div className={styles.progressCard} aria-live="polite">
          <div className={styles.progressHeading}><span>TIẾN ĐỘ HỒ SƠ</span><span>{percent}%</span></div>
          <div className={styles.progressNumbers}><strong>{String(ready).padStart(2,"0")}</strong><span>/ {String(requiredTotal).padStart(2,"0")} điều kiện nộp</span></div>
          <div className={styles.progressTrack} role="progressbar" aria-label="Tiến độ hoàn thiện tiêu chí" aria-valuemin={0} aria-valuemax={requiredTotal} aria-valuenow={ready}>
            <span style={{width:percent+"%"}} />
          </div>
          <p>{complete ? "Đã đáp ứng các điều kiện gửi hồ sơ" : `Còn ${pending} điều kiện cần hoàn thiện` }</p>
        </div>
      </header>

      <nav className={styles.stepper} aria-label="Các phần của biểu mẫu">
        <a href="#submission-info-heading" className={activeStep === 1 ? styles.stepActive : styles.step} aria-current={activeStep === 1 ? "step" : undefined}><span>01</span> Thông tin hồ sơ</a>
        <a href="#evidence-heading" className={activeStep === 2 ? styles.stepActive : styles.step} aria-current={activeStep === 2 ? "step" : undefined}><span>02</span> Bảng minh chứng</a>
        <a href="#submission-actions" className={activeStep === 3 ? styles.stepActive : styles.step} aria-current={activeStep === 3 ? "step" : undefined}
          onClick={event => {
            event.preventDefault();
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
          }}><span>03</span> Hoàn tất & gửi</a>
      </nav>

      <section className={styles.detailsCard} aria-labelledby="submission-info-heading">
        <div className={styles.sectionHeading}>
          <div><span className={styles.kicker}>01 — THÔNG TIN CHUNG</span><h2 id="submission-info-heading">Thông tin người nộp</h2><p>Kiểm tra họ tên, MSSV và thông tin sinh viên trước khi lập bảng minh chứng.</p></div>
          <span className={styles.sectionAside}>Thông tin bắt buộc *</span>
        </div>
        <div className={styles.formGrid}>
          {!app && <div className={styles.field}>
            <label htmlFor="evidence-period">Đợt xét <span>*</span></label>
            <select className="select" id="evidence-period" value={periodId} onChange={event => setPeriodId(event.target.value)} required disabled={busy}>
              {periods.map(period => <option key={period.id} value={period.id}>{period.name}</option>)}
            </select>
          </div>}
          <div className={styles.field}>
            <label htmlFor="evidence-name">Họ và tên sinh viên <span>*</span></label>
            <input className="input" id="evidence-name" value={name} onChange={event => setName(event.target.value)} disabled={!!app || busy} required />
          </div>
        </div>
        {!app && (studentId || accountEmail) && <div className={styles.identity}><ShieldCheck size={16} /><span>{studentId ? `MSSV ${studentId} · ` : ""}{accountEmail}</span><Check size={16} /></div>}
        {!app && individual && <p className={styles.profileNote}>Ngày sinh được tự động lấy từ tài khoản đã đăng ký, không cần nhập lại.</p>}
        {individual && !app && <div className={styles.portrait}>
          <span className={styles.portraitIcon}><ImageIcon size={20} /></span>
          <div className={styles.portraitText}><strong>Ảnh chân dung <span>*</span></strong><small>JPG, PNG hoặc WebP · Tối đa 4 MB</small>{portrait && <span className={styles.portraitName}>{portrait.name}</span>}</div>
          <input id="evidence-portrait" className={styles.hiddenInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
            onChange={event => { const file = event.target.files?.[0]; if (!file) return; if (!supported.includes(file.type) || file.type === "application/pdf" || file.size === 0 || file.size > 4 * 1024 * 1024) { setError("Ảnh chân dung phải là JPG, PNG hoặc WebP, tối đa 4 MB."); return; } setError(""); setPortrait(file); event.currentTarget.value = ""; }} />
          <label className={styles.portraitPick} htmlFor="evidence-portrait">{portrait ? "Đổi ảnh" : "Chọn ảnh"} <Plus size={16} /></label>
        </div>}
      </section>

      <section className={styles.evidenceSection} aria-labelledby="evidence-heading">
        <div className={styles.evidenceIntro}>
          <div><span className={styles.kicker}>02 — BẢNG KÊ MINH CHỨNG {individual ? "CÁ NHÂN" : "TẬP THỂ"}</span><h2 id="evidence-heading">{individual ? "Tiêu chí dành cho cá nhân" : "Tiêu chí dành cho tập thể"}</h2>
            <p>Nhấn <strong>+ Thêm thông tin</strong> ở những tiêu chí có thành tích và đính kèm tài liệu. {individual && "C1–C6 không cần nộp đủ; C7, C8 cần 01 tệp; C9 tích ô cam kết."}</p></div>
          <span className={styles.totalFiles}><Paperclip size={16} /> {fileCount} <span>/ 40 tệp</span></span>
        </div>
        <div className={styles.notice}><CircleHelp size={18} /><span><strong>Hướng dẫn:</strong> PDF, JPG, PNG, WebP (tối đa 4 MB/tệp; 60 MiB/hồ sơ). {individual ? "C1–C6 tự chọn các tiêu chí có thành tích (ít nhất một tiêu chí); C7–C8 bắt buộc 01 tệp/tiêu chí; C9 xác nhận bằng cam kết, không yêu cầu tải tệp." : "T1–T6 là bộ tiêu chí tập thể dự thảo, cần phê duyệt trước khi vận hành chính thức. Có thể khai nhiều nội dung và tệp; không dùng thành tích riêng của thành viên thay cho tập thể."}</span></div>
        {groups.map(group => (
          <div className={styles.group} key={group.number}>
            <div className={styles.groupHeading}>
              <span className={styles.groupIndex}>{group.number}</span>
              <div><h4>{group.title}</h4><p>{group.subtitle}</p></div>
              <span className={styles.groupCount}>{group.number === "B" && individual ? Number(hasEvidence("C7")) + Number(hasEvidence("C8")) + Number(disciplinaryCommitment) : group.codes.filter(hasEvidence).length}/{group.codes.length} {group.number === "B" && individual ? "điều kiện hoàn thành" : "tiêu chí đã kê khai"}</span>
            </div>
            <div className={styles.tableScroll} role="region" tabIndex={0} aria-label={"Bảng kê " + group.title}>
              <table className={styles.evidenceTable}>
                <caption className={styles.tableCaption}>Bảng tiêu chí, nội dung kê khai và tệp minh chứng thuộc {group.title}</caption>
                <thead><tr>
                  <th scope="col">Yêu cầu và tiêu chí</th>
                  <th scope="col">Nội dung và tài liệu minh chứng</th>
                  <th scope="col">Thêm</th>
                </tr></thead>
                <tbody>
                {group.codes.map(criterion => {
                  const persistedTitle = app?.criteria?.find(item => item.code === criterion)?.title;
                  const definition = getCriterionDefinition(subject, criterion, persistedTitle);
                  const displayCode = getCriterionDisplayCode(subject, criterion, persistedTitle);
                  const existing = filesFor(criterion);
                  const total = existing.length + pendingFor(criterion).length;
                  const currentEntries = entries.filter(entry => entry.criterion_code === criterion);
                  const unassigned = existing.filter(item => !item.evidence_entry_id);
                  const hasEvidence = total > 0;
                  const canAdd = !busy && total < criterionFileLimit(criterion) && fileCount < 40 &&
                    criterion !== "C9" && (!isSingle(criterion) || currentEntries.length === 0);
                  return <tr key={criterion} className={hasEvidence ? styles.rowReady : undefined}>
                    <td className={styles.criterionCell}>
                      <div className={styles.criterionMeta}>
                        <span className={styles.criterionCode}>{displayCode}</span>
                        <span className={`${styles.criterionState} ${hasEvidence ? styles.stateReady : ""}`}>
                          {individual && criterion === "C9" ? (disciplinaryCommitment ? <><CheckCircle2 size={13} /> Đã cam kết</> : "Chưa cam kết") : hasEvidence ? <><CheckCircle2 size={13} /> Đã có minh chứng</> : "Chưa nộp (nếu có thành tích)"}
                        </span>
                      </div>
                      <strong>{definition.title}</strong>
                      <details className={styles.hintDetails}>
                        <summary><BookOpen size={14} /> Cách xét và minh chứng <ChevronDown size={14} /></summary>
                        <p>{definition.description}</p>
                        <strong>Cần đối chiếu</strong>
                        <ul>{definition.reviewChecks.map(check => <li key={check}>{check}</li>)}</ul>
                        <strong>Giấy tờ gợi ý</strong>
                        <ul>{definition.evidence.map(hint => <li key={hint}>{hint}</li>)}</ul>
                      </details>
                    </td>
                    <td className={styles.informationCell}>
                      {individual && criterion === "C9" ? <div className={styles.commitmentBox}>
                        <label className={styles.commitmentLabel} htmlFor="disciplinary-commitment">
                          <input id="disciplinary-commitment" type="checkbox" checked={disciplinaryCommitment}
                            onChange={event => setDisciplinaryCommitment(event.target.checked)} disabled={busy} />
                          <span>Tôi cam kết trong năm học <strong>không bị kỷ luật từ mức khiển trách trở lên</strong> và <strong>không vi phạm quy định, quy chế Nhà trường</strong>. Tôi chịu trách nhiệm về tính trung thực của nội dung cam kết.</span>
                        </label>
                        <small>{disciplinaryCommitment ? "Đã xác nhận cam kết" : "Bắt buộc tích ô cam kết để gửi hồ sơ. Hội đồng có quyền đối chiếu thông tin."}</small>
                      </div> : <div className={styles.entryStack}>
                        {currentEntries.map((entry, number) => {
                          const savedFiles = entryFiles(entry.id);
                          const queue = selected[entry.id] || [];
                          const count = savedFiles.length + queue.length;
                          const isOpen = expanded.includes(entry.id);
                          const fileDisabled = busy || total >= criterionFileLimit(criterion) || fileCount >= 40;
                          return <section className={styles.entryBlock} key={entry.id}
                            aria-label={"Mục thông tin số " + (number + 1) + " của " + criterion}>
                            <div className={styles.entrySummary}>
                              <button type="button" className={styles.entryToggle}
                                id={"entry-toggle-" + entry.id} onClick={() => toggleEntry(entry.id)} aria-expanded={isOpen}
                                aria-controls={"entry-editor-" + entry.id}>
                                <span className={styles.entryOrdinal}>{String(number + 1).padStart(2, "0")}</span>
                                <span className={styles.entryTitle}>{entry.title.trim() || "Thông tin mới — chưa đặt tên"}</span>
                                <ChevronDown className={isOpen ? styles.chevronOpen : undefined} size={16} aria-hidden="true" />
                              </button>
                              <span className={styles.entryCount}><Paperclip size={13} /> {count} tệp</span>
                            </div>
                            {isOpen && <div id={"entry-editor-" + entry.id} className={styles.entryEditor}>
                              {isSingle(criterion)
                                ? <p className={styles.singleEvidenceNote}>Tiêu chí này chỉ cần <strong>01 tệp minh chứng</strong> (PDF hoặc ảnh). Không cần điền thêm nội dung hoạt động.</p>
                                : <>
                                  <label htmlFor={"entry-title-" + entry.id}>Tên hoạt động hoặc thành tích <span>*</span></label>
                                  <input id={"entry-title-" + entry.id} className="input" type="text"
                                    value={entry.title} maxLength={240} required={false} disabled={busy}
                                    placeholder="Ví dụ: Tham gia tổ chức chiến dịch Mùa hè xanh 2025"
                                    onChange={event => editEntry(entry.id, { title: event.target.value })} />
                                  <label htmlFor={"entry-description-" + entry.id}>Vai trò, thời gian hoặc kết quả <span className={styles.optional}>(không bắt buộc)</span></label>
                                  <textarea id={"entry-description-" + entry.id} className="input" rows={3}
                                    maxLength={2000} value={entry.description} disabled={busy}
                                    placeholder="Mô tả ngắn hoạt động, thời gian, đơn vị tổ chức hoặc thành tích đạt được..."
                                    onChange={event => editEntry(entry.id, { description: event.target.value })} />
                                </>}
                              <div className={styles.entryUpload}
                                onDragOver={event => { if (!fileDisabled) event.preventDefault(); }}
                                onDrop={event => { event.preventDefault(); if (!fileDisabled) setFiles(entry.id, criterion, event.dataTransfer.files); }}>
                                <input id={"entry-file-" + entry.id} className={styles.hiddenInput} type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                                  multiple={!isSingle(criterion)} disabled={fileDisabled}
                                  aria-label={"Chọn các tệp minh chứng cho " + (entry.title || criterion)}
                                  onChange={event => { setFiles(entry.id, criterion, event.target.files); event.currentTarget.value = ""; }} />
                                <label htmlFor={"entry-file-" + entry.id} className={[styles.attachButton, fileDisabled ? styles.attachDisabled : ""].join(" ")}>
                                  <CloudUpload size={17} /> {isSingle(criterion) ? "Chọn 01 tệp minh chứng" : "Chọn tệp hoặc kéo thả vào đây"}
                                </label>
                                <span>{total}/{criterionFileLimit(criterion)} tệp cho {displayCode} · PDF hoặc ảnh</span>
                              </div>
                              {(savedFiles.length > 0 || queue.length > 0) && <div className={styles.fileList}>
                                {savedFiles.map(evidence => <div key={evidence.id} className={styles.fileRow}>
                                  <FileText size={16} aria-hidden="true" />
                                  <a href={"/api/evidence/" + evidence.id} target="_blank" rel="noopener noreferrer" title={evidence.file_name}>{evidence.file_name}</a>
                                  <span className={styles.savedLabel}>Đã lưu</span>
                                  <button type="button" className={styles.removeFile} aria-label={"Xóa " + evidence.file_name}
                                    disabled={busy} onClick={() => removeFile(evidence)}><Trash2 size={15} /></button>
                                </div>)}
                                {queue.map((file, index) => <div key={entry.id + "-" + file.name + "-" + index} className={styles.fileRow}>
                                  <FileText size={16} aria-hidden="true" />
                                  <span className={styles.fileName} title={file.name}>{file.name}</span>
                                  <span className={styles.sizeLabel}>{formatSize(file.size)}</span>
                                  {["uploading", "retrying"].includes(uploadStates[fileKeys.current.get(file) || ""]) &&
                                    <span className={styles.uploadFileState} role="status">{uploadStates[fileKeys.current.get(file) || ""] === "retrying" ? "Thử lại..." : "Đang lưu..."}</span>}
                                  {uploadStates[fileKeys.current.get(file) || ""] === "failed" && <button type="button"
                                    className={styles.retryFile} disabled={busy || !working}
                                    onClick={() => retryFile(criterion, entry.id, file)}>Thử lại</button>}
                                  <button type="button" className={styles.previewFile} disabled={busy}
                                    aria-label={"Xem trước " + file.name} onClick={() => setPreviewFile(file)}><Eye size={15} /> Xem</button>
                                  <button type="button" className={styles.removeFile} disabled={busy}
                                    aria-label={"Bỏ chọn " + file.name}
                                    onClick={() => clearSelected(entry.id, file)}><X size={15} /></button>
                                </div>)}
                              </div>}
                              <button type="button" className={styles.deleteEntry} disabled={busy}
                                onClick={() => removeEntry(entry)}><Trash2 size={14} /> Xóa thông tin này</button>
                            </div>}
                          </section>;
                        })}
                        {unassigned.length > 0 && <div className={styles.legacyFiles}>
                          <strong>Minh chứng đã nộp trước đây</strong>
                          {unassigned.map(evidence => <div key={evidence.id} className={styles.fileRow}>
                            <FileText size={16} aria-hidden="true" />
                            <a href={"/api/evidence/" + evidence.id} target="_blank" rel="noopener noreferrer">{evidence.file_name}</a>
                            <button type="button" className={styles.removeFile} disabled={busy}
                              onClick={() => removeFile(evidence)} aria-label={"Xóa " + evidence.file_name}><Trash2 size={15} /></button>
                          </div>)}
                        </div>}
                        {currentEntries.length === 0 && unassigned.length === 0 &&
                          <div className={styles.emptyEvidence}><FilePlus2 size={18} /><span>Chưa có tài liệu nào.<small>{isSingle(criterion) ? "Chọn “Đính kèm 01 tệp” để bắt đầu." : "Chọn “Thêm thông tin” để bắt đầu."}</small></span></div>}
                      </div>}
                    </td>
                    <td className={styles.plusCell}>{individual && criterion === "C9" ? <span className={styles.commitmentTag}>Cam kết</span> : <button type="button" className={styles.plusAction}
                      disabled={!canAdd} onClick={() => addEntry(criterion)}
                      aria-label={(isSingle(criterion) ? "Đính kèm 01 minh chứng cho " : "Thêm thông tin minh chứng cho ") + displayCode}
                      title={!canAdd ? "Đã đủ số lượng hoặc đang lưu" : isSingle(criterion) ? "Đính kèm 01 tệp" : "Khai thông tin minh chứng"}>
                      <Plus size={17} strokeWidth={2.25} aria-hidden="true" /><span>{isSingle(criterion) ? "Đính kèm 01 tệp" : "Thêm thông tin"}</span>
                    </button>}</td>
                  </tr>;
                })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      {error && <div className={styles.error} role="alert">
        <Info size={19} /><span>{displayCriterionMessage(subject, error, Object.fromEntries((app?.criteria || []).map(item => [item.code, item.title])))}</span>
        {uploadCount && uploadCount.done < uploadCount.total && !busy && (
          <button type="button" className={styles.retryUpload}
            onClick={event => { mode.current = "draft"; event.currentTarget.form?.requestSubmit(); }}>
            Thử tải lại các tệp còn thiếu
          </button>
        )}
      </div>
      }
      {progress && <div className={styles.saving} role="status" aria-live="polite">
        <CloudUpload size={19} />
        <div className={styles.progressContent}><span>{progress}</span>
          {uploadCount && <div className={styles.uploadTrack} role="progressbar" aria-label="Tiến độ lưu tệp minh chứng" aria-valuemin={0} aria-valuemax={uploadCount.total} aria-valuenow={uploadCount.done}>
            <span style={{ width: `${Math.round(uploadCount.done / Math.max(1, uploadCount.total) * 100)}%` }} />
          </div>}
        </div><span className={styles.savingPulse} />
      </div>}
      {previewFile && <LocalFilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
      <div className={styles.actionBar} id="submission-actions">
        <div className={styles.actionStatus}><span className={complete ? styles.readyIcon : styles.pendingIcon}>{complete ? <Check size={18} /> : <Info size={18} />}</span>
          <div><strong>{complete ? "Đã đủ điều kiện gửi hồ sơ" : `Đã hoàn thiện ${ready}/${requiredTotal} điều kiện nộp` }</strong><small>{complete ? "Kiểm tra cam kết và minh chứng trước khi gửi hội đồng." : "Nhóm A chỉ cần nộp những tiêu chí bạn có thành tích; nhóm B là bắt buộc."}</small></div>
        </div>
        <div className={styles.actionButtons}>
          <Button type="submit" variant="outline" disabled={busy} loading={busy && mode.current === "draft"} onClick={() => { mode.current = "draft"; }}><Save size={17} /> Lưu nháp</Button>
          <Button type="submit" variant="primary" disabled={busy} loading={busy && mode.current === "submitted"} onClick={() => { mode.current = "submitted"; }}><span>Gửi hồ sơ xét duyệt</span> <ArrowRight size={17} /></Button>
        </div>
      </div>
    </form>
  );
}
