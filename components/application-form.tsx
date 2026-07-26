"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, CheckCircle2, FileImage, Info, Plus, Trash2, TriangleAlert } from "lucide-react";
import { IMAGE_MIME_TYPES } from "@/lib/constants";
import type { Club, EvaluationPeriod, SubmissionScope } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea, Input, Select, Field } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";

type ImageItem = { file: File; url: string };
type Mode = "individual" | "branch_collective" | "club_collective";
type Activity = {
  key: string; level: "faculty" | "university"; name: string; organizer: string;
  activityDate: string; role: string; result: string; contribution: string; images: ImageItem[];
};
type Award = {
  key: string; awardType: "certificate" | "commendation"; title: string;
  decisionNumber: string; issuedDate: string; issuer: string; images: ImageItem[];
};

const makeKey = () => crypto.randomUUID();
const LEVELS = ["faculty", "university"] as const;

export function ApplicationForm({
  branchCode, club, submissionScope, periods, fullName, accountEmail, studentId,
}: {
  branchCode: string | null; club: Club | null; submissionScope: SubmissionScope;
  periods: EvaluationPeriod[]; fullName: string; accountEmail: string; studentId: string | null;
}) {
  const router = useRouter();
  const actionRef = useRef<"draft" | "submitted">("submitted");
  const fixedMode: Mode = submissionScope === "individual" ? "individual" : submissionScope === "branch" ? "branch_collective" : "club_collective";
  const [mode, setMode] = useState<Mode>(fixedMode);
  const [periodId, setPeriodId] = useState(periods[0]?.id || "");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [portraitImages, setPortraitImages] = useState<ImageItem[]>([]);
  const [mainImages, setMainImages] = useState<ImageItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const sections = ["Loại hồ sơ", "Thông tin", "Báo cáo", "Hoạt động", "Khen thưởng", "Kiểm tra"];
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  function goStep(i: number) {
    setStep(i);
    const el = sectionRefs.current[i];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const currentPeriod = periods.find((p) => p.id === periodId) || periods[0];
  const isIndividual = mode === "individual";
  const latestAdultBirthDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toLocaleDateString("en-CA");
  }, []);
  const evidenceStart = currentPeriod?.evidence_starts_on || "";
  const evidenceEnd = currentPeriod?.evidence_ends_on || "";

  function allowed(value: Mode, p = currentPeriod) {
    if (!p || value !== fixedMode) return false;
    if (value === "individual") return Boolean(branchCode && p.allow_individual);
    if (value === "branch_collective") return Boolean(branchCode && p.allow_branch_collective);
    return Boolean(club && p.allow_club_collective);
  }

  function files(list: FileList | null, limit?: number) {
    const incoming = [...(list || [])];
    const rejected = incoming.filter((file) => !(IMAGE_MIME_TYPES as readonly string[]).includes(file.type));
    if (rejected.length) setError(`Không hỗ trợ ${rejected.length} file. Chỉ nhận ảnh JPEG, PNG hoặc WebP.`);
    const selected = incoming
      .filter((file) => (IMAGE_MIME_TYPES as readonly string[]).includes(file.type))
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    return typeof limit === "number" ? selected.slice(0, limit) : selected;
  }

  const evidenceStats = useMemo(() => {
    const faculty = activities.filter((activity) => activity.level === "faculty");
    const university = activities.filter((activity) => activity.level === "university");
    const certificates = awards.filter((award) => award.awardType === "certificate");
    const commendations = awards.filter((award) => award.awardType === "commendation");
    const activityImages = activities.reduce((total, activity) => total + activity.images.length, 0);
    const awardImages = awards.reduce((total, award) => total + award.images.length, 0);
    const completeActivities = activities.filter((activity) => activity.name.trim() && activity.images.length).length;
    const completeAwards = awards.filter((award) => award.title.trim() && award.decisionNumber.trim() && award.issuer.trim() && award.images.length).length;
    const totalImages = portraitImages.length + mainImages.length + activityImages + awardImages;
    const requiredChecks = [!isIndividual || portraitImages.length === 1, mainImages.length > 0, activities.length === completeActivities, awards.length === completeAwards];
    return {
      faculty: faculty.length, university: university.length,
      certificates: certificates.length, commendations: commendations.length,
      activityImages, awardImages, totalImages, completeActivities, completeAwards,
      completion: Math.round((requiredChecks.filter(Boolean).length / requiredChecks.length) * 100),
    };
  }, [activities, awards, portraitImages, mainImages, isIndividual]);

  const summary = useMemo(
    () => `Hồ sơ kê khai ${evidenceStats.faculty} hoạt động cấp khoa, ${evidenceStats.university} hoạt động cấp trường, ${evidenceStats.certificates} giấy chứng nhận, ${evidenceStats.commendations} bằng khen và ${evidenceStats.totalImages} ảnh minh chứng.`,
    [evidenceStats]
  );

  async function upload(applicationId: string, applicationCode: string, parentType: string, parentId: string, category: string, items: ImageItem[]) {
    for (const item of items) {
      const fd = new FormData();
      fd.set("file", item.file);
      fd.set("applicationId", applicationId);
      fd.set("applicationCode", applicationCode);
      fd.set("parentType", parentType);
      fd.set("parentId", parentId);
      fd.set("category", category);
      const r = await fetch("/api/evidence/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Tải ảnh thất bại");
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>, requestedStatus: "draft" | "submitted") {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!periodId) throw new Error("Hãy chọn đợt xét thành tích.");
      if (!allowed(mode)) throw new Error("Loại hồ sơ không được tiếp nhận trong đợt này.");
      if (requestedStatus === "submitted" && isIndividual && portraitImages.length !== 1)
        throw new Error("Hồ sơ cá nhân cần 01 ảnh chân dung rõ khuôn mặt.");

      const f = new FormData(e.currentTarget);
      const achievements = String(f.get("achievements") || "");
      const birthDate = String(f.get("birthDate") || "");
      if (requestedStatus === "submitted" && isIndividual && !birthDate)
        throw new Error("Hồ sơ cá nhân cần nhập ngày sinh.");
      if (birthDate && birthDate > latestAdultBirthDate)
        throw new Error("Người nộp hồ sơ phải đủ 18 tuổi.");
      const invalidActivity = activities.find((activity) => !activity.activityDate || activity.activityDate < evidenceStart || activity.activityDate > evidenceEnd);
      const invalidAward = awards.find((award) => !award.issuedDate || award.issuedDate < evidenceStart || award.issuedDate > evidenceEnd);
      if (requestedStatus === "submitted" && invalidActivity)
        throw new Error(`Hoạt động “${invalidActivity.name || "chưa đặt tên"}” cần ngày từ ${evidenceStart} đến ${evidenceEnd}.`);
      if (requestedStatus === "submitted" && invalidAward)
        throw new Error(`Khen thưởng “${invalidAward.title || "chưa đặt tên"}” cần ngày cấp từ ${evidenceStart} đến ${evidenceEnd}.`);
      const payload = {
        status: "draft",
        evaluationPeriodId: periodId,
        applicationType: isIndividual ? "individual" : "collective",
        collectiveType: mode === "branch_collective" ? "branch" : mode === "club_collective" ? "club" : null,
        branchCode: branchCode || "",
        clubId: mode === "club_collective" ? club?.id || null : null,
        subjectName: String(f.get("subjectName")),
        birthDate,
        position: String(f.get("position") || ""),
        phone: String(f.get("phone") || ""),
        achievements,
        roleContribution: String(f.get("roleContribution") || ""),
        targetsResult: String(f.get("targetsResult") || ""),
        initiatives: String(f.get("initiatives") || ""),
        impact: String(f.get("impact") || ""),
        summary: String(f.get("summary") || summary),
        activities: activities.map(({ images, ...a }) => ({ clientKey: a.key, ...a })),
        priorAwards: awards.map(({ images, key, ...a }) => ({ clientKey: key, ...a })),
      };

      const r = await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await r.json();
      if (!r.ok) {
        if (r.status === 409 && result.existingApplicationId) {
          router.push(`/applications/${result.existingApplicationId}`);
          router.refresh();
        }
        throw new Error(result.error || "Không thể lưu hồ sơ");
      }

      await upload(result.application.id, result.application.code, "application", result.application.id, "portrait", portraitImages);
      await upload(result.application.id, result.application.code, "application", result.application.id, "main", mainImages);
      for (const a of activities) await upload(result.application.id, result.application.code, "activity", result.activityMap[a.key], a.level, a.images);
      for (const a of awards) await upload(result.application.id, result.application.code, "award", result.awardMap[a.key], "award", a.images);

      if (requestedStatus === "submitted") {
        const final = await fetch(`/api/applications/${result.application.id}`, {
          method: "PATCH", headers: { "content-type": "application/json" },
          body: JSON.stringify({ achievements, summary: String(f.get("summary") || summary), resubmit: true }),
        });
        const data = await final.json();
        if (!final.ok) throw new Error(data.error || "Không thể gửi hồ sơ");
      }

      router.push(`/applications/${result.application.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  const subjectDefault = mode === "individual" ? fullName : mode === "branch_collective" ? `Chi đoàn ${branchCode || ""}` : club?.name || "Câu lạc bộ";

  return (
    <form onSubmit={(e) => submit(e, actionRef.current)}>
      <Stepper steps={sections.map(label => ({ label }))} current={step} onSelect={goStep} />
      <div className="form-layout">
        <div className="form-main">
          {error && <div className="notice notice-error"><TriangleAlert size={17} />{error}</div>}

          <section className="card evidence-guide" aria-labelledby="evidence-guide-title">
            <div className="evidence-guide-icon"><Info size={22} aria-hidden="true" /></div>
            <div>
              <span className="evidence-guide-eyebrow">CHUẨN BỊ TRƯỚC KHI NỘP</span>
              <h2 id="evidence-guide-title">Minh chứng rõ nội dung, đúng từng thành tích</h2>
              <p>Ảnh cần đọc được tên hoạt động, đơn vị tổ chức, kết quả hoặc thông tin quyết định. Minh chứng hợp lệ từ <strong>{evidenceStart ? new Date(`${evidenceStart}T00:00:00`).toLocaleDateString("vi-VN") : "—"}</strong> đến <strong>{evidenceEnd ? new Date(`${evidenceEnd}T00:00:00`).toLocaleDateString("vi-VN") : "—"}</strong>.</p>
              <div className="evidence-guide-chips">
                <span><FileImage size={14} /> JPEG, PNG, WebP</span>
                <span><CheckCircle2 size={14} /> Chụp đủ 4 góc</span>
                <span><Award size={14} /> Không chỉnh sửa nội dung</span>
              </div>
            </div>
          </section>

          {/* Section 1 */}
          <section className="card form-section" ref={(el) => { sectionRefs.current[0] = el; }}>
            <h3>1. Đợt xét và loại hồ sơ</h3>
            <p>Mỗi đối tượng chỉ có một hồ sơ trong một đợt xét.</p>
            <div className="field" style={{ marginBottom: "var(--space-4)" }}>
              <label className="field-label">Đợt xét thành tích *</label>
              <select className="select" value={periodId} onChange={(e) => { setPeriodId(e.target.value); setMode(fixedMode); }}>
                {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {currentPeriod && <span className="field-helper">Nhận hồ sơ đến {new Date(currentPeriod.ends_at).toLocaleString("vi-VN")}</span>}
            </div>
            <div className="flex gap-3 flex-wrap">
              {submissionScope === "individual" && branchCode && currentPeriod?.allow_individual && (
                <button type="button" className={`mode-btn ${mode === "individual" ? "is-active" : ""}`}
                  onClick={() => setMode("individual")}
                >
                  <div className="font-semibold text-sm">Hồ sơ cá nhân</div>
                  <div className="text-xs text-secondary">01 hồ sơ/cá nhân/đợt</div>
                </button>
              )}
              {submissionScope === "branch" && branchCode && currentPeriod?.allow_branch_collective && (
                <button type="button" className={`mode-btn ${mode === "branch_collective" ? "is-active" : ""}`}
                  onClick={() => setMode("branch_collective")}
                >
                  <div className="font-semibold text-sm">Tập thể Chi đoàn</div>
                  <div className="text-xs text-secondary">01 hồ sơ/Chi đoàn/đợt</div>
                </button>
              )}
              {submissionScope === "club" && club && currentPeriod?.allow_club_collective && (
                <button type="button" className={`mode-btn ${mode === "club_collective" ? "is-active" : ""}`}
                  onClick={() => setMode("club_collective")}
                >
                  <div className="font-semibold text-sm">Tập thể CLB</div>
                  <div className="text-xs text-secondary">01 hồ sơ/CLB/đợt</div>
                </button>
              )}
            </div>
          </section>

          {/* Section 2 */}
          <section className="card form-section" ref={(el) => { sectionRefs.current[1] = el; }}>
            <h3>2. Thông tin chung</h3>
            <p>Đơn vị được cố định theo tài khoản đăng nhập.</p>
            <div className="form-grid">
              <div className="field">
                <label className="field-label">{isIndividual ? "Họ và tên" : "Tên tập thể"} *</label>
                <input className="input" name="subjectName" required minLength={2} defaultValue={subjectDefault} key={`${mode}-${periodId}`} />
              </div>
              <div className="field">
                <label className="field-label">Đơn vị</label>
                <input className="input" value={mode === "club_collective" ? club?.name || "" : branchCode || ""} disabled />
              </div>
              {isIndividual && (
                <>
                  <div className="field">
                    <label className="field-label">Mã số sinh viên</label>
                    <input className="input" value={studentId || ""} readOnly disabled />
                    <span className="field-helper">Tự động lấy từ email đăng nhập.</span>
                  </div>
                  <div className="field">
                    <label className="field-label">Ngày sinh *</label>
                    <input className="input" name="birthDate" type="date" max={latestAdultBirthDate} />
                    <span className="field-helper">Phải đủ 18 tuổi. Ngày sinh muộn nhất: {new Date(`${latestAdultBirthDate}T00:00:00`).toLocaleDateString("vi-VN")}.</span>
                  </div>
                  <div className="field">
                    <label className="field-label">Chức vụ</label>
                    <input className="input" name="position" />
                  </div>
                  <div className="field">
                    <label className="field-label">Số điện thoại</label>
                    <input className="input" name="phone" />
                  </div>
                  <div className="field span-2">
                    <label className="field-label">Email</label>
                    <input className="input" value={accountEmail} readOnly disabled />
                  </div>
                  <div className="field span-2">
                    <label className="field-label">Ảnh chân dung *</label>
                    <div className="upload-zone">
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const s = files(e.target.files, 1); setPortraitImages(s); }} />
                      <div className="upload-note">Chọn 01 ảnh chính diện, rõ khuôn mặt.</div>
                    </div>
                    {portraitImages.length > 0 && (
                      <div className="image-grid portrait mt-2">
                        {portraitImages.map((x, i) => (
                          <div className="image-tile" key={i}>
                            <img src={x.url} alt="" />
                            <button type="button" className="image-tile-remove" onClick={() => setPortraitImages([])}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Section 3: Report */}
          <section className="card form-section" ref={(el) => { sectionRefs.current[2] = el; }}>
            <h3>3. Báo cáo thành tích</h3>
            <p>Nêu rõ kết quả, vai trò và hiệu quả đạt được.</p>
            <div className="form-grid">
              <div className="field span-2">
                <label className="field-label">Thành tích nổi bật *</label>
                <textarea className="textarea" name="achievements" required minLength={20} placeholder="Gợi ý: Nêu tên thành tích, thời gian, cấp tổ chức, kết quả định lượng và tác động nổi bật." />
              </div>
              <div className="field">
                <label className="field-label">Vai trò tham mưu, tổ chức</label>
                <textarea className="textarea" name="roleContribution" placeholder="Ví dụ: Lập kế hoạch, điều phối 20 thành viên, phụ trách truyền thông..." />
              </div>
              <div className="field">
                <label className="field-label">Kết quả thực hiện chỉ tiêu</label>
                <textarea className="textarea" name="targetsResult" placeholder="Ví dụ: Hoàn thành 12/12 chỉ tiêu, đạt 120% kế hoạch..." />
              </div>
              <div className="field">
                <label className="field-label">Sáng kiến, giải pháp</label>
                <textarea className="textarea" name="initiatives" placeholder="Mô tả giải pháp mới, cách áp dụng và khả năng nhân rộng." />
              </div>
              <div className="field">
                <label className="field-label">Hiệu quả mang lại</label>
                <textarea className="textarea" name="impact" placeholder="Nêu số người hưởng lợi, thời gian hoặc chi phí tiết kiệm, thay đổi đạt được." />
              </div>
              <div className="field span-2">
                <label className="field-label">Ảnh minh chứng tổng hợp</label>
                <div className="upload-zone">
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { const s = files(e.target.files); setMainImages((v) => [...v, ...s]); }} />
                  <div className="upload-note"><strong>{mainImages.length} ảnh đã chọn.</strong> Ưu tiên ảnh quyết định, xác nhận kết quả hoặc toàn cảnh hoạt động.</div>
                </div>
                {mainImages.length > 0 && (
                  <div className="image-grid mt-2">
                    {mainImages.map((x, i) => (
                      <div className="image-tile" key={i}>
                        <img src={x.url} alt="" />
                        <button type="button" className="image-tile-remove" onClick={() => setMainImages((v) => v.filter((_, n) => n !== i))}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 4: Activities */}
          <section className="card form-section" ref={(el) => { sectionRefs.current[3] = el; }}>
            <div className="section-toolbar">
              <div>
                <h3>4. Hoạt động tham gia</h3>
                <p>Mỗi hoạt động có bộ ảnh minh chứng riêng.</p>
              </div>
            </div>
            {LEVELS.map((level) => (
              <div key={level} className="record-group">
                <div className="record-group-header">
                  <h4>{level === "faculty" ? "Hoạt động cấp khoa" : "Hoạt động cấp trường"}</h4>
                  <Button size="sm" variant="outline" onClick={() => setActivities((v) => [...v, { key: makeKey(), level, name: "", organizer: "", activityDate: "", role: "Người tham gia", result: "", contribution: "", images: [] }])}>
                    <Plus size={14} /> Thêm
                  </Button>
                </div>
                {activities.filter((a) => a.level === level).map((a, idx) => (
                  <div className="record" key={a.key}>
                    <div className="record-header">
                      <div className="record-title">
                        <span className="record-index">{idx + 1}</span>
                        {a.name || "Hoạt động mới"}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setActivities((v) => v.filter((x) => x.key !== a.key))}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    <div className="form-grid">
                      <Field label="Tên hoạt động *">
                        <input className="input" placeholder="Ví dụ: Ngày hội Công nghệ DNTU 2026" value={a.name} onChange={(e) => setActivities((s) => s.map((x) => x.key === a.key ? { ...x, name: e.target.value } : x))} />
                      </Field>
                      <Field label="Đơn vị tổ chức">
                        <input className="input" value={a.organizer} onChange={(e) => setActivities((s) => s.map((x) => x.key === a.key ? { ...x, organizer: e.target.value } : x))} />
                      </Field>
                      <Field label="Thời gian">
                        <input className="input" type="date" min={evidenceStart} max={evidenceEnd} value={a.activityDate} onChange={(e) => setActivities((s) => s.map((x) => x.key === a.key ? { ...x, activityDate: e.target.value } : x))} />
                      </Field>
                      <Field label="Vai trò">
                        <input className="input" value={a.role} onChange={(e) => setActivities((s) => s.map((x) => x.key === a.key ? { ...x, role: e.target.value } : x))} />
                      </Field>
                      <Field label="Kết quả">
                        <input className="input" value={a.result} onChange={(e) => setActivities((s) => s.map((x) => x.key === a.key ? { ...x, result: e.target.value } : x))} />
                      </Field>
                      <Field label="Đóng góp cụ thể">
                        <input className="input" value={a.contribution} onChange={(e) => setActivities((s) => s.map((x) => x.key === a.key ? { ...x, contribution: e.target.value } : x))} />
                      </Field>
                      <div className="field span-2">
                        <div className="upload-zone">
                          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => {
                            const selected = files(e.target.files);
                            setActivities((items) => items.map((item) => item.key === a.key ? { ...item, images: [...item.images, ...selected] } : item));
                          }} />
                          <div className="upload-note"><strong>{a.images.length} ảnh đã chọn.</strong> Nộp thư mời/xác nhận tham gia và ảnh thể hiện vai trò hoặc kết quả.</div>
                        </div>
                        {a.images.length > 0 && (
                          <div className="image-grid mt-2">
                            {a.images.map((x, i) => (
                              <div className="image-tile" key={i}>
                                <img src={x.url} alt="" />
                                <button type="button" className="image-tile-remove" onClick={() => setActivities((s) => s.map((x) => x.key === a.key ? { ...x, images: x.images.filter((_, n) => n !== i) } : x))}>×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {activities.filter((a) => a.level === level).length === 0 && (
                  <p className="text-sm text-secondary">Chưa có hoạt động nào.</p>
                )}
              </div>
            ))}
          </section>

          {/* Section 5: Awards */}
          <section className="card form-section" ref={(el) => { sectionRefs.current[4] = el; }}>
            <div className="section-toolbar">
              <div>
                <h3>5. Thành tích đã được khen thưởng</h3>
                <p>Kê khai giấy chứng nhận hoặc bằng khen đã nhận.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setAwards((v) => [...v, { key: makeKey(), awardType: "certificate", title: "", decisionNumber: "", issuedDate: "", issuer: "", images: [] }])}>
                <Plus size={14} /> Thêm
              </Button>
            </div>
            {awards.map((a, idx) => (
              <div className="record" key={a.key}>
                <div className="record-header">
                  <div className="record-title">
                    <span className="record-index">{idx + 1}</span>
                    {a.title || "Thành tích mới"}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setAwards((v) => v.filter((x) => x.key !== a.key))}>
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="form-grid">
                  <Field label="Hình thức">
                    <select className="select" value={a.awardType} onChange={(e) => setAwards((s) => s.map((x) => x.key === a.key ? { ...x, awardType: e.target.value as Award["awardType"] } : x))}>
                      <option value="certificate">Giấy chứng nhận</option>
                      <option value="commendation">Bằng khen</option>
                    </select>
                  </Field>
                  <Field label="Tên thành tích *">
                    <input className="input" value={a.title} onChange={(e) => setAwards((s) => s.map((x) => x.key === a.key ? { ...x, title: e.target.value } : x))} />
                  </Field>
                  <Field label="Số quyết định / Số GCN *">
                    <input className="input" value={a.decisionNumber} onChange={(e) => setAwards((s) => s.map((x) => x.key === a.key ? { ...x, decisionNumber: e.target.value } : x))} />
                  </Field>
                  <Field label="Ngày cấp">
                    <input className="input" type="date" min={evidenceStart} max={evidenceEnd} value={a.issuedDate} onChange={(e) => setAwards((s) => s.map((x) => x.key === a.key ? { ...x, issuedDate: e.target.value } : x))} />
                  </Field>
                  <Field label="Đơn vị trao tặng *">
                    <input className="input" value={a.issuer} onChange={(e) => setAwards((s) => s.map((x) => x.key === a.key ? { ...x, issuer: e.target.value } : x))} />
                  </Field>
                  <div className="field span-2">
                    <label className="field-label">Ảnh giấy chứng nhận / bằng khen</label>
                    <div className="upload-zone">
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => {
                        const s = files(e.target.files);
                        setAwards((v) => v.map((x) => x.key === a.key ? { ...x, images: [...x.images, ...s] } : x));
                      }} />
                      <div className="upload-note"><strong>{a.images.length} ảnh đã chọn.</strong> Chụp trọn văn bản, rõ số quyết định, tên người nhận và đơn vị cấp.</div>
                    </div>
                    {a.images.length > 0 && (
                      <div className="image-grid mt-2">
                        {a.images.map((x, i) => (
                          <div className="image-tile" key={i}>
                            <img src={x.url} alt="" />
                            <button type="button" className="image-tile-remove" onClick={() => setAwards((s) => s.map((x) => x.key === a.key ? { ...x, images: x.images.filter((_, n) => n !== i) } : x))}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {awards.length === 0 && <p className="text-sm text-secondary">Chưa có thành tích nào.</p>}
          </section>

          {/* Section 6: Summary */}
          <section className="card form-section evidence-summary" ref={(el) => { sectionRefs.current[5] = el; }}>
            <div className="evidence-summary-heading">
              <div><span className="evidence-guide-eyebrow">TỰ ĐỘNG CẬP NHẬT</span><h3>6. Bảng tóm tắt thông tin nộp</h3><p>Số liệu lấy trực tiếp từ nội dung và ảnh đã thêm.</p></div>
              <strong>{evidenceStats.completion}%<small>hoàn thiện</small></strong>
            </div>
            <div className="evidence-completion" role="progressbar" aria-label="Mức độ hoàn thiện hồ sơ" aria-valuemin={0} aria-valuemax={100} aria-valuenow={evidenceStats.completion}><span style={{ width: `${evidenceStats.completion}%` }} /></div>
            <div className="evidence-summary-table" role="table" aria-label="Thống kê thông tin hồ sơ">
              <div className="evidence-summary-row is-header" role="row"><span>Nhóm thông tin</span><span>Số mục</span><span>Ảnh</span><span>Đủ dữ liệu</span></div>
              <div className="evidence-summary-row" role="row"><span>Hoạt động cấp Khoa</span><strong>{evidenceStats.faculty}</strong><strong>{activities.filter((a) => a.level === "faculty").reduce((n, a) => n + a.images.length, 0)}</strong><span>{activities.filter((a) => a.level === "faculty" && a.name.trim() && a.images.length).length}/{evidenceStats.faculty}</span></div>
              <div className="evidence-summary-row" role="row"><span>Hoạt động cấp Trường</span><strong>{evidenceStats.university}</strong><strong>{activities.filter((a) => a.level === "university").reduce((n, a) => n + a.images.length, 0)}</strong><span>{activities.filter((a) => a.level === "university" && a.name.trim() && a.images.length).length}/{evidenceStats.university}</span></div>
              <div className="evidence-summary-row" role="row"><span>Giấy chứng nhận</span><strong>{evidenceStats.certificates}</strong><strong>{awards.filter((a) => a.awardType === "certificate").reduce((n, a) => n + a.images.length, 0)}</strong><span>{awards.filter((a) => a.awardType === "certificate" && a.title.trim() && a.decisionNumber.trim() && a.issuer.trim() && a.images.length).length}/{evidenceStats.certificates}</span></div>
              <div className="evidence-summary-row" role="row"><span>Bằng khen</span><strong>{evidenceStats.commendations}</strong><strong>{awards.filter((a) => a.awardType === "commendation").reduce((n, a) => n + a.images.length, 0)}</strong><span>{awards.filter((a) => a.awardType === "commendation" && a.title.trim() && a.decisionNumber.trim() && a.issuer.trim() && a.images.length).length}/{evidenceStats.commendations}</span></div>
              <div className="evidence-summary-row is-total" role="row"><span>Tổng minh chứng</span><strong>{activities.length + awards.length}</strong><strong>{evidenceStats.totalImages}</strong><span>{evidenceStats.completeActivities + evidenceStats.completeAwards}/{activities.length + awards.length}</span></div>
            </div>
            <input type="hidden" name="summary" value={summary} />
            <p className="evidence-auto-summary"><Info size={15} />{summary}</p>
          </section>
        </div>

        {/* Sidebar */}
          <aside className="form-sidebar">
          <div className="sidebar-card">
            <h4 className="sidebar-card-title">Gửi hồ sơ</h4>
            <p className="text-sm text-secondary mb-4">Sau khi gửi, không thể tạo hồ sơ thứ hai cho cùng đối tượng trong đợt này.</p>
            <div className="flex flex-col gap-3">
              <Button variant="primary" loading={busy} onClick={() => { actionRef.current = "submitted"; }}>
                {busy ? "Đang xử lý..." : "Hoàn tất và gửi"}
              </Button>
              <Button variant="outline" loading={busy} onClick={() => { actionRef.current = "draft"; }}>
                Lưu nháp
              </Button>
            </div>
          </div>

          <div className="sidebar-card">
            <h4 className="sidebar-card-title">Kiểm tra trước khi gửi</h4>
            <div className="evidence-check-progress"><span style={{ width: `${evidenceStats.completion}%` }} /></div>
            <div className="evidence-checklist">
              <div className={portraitImages.length === 1 || !isIndividual ? "is-done" : ""}>{portraitImages.length === 1 || !isIndividual ? "✓" : "○"} Ảnh chân dung</div>
              <div className={mainImages.length ? "is-done" : ""}>{mainImages.length ? "✓" : "○"} Minh chứng tổng hợp ({mainImages.length})</div>
              <div className={activities.length === evidenceStats.completeActivities ? "is-done" : ""}>{activities.length === evidenceStats.completeActivities ? "✓" : "○"} Hoạt động đủ ảnh ({evidenceStats.completeActivities}/{activities.length})</div>
              <div className={awards.length === evidenceStats.completeAwards ? "is-done" : ""}>{awards.length === evidenceStats.completeAwards ? "✓" : "○"} Khen thưởng đủ ảnh ({evidenceStats.completeAwards}/{awards.length})</div>
              <div className="is-total"><FileImage size={15} /> Tổng cộng {evidenceStats.totalImages} ảnh</div>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
