"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import styles from "@/app/complete-profile/complete-profile.module.css";

export function CompleteStudentProfileForm({
  initial, branches,
}: {
  initial: { fullName: string; branchCode: string; birthDate: string; phone: string };
  branches: { code: string; name: string }[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(data.get("fullName") || "").trim(),
          branchCode: String(data.get("branchCode") || ""),
          phone: String(data.get("phone") || "").trim(),
          birthDate: String(data.get("birthDate") || ""),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) { setError(result.error || "Không thể lưu hồ sơ."); return; }
      window.location.replace("/submitter");
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally { setBusy(false); }
  }
  return (
    <form className={styles.form} onSubmit={submit}>
      {error && <div className={styles.error} role="alert">{error}</div>}
      <label htmlFor="profile-name">Họ và tên đầy đủ <span>*</span></label>
      <input id="profile-name" name="fullName" defaultValue={initial.fullName} minLength={2} maxLength={150} required disabled={busy} autoComplete="name" />
      <label htmlFor="profile-branch">Chi đoàn <span>*</span></label>
      <select id="profile-branch" name="branchCode" defaultValue={initial.branchCode} required disabled={busy}>
        <option value="" disabled>Chọn Chi đoàn</option>
        {branches.map((b) => <option key={b.code} value={b.code}>{b.code}{b.name && b.name !== b.code ? ` — ${b.name}` : ""}</option>)}
      </select>
      <div className={styles.row}>
        <div><label htmlFor="profile-birth">Ngày sinh <span>*</span></label><input id="profile-birth" name="birthDate" type="date" defaultValue={initial.birthDate} required min="1900-01-01" disabled={busy} /></div>
        <div><label htmlFor="profile-phone">Số điện thoại <span>*</span></label><input id="profile-phone" name="phone" type="tel" defaultValue={initial.phone} placeholder="09xxxxxxxx" required disabled={busy} /></div>
      </div>
      <p className={styles.note}>Thông tin của bạn chỉ dùng để xác minh và xử lý hồ sơ xét khen thưởng. Người nộp hồ sơ phải đủ 18 tuổi.</p>
      <button type="submit" disabled={busy || branches.length === 0}>{busy ? <><Loader2 size={17} className={styles.spin} /> Đang lưu...</> : <>Hoàn tất và vào mục xét <ArrowRight size={18} /></>}</button>
    </form>
  );
}
