"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IMAGE_MIME_TYPES } from "@/lib/constants";
import type { Club, EvaluationPeriod, SubmissionScope } from "@/lib/types";
type ImageItem = {
    file: File;
    url: string;
};
type Mode = "individual" | "branch_collective" | "club_collective";
type Activity = {
    key: string;
    level: "faculty" | "university";
    name: string;
    organizer: string;
    activityDate: string;
    role: string;
    result: string;
    contribution: string;
    images: ImageItem[];
};
type Award = {
    key: string;
    awardType: "certificate" | "commendation";
    title: string;
    decisionNumber: string;
    issuedDate: string;
    issuer: string;
    images: ImageItem[];
};
const makeKey = () => crypto.randomUUID();
export function ApplicationForm({ branchCode, club, submissionScope, periods, fullName, accountEmail, studentId }: {
    branchCode: string | null;
    club: Club | null;
    submissionScope: SubmissionScope;
    periods: EvaluationPeriod[];
    fullName: string;
    accountEmail: string;
    studentId: string | null;
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
    const currentPeriod = periods.find(p => p.id === periodId) || periods[0];
    const isIndividual = mode === "individual";
    function allowed(value: Mode, p = currentPeriod) {
        if (!p)
            return false;
        if (value !== fixedMode)
            return false;
        if (value === "individual")
            return Boolean(branchCode && p.allow_individual);
        if (value === "branch_collective")
            return Boolean(branchCode && p.allow_branch_collective);
        return Boolean(club && p.allow_club_collective);
    }
    function changePeriod(id: string) {
        setPeriodId(id);
        const p = periods.find(x => x.id === id);
        if (!p)
            return;
        setMode(fixedMode);
    }
    function files(list: FileList | null, limit?: number) { const selected = [...(list || [])].filter(file => (IMAGE_MIME_TYPES as readonly string[]).includes(file.type)).map(file => ({ file, url: URL.createObjectURL(file) })); return typeof limit === "number" ? selected.slice(0, limit) : selected; }
    function addActivity(level: "faculty" | "university") { setActivities(v => [...v, { key: makeKey(), level, name: "", organizer: "", activityDate: "", role: "Người tham gia", result: "", contribution: "", images: [] }]); }
    function addAward() { setAwards(v => [...v, { key: makeKey(), awardType: "certificate", title: "", decisionNumber: "", issuedDate: "", issuer: "", images: [] }]); }
    const summary = useMemo(() => `Hồ sơ kê khai ${activities.filter(a => a.level === "faculty").length} hoạt động cấp khoa, ${activities.filter(a => a.level === "university").length} hoạt động cấp trường và ${awards.length} thành tích đã được khen thưởng.`, [activities, awards]);
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
            if (!r.ok)
                throw new Error(d.error || "Tải ảnh thất bại");
        }
    }
    async function submit(e: React.FormEvent<HTMLFormElement>, requestedStatus: "draft" | "submitted") {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            if (!periodId)
                throw new Error("Hãy chọn đợt xét thành tích.");
            if (!allowed(mode))
                throw new Error("Loại hồ sơ không được tiếp nhận trong đợt này.");
            if (requestedStatus === "submitted" && isIndividual && portraitImages.length !== 1)
                throw new Error("Hồ sơ cá nhân cần 01 ảnh chân dung rõ khuôn mặt.");
            const f = new FormData(e.currentTarget);
            const achievements = String(f.get("achievements") || "");
            const payload = { status: "draft", evaluationPeriodId: periodId, applicationType: isIndividual ? "individual" : "collective", collectiveType: mode === "branch_collective" ? "branch" : mode === "club_collective" ? "club" : null, branchCode: branchCode || "", clubId: mode === "club_collective" ? club?.id || null : null, subjectName: String(f.get("subjectName")), birthDate: String(f.get("birthDate") || ""), position: String(f.get("position") || ""), phone: String(f.get("phone") || ""), achievements, roleContribution: String(f.get("roleContribution") || ""), targetsResult: String(f.get("targetsResult") || ""), initiatives: String(f.get("initiatives") || ""), impact: String(f.get("impact") || ""), summary: String(f.get("summary") || summary), activities: activities.map(({ images, ...a }) => ({ clientKey: a.key, ...a })), priorAwards: awards.map(({ images, key, ...a }) => ({ clientKey: key, ...a })) };
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
            for (const a of activities)
                await upload(result.application.id, result.application.code, "activity", result.activityMap[a.key], a.level, a.images);
            for (const a of awards)
                await upload(result.application.id, result.application.code, "award", result.awardMap[a.key], "award", a.images);
            if (requestedStatus === "submitted") {
                const final = await fetch(`/api/applications/${result.application.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ achievements, summary: String(f.get("summary") || summary), resubmit: true }) });
                const data = await final.json();
                if (!final.ok)
                    throw new Error(data.error || "Không thể gửi hồ sơ");
            }
            router.push(`/applications/${result.application.id}`);
            router.refresh();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
        }
        finally {
            setBusy(false);
        }
    }
    const subjectDefault = mode === "individual" ? fullName : mode === "branch_collective" ? `Chi đoàn ${branchCode || ""}` : club?.name || "Câu lạc bộ";
    return <form onSubmit={e => submit(e, actionRef.current)}><div className="form-layout"><div className="form-main">{error && <div className="notice error">{error}</div>}<section className="card section"><div className="section-title"><div><h3>1. Đợt xét và loại hồ sơ</h3><p>Mỗi đối tượng chỉ có một hồ sơ trong một đợt xét.</p></div></div><div className="field" style={{ marginBottom: 13 }}><label>Đợt xét thành tích *</label><select value={periodId} onChange={e => changePeriod(e.target.value)}>{periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{currentPeriod && <small>Nhận hồ sơ đến {new Date(currentPeriod.ends_at).toLocaleString("vi-VN")}</small>}</div><div className="mode-switch mode-switch-three">{submissionScope === "individual" && branchCode && currentPeriod?.allow_individual && <ModeButton active={mode === "individual"} title="Hồ sơ cá nhân" note="01 hồ sơ/cá nhân/đợt" onClick={() => setMode("individual")}/>} {submissionScope === "branch" && branchCode && currentPeriod?.allow_branch_collective && <ModeButton active={mode === "branch_collective"} title="Tập thể Chi đoàn" note="01 hồ sơ/Chi đoàn/đợt" onClick={() => setMode("branch_collective")}/>} {submissionScope === "club" && club && currentPeriod?.allow_club_collective && <ModeButton active={mode === "club_collective"} title="Tập thể CLB" note="01 hồ sơ/CLB/đợt" onClick={() => setMode("club_collective")}/>}</div></section>
  <section className="card section"><div className="section-title"><div><h3>2. Thông tin chung</h3><p>Đơn vị được cố định theo tài khoản đăng nhập.</p></div></div><div className="form-grid"><div className="field"><label>{isIndividual ? "Họ và tên" : "Tên tập thể"} *</label><input name="subjectName" required minLength={2} defaultValue={subjectDefault} key={`${mode}-${periodId}`}/></div><div className="field"><label>Đơn vị</label><input value={mode === "club_collective" ? club?.name || "" : branchCode || ""} disabled/></div>{isIndividual && <><div className="field"><label>Mã số sinh viên</label><input value={studentId || ""} readOnly disabled/><small>Tự động lấy từ email đăng nhập.</small></div><div className="field"><label>Ngày sinh</label><input name="birthDate" type="date"/></div><div className="field"><label>Chức vụ</label><input name="position"/></div><div className="field"><label>Số điện thoại</label><input name="phone"/></div><div className="field span-2"><label>Email</label><input value={accountEmail} readOnly disabled/></div><ImageInput label="Ảnh chân dung *" note="Chọn 01 ảnh chính diện, rõ khuôn mặt." items={portraitImages} setItems={setPortraitImages} files={l => files(l, 1)} single portrait/></>}</div></section>
  <section className="card section"><div className="section-title"><div><h3>3. Báo cáo thành tích</h3><p>Nêu rõ kết quả, vai trò và hiệu quả đạt được.</p></div></div><div className="form-grid"><div className="field span-2"><label>Thành tích nổi bật *</label><textarea name="achievements" required minLength={20}/></div><div className="field"><label>Vai trò tham mưu, tổ chức</label><textarea name="roleContribution"/></div><div className="field"><label>Kết quả thực hiện chỉ tiêu</label><textarea name="targetsResult"/></div><div className="field"><label>Sáng kiến, giải pháp</label><textarea name="initiatives"/></div><div className="field"><label>Hiệu quả mang lại</label><textarea name="impact"/></div><ImageInput label="Ảnh minh chứng tổng hợp" note="Có thể chọn nhiều ảnh." items={mainImages} setItems={setMainImages} files={files}/></div></section>
  <section className="card section"><div className="section-title"><div><h3>4. Hoạt động tham gia</h3><p>Mỗi hoạt động có bộ ảnh minh chứng riêng.</p></div></div>{(["faculty", "university"] as const).map(level => <div className="repeat-group" key={level} style={{ marginBottom: 12 }}><div className="repeat-head"><h4>{level === "faculty" ? "Hoạt động cấp khoa" : "Hoạt động cấp trường"}</h4><button className="btn" type="button" onClick={() => addActivity(level)}>Thêm hoạt động</button></div>{activities.filter(a => a.level === level).map((a, index) => <div className="record" key={a.key}><div className="record-head"><div className="record-title"><span className="index">{index + 1}</span>{a.name || "Hoạt động mới"}</div><button className="remove" type="button" onClick={() => setActivities(v => v.filter(x => x.key !== a.key))}>Xóa</button></div><div className="form-grid"><Field label="Tên hoạt động *" value={a.name} onChange={v => setActivities(s => s.map(x => x.key === a.key ? { ...x, name: v } : x))}/><Field label="Đơn vị tổ chức" value={a.organizer} onChange={v => setActivities(s => s.map(x => x.key === a.key ? { ...x, organizer: v } : x))}/><Field label="Thời gian" type="date" value={a.activityDate} onChange={v => setActivities(s => s.map(x => x.key === a.key ? { ...x, activityDate: v } : x))}/><Field label="Vai trò" value={a.role} onChange={v => setActivities(s => s.map(x => x.key === a.key ? { ...x, role: v } : x))}/><Field label="Kết quả" value={a.result} onChange={v => setActivities(s => s.map(x => x.key === a.key ? { ...x, result: v } : x))}/><Field label="Đóng góp cụ thể" value={a.contribution} onChange={v => setActivities(s => s.map(x => x.key === a.key ? { ...x, contribution: v } : x))}/><ImageInput label="Ảnh minh chứng" note="Ảnh gắn riêng với hoạt động." items={a.images} setItems={items => setActivities(s => s.map(x => x.key === a.key ? { ...x, images: typeof items === "function" ? items(x.images) : items } : x))} files={files}/></div></div>)}</div>)}</section>
  <section className="card section"><div className="section-title"><div><h3>5. Thành tích đã được khen thưởng</h3><p>Kê khai giấy chứng nhận hoặc bằng khen đã nhận.</p></div><button className="btn" type="button" onClick={addAward}>Thêm thành tích</button></div>{awards.map((a, index) => <div className="record" key={a.key}><div className="record-head"><div className="record-title"><span className="index">{index + 1}</span>{a.title || "Thành tích mới"}</div><button className="remove" type="button" onClick={() => setAwards(v => v.filter(x => x.key !== a.key))}>Xóa</button></div><div className="form-grid"><div className="field"><label>Hình thức</label><select value={a.awardType} onChange={e => setAwards(s => s.map(x => x.key === a.key ? { ...x, awardType: e.target.value as Award["awardType"] } : x))}><option value="certificate">Giấy chứng nhận</option><option value="commendation">Bằng khen</option></select></div><Field label="Tên thành tích *" value={a.title} onChange={v => setAwards(s => s.map(x => x.key === a.key ? { ...x, title: v } : x))}/><Field label="Số quyết định / Số GCN *" value={a.decisionNumber} onChange={v => setAwards(s => s.map(x => x.key === a.key ? { ...x, decisionNumber: v } : x))}/><Field label="Ngày cấp" type="date" value={a.issuedDate} onChange={v => setAwards(s => s.map(x => x.key === a.key ? { ...x, issuedDate: v } : x))}/><Field label="Đơn vị trao tặng *" value={a.issuer} onChange={v => setAwards(s => s.map(x => x.key === a.key ? { ...x, issuer: v } : x))}/><ImageInput label="Ảnh giấy chứng nhận / bằng khen" note="Chụp đầy đủ nội dung." items={a.images} setItems={items => setAwards(s => s.map(x => x.key === a.key ? { ...x, images: typeof items === "function" ? items(x.images) : items } : x))} files={files}/></div></div>)}</section><section className="card section"><div className="section-title"><div><h3>6. Tóm tắt hồ sơ</h3><p>Có thể chỉnh sửa trước khi gửi.</p></div></div><textarea name="summary" defaultValue={summary}/></section></div><aside className="form-side"><div className="card side-card"><h4>Gửi hồ sơ</h4><p className="panel-sub">Sau khi gửi, không thể tạo hồ sơ thứ hai cho cùng đối tượng trong đợt này.</p><div className="stack"><button type="submit" className="btn primary" disabled={busy} onClick={() => { actionRef.current = "submitted"; }}>{busy ? "Đang xử lý..." : "Hoàn tất và gửi"}</button></div></div><div className="card side-card"><h4>Kiểm tra trước khi gửi</h4><div className="checklist"><div className={portraitImages.length === 1 || !isIndividual ? "check-item ok" : "check-item"}>{portraitImages.length === 1 || !isIndividual ? "✓" : "○"} Ảnh chân dung</div><div className={mainImages.length ? "check-item ok" : "check-item"}>{mainImages.length ? "✓" : "○"} Ảnh minh chứng tổng hợp</div></div></div></aside></div></form>;
}
function ModeButton({ active, title, note, onClick }: {
    active: boolean;
    title: string;
    note: string;
    onClick: () => void;
}) { return <button type="button" className={`mode-card ${active ? "active" : ""}`} onClick={onClick}><strong>{title}</strong><span>{note}</span></button>; }
function Field({ label, value, onChange, type = "text" }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
}) { return <div className="field"><label>{label}</label><input type={type} value={value} onChange={e => onChange(e.target.value)}/></div>; }
function ImageInput({ label, note, items, setItems, files, single = false, portrait = false }: {
    label: string;
    note: string;
    items: ImageItem[];
    setItems: React.Dispatch<React.SetStateAction<ImageItem[]>> | ((v: ImageItem[] | ((x: ImageItem[]) => ImageItem[])) => void);
    files: (f: FileList | null) => ImageItem[];
    single?: boolean;
    portrait?: boolean;
}) { return <div className="field span-2"><label>{label}</label><div className={`upload-box ${portrait ? "portrait-upload" : ""}`}><input type="file" accept="image/jpeg,image/png,image/webp" multiple={!single} onChange={e => { const selected = files(e.target.files); setItems(single ? selected.slice(0, 1) : (v) => [...v, ...selected]); }}/><div className="upload-note">{note}</div><div className={`image-preview ${portrait ? "portrait-preview" : ""}`}>{items.map((x, i) => <div className="image-tile" key={`${x.file.name}-${i}`}><img src={x.url} alt={x.file.name}/><button type="button" onClick={() => setItems(v => v.filter((_, n) => n !== i))}>×</button></div>)}</div></div></div>; }

